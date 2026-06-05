from __future__ import annotations

import os
import threading
import time
from dataclasses import dataclass
from pathlib import Path
from typing import Any, Callable

import data.task_status as task_status
from core.pathing import UniquePathStore
from data.process_manager import ProcessManager
from pywebview_models import PlannedItem


EventCallback = Callable[[dict[str, Any]], None]


def _format_size(size: int) -> str:
    if size >= 1024 * 1024:
        return f"{size / (1024 * 1024):.2f} MB"
    if size >= 1024:
        return f"{size / 1024:.1f} KB"
    return f"{size} B"


def _format_eta(seconds_left: float) -> str:
    if seconds_left <= 1:
        return "Almost done..."

    total = int(seconds_left)
    days = total // 86400
    hours = (total // 3600) % 24
    minutes = (total // 60) % 60
    seconds = total % 60

    parts: list[str] = []
    if days:
        parts.append(f"{days} d")
    if hours:
        parts.append(f"{hours} h")
    if minutes:
        parts.append(f"{minutes} m")
    if seconds:
        parts.append(f"{seconds} s")
    parts.append("left")
    return " ".join(parts)


class _Emitter:
    def __init__(self, callback: Callable[..., None]) -> None:
        self._callback = callback

    def emit(self, *args: Any) -> None:
        self._callback(*args)


@dataclass(slots=True)
class _WorkerSignalsProxy:
    started: _Emitter
    completed: _Emitter
    canceled: _Emitter
    exception: _Emitter


class PywebviewConversionRunner:
    def __init__(self, dispatch_event: EventCallback) -> None:
        self._dispatch_event = dispatch_event
        self._thread: threading.Thread | None = None
        self._state_lock = threading.RLock()
        self._active_run_id: str | None = None
        self._cancel_requested = False

    def is_running(self) -> bool:
        with self._state_lock:
            return self._thread is not None and self._thread.is_alive()

    def start(self, plan: dict[str, Any]) -> None:
        run_id = str(plan.get("runId") or "current")
        with self._state_lock:
            if self._thread is not None and self._thread.is_alive():
                raise RuntimeError("Conversion already in progress")

            self._cancel_requested = False
            self._active_run_id = run_id
            self._thread = threading.Thread(
                target=self._run_plan,
                args=(plan,),
                name=f"xlchemy-run-{run_id}",
                daemon=True,
            )
            self._thread.start()

    def cancel(self) -> None:
        with self._state_lock:
            self._cancel_requested = True

        task_status.cancel()
        try:
            ProcessManager.terminateAll()
        except Exception:
            pass

    def _run_plan(self, plan: dict[str, Any]) -> None:
        try:
            self._run_plan_impl(plan)
        finally:
            with self._state_lock:
                self._thread = None
                self._active_run_id = None

    def _run_plan_impl(self, plan: dict[str, Any]) -> None:
        from PySide6.QtCore import QMutex

        from core.worker import Worker
        from core.ram_optimizer import RAMOptimizer

        run_id = str(plan.get("runId") or "current")
        spec = plan.get("spec")
        if not isinstance(spec, dict):
            raise RuntimeError("ExecutionPlan.spec is required for pywebview conversion")

        output = spec.get("output")
        modify = spec.get("modify")
        settings = spec.get("app")
        if not isinstance(output, dict) or not isinstance(modify, dict) or not isinstance(settings, dict):
            raise RuntimeError("ExecutionPlan.spec payload is invalid")

        items_payload = plan.get("items")
        if not isinstance(items_payload, list) or len(items_payload) == 0:
            return

        items = [PlannedItem.from_payload(item) for item in items_payload if isinstance(item, dict)]
        if not items:
            return

        output = dict(output)
        modify = dict(modify)
        output["threads"] = int(output.get("threads") or os.cpu_count() or 4)
        settings["processing_order"] = str(settings.get("processing_order") or "Original")
        total_items = len(items)

        task_status.reset()
        ProcessManager.clear()
        UniquePathStore.clear()
        RAMOptimizer.setEnabled(False)

        self._dispatch_event({
            "type": "run_started",
            "runId": run_id,
            "totalTasks": total_items,
        })

        thread_count = max(1, int(output["threads"]))
        per_worker_threads, max_workers = self._resolve_threading(
            total_items,
            thread_count,
            output,
            settings,
        )

        params = output | modify
        mutex = QMutex()
        start_time = time.time()
        progress_lock = threading.Lock()
        exception_paths: set[str] = set()
        completed_count = 0

        semaphore = threading.Semaphore(max_workers)
        threads: list[threading.Thread] = []

        def on_worker_started(_worker_index: int) -> None:
            return

        def on_worker_exception(error_id: str, error_msg: str, input_path: str) -> None:
            with progress_lock:
                exception_paths.add(input_path)
            self._dispatch_event({
                "type": "task_failed",
                "runId": run_id,
                "taskId": input_path,
                "inputPath": input_path,
                "errorId": error_id,
                "errorMsg": error_msg,
            })

        def on_worker_completed(
            _worker_index: int,
            skipped: bool,
            file_path: str,
            src_size: int,
            dst_size: int,
        ) -> None:
            nonlocal completed_count
            with progress_lock:
                completed_count += 1
                current_completed = completed_count

            if skipped:
                line1 = f"Skipped {Path(file_path).name}" if file_path else f"Skipped {current_completed} of {total_items}"
            elif file_path and src_size > 0:
                src_text = _format_size(src_size)
                dst_text = _format_size(dst_size)
                pct = ((src_size - dst_size) / src_size) * 100 if src_size else 0
                pct_text = f"-{pct:.0f}%" if pct >= 0 else f"+{abs(pct):.0f}%"
                line1 = f"{file_path} : {src_text} -> {dst_text} ({pct_text})"
            else:
                line1 = f"Converted {current_completed} out of {total_items} images"

            elapsed = time.time() - start_time
            eta = ""
            if current_completed > 0 and current_completed < total_items:
                eta = _format_eta((elapsed / current_completed) * (total_items - current_completed))

            self._dispatch_event({
                "type": "task_progress",
                "runId": run_id,
                "taskId": file_path or str(current_completed),
                "completed": current_completed,
                "total": total_items,
                "line1": line1,
                "line2": eta,
            })

            if not skipped and file_path:
                self._dispatch_event({
                    "type": "task_succeeded",
                    "runId": run_id,
                    "taskId": file_path,
                    "inputPath": file_path,
                    "outputPath": "",
                    "srcSize": src_size,
                    "dstSize": dst_size,
                })

        def on_worker_canceled(_worker_index: int) -> None:
            self.cancel()

        def run_single(index: int, item: PlannedItem, worker_threads: int) -> None:
            worker = Worker(
                index,
                item.abs_path,
                item.anchor_path,
                params,
                settings,
                worker_threads,
                mutex,
            )
            worker.signals = _WorkerSignalsProxy(
                started=_Emitter(on_worker_started),
                completed=_Emitter(on_worker_completed),
                canceled=_Emitter(on_worker_canceled),
                exception=_Emitter(on_worker_exception),
            )
            worker.run()

        for index, item in enumerate(items):
            if task_status.wasCanceled() or self._cancel_requested:
                break

            worker_threads = per_worker_threads[index] if index < len(per_worker_threads) else 1

            def worker_target(i: int = index, planned_item: PlannedItem = item, available_threads: int = worker_threads) -> None:
                with semaphore:
                    if task_status.wasCanceled() or self._cancel_requested:
                        return
                    run_single(i, planned_item, available_threads)

            thread = threading.Thread(
                target=worker_target,
                name=f"xlchemy-worker-{index}",
                daemon=True,
            )
            threads.append(thread)
            thread.start()

        for thread in threads:
            thread.join()

        if task_status.wasCanceled() or self._cancel_requested:
            self._dispatch_event({
                "type": "run_canceled",
                "runId": run_id,
            })
            return

        failed_count = len(exception_paths)
        self._dispatch_event({
            "type": "run_finished",
            "runId": run_id,
            "completedCount": completed_count,
            "failedCount": failed_count,
        })

    def _resolve_threading(
        self,
        item_count: int,
        used_thread_count: int,
        output: dict[str, Any],
        settings: dict[str, Any],
    ) -> tuple[list[int], int]:
        from core.ram_optimizer import RAMOptimizer

        file_format = str(output.get("format") or "")
        avif_encoder = str(settings.get("avif_encoder") or "")
        effort = int(output.get("effort") or 7)
        jxl_modular = bool(output.get("jxl_modular"))
        lossless = bool(output.get("lossless"))
        intelligent_effort = bool(output.get("intelligent_effort"))

        threads = max(1, used_thread_count)
        mode = str(settings.get("ram_optimizer") or "Disabled")

        if RAMOptimizer.isNecessary(
            file_format,
            avif_encoder,
            effort,
            jxl_modular,
            lossless,
            intelligent_effort,
        ):
            if mode == "Static":
                return [threads] * item_count, 1

            if mode == "Dynamic":
                RAMOptimizer.setOptimizationRulesStr(str(settings.get("ram_optimizer_rules") or ""))
                if RAMOptimizer.applicableRuleExists(file_format, avif_encoder):
                    RAMOptimizer.setEnabled(True)
                    RAMOptimizer.setUsedThreadCount(threads)
                    return [threads] * item_count, 1

        if item_count >= threads:
            return [1] * item_count, threads

        base_threads = threads // item_count
        extra_threads = threads % item_count
        per_worker = [base_threads] * item_count
        for index in range(extra_threads):
            per_worker[index] += 1

        return per_worker, item_count
