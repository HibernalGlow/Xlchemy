"""Decisions the file list needs, kept free of Qt so any front end can reuse them."""

from data.run_records import OUTCOME_CANCELED, OUTCOME_FAILED, OUTCOME_OK, OUTCOME_SKIPPED

# A row is "done" once the worker reported on it, whatever the verdict.
DONE_OUTCOMES = (OUTCOME_OK, OUTCOME_SKIPPED, OUTCOME_FAILED)

SELECT_NONE = "none"
SELECT_PARTIAL = "partial"
SELECT_ALL = "all"


def reported_paths(snapshot, outcomes=DONE_OUTCOMES) -> list:
    """Paths that already have a verdict, in list order, de-duplicated."""
    wanted = set(outcomes)
    seen = set()
    paths = []
    for record in snapshot.records:
        if record.outcome in wanted and record.path and record.path not in seen:
            seen.add(record.path)
            paths.append(record.path)
    return paths


def canceled_paths(snapshot) -> list:
    return reported_paths(snapshot, outcomes=(OUTCOME_CANCELED,))


def selection_state(selected_count: int, total_count: int) -> str:
    if total_count <= 0 or selected_count <= 0:
        return SELECT_NONE
    if selected_count >= total_count:
        return SELECT_ALL
    return SELECT_PARTIAL
