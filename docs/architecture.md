# Xlchemy 前端主导架构设计文档

## 1. 架构愿景

Xlchemy 采用**前端主导业务逻辑、后端仅执行数据处理**的可替换中间层架构。该设计的核心目标是：

- **前端**负责领域模型、任务规划、参数归一化、规则判断、队列/泳道/卡片状态、预估与结果解释
- **后端**负责文件系统访问、目录扫描、进程执行、原生对话框、长期任务运行、进度事件转发
- **Wails 3** 只是当前的执行适配器，不再是业务逻辑的归属地

这样后面切到 Tauri、Electron、Python，甚至把 Go 只保留为一个 encoder runner，都只需要替换执行适配层，而不需要重做前端业务系统。

## 2. 分层架构

```
┌─────────────────────────────────────────────────────────────┐
│                        UI 层 (Svelte 5)                      │
│  app.svelte / Lane / Card / HeaderBar / Dialogs...          │
├─────────────────────────────────────────────────────────────┤
│                      State 管理层                            │
│  AppState (app.svelte.ts) / CanvasState / DragState         │
├─────────────────────────────────────────────────────────────┤
│                    Orchestrator 层                           │
│  conversionOrchestrator.ts / fileDiscoveryOrchestrator.ts   │
├─────────────────────────────────────────────────────────────┤
│                      Domain 层                               │
│  models.ts / normalizers.ts / validators.ts / defaults.ts   │
├─────────────────────────────────────────────────────────────┤
│                 Executor Adapter 层                          │
│  BackendExecutor (interface)                                 │
│  ├── WailsExecutor  (当前实现)                               │
│  ├── ElectronExecutor (预留壳)                               │
│  └── TauriExecutor  (预留壳)                                 │
├─────────────────────────────────────────────────────────────┤
│                    Go 后端 (Wails 3)                         │
│  app.go - 文件系统、进程执行、事件转发                         │
└─────────────────────────────────────────────────────────────┘
```

### 2.1 Domain 层

纯前端、纯数据、与宿主无关。

- **职责**：定义统一的任务模型、文件模型、输出/修改/应用设置模型、lane/card layout 模型；负责参数默认值、归一化、校验、派生字段、格式能力判断、策略选择
- **关键文件**：
  - `frontend/src/domain/models.ts` - 所有领域接口定义
  - `frontend/src/domain/defaults.ts` - 默认值
  - `frontend/src/domain/normalizers.ts` - 参数归一化
  - `frontend/src/domain/validators.ts` - 校验逻辑
  - `frontend/src/domain/capabilities.ts` - 格式能力判断

### 2.2 Orchestrator 层

纯前端、面向业务流程。

- **职责**：负责"开始转换前要做什么、过程中如何更新状态、完成后如何解释结果"；把 UI 动作翻译成执行命令，把 executor 事件翻译回前端领域状态
- **关键文件**：
  - `frontend/src/orchestrator/conversionOrchestrator.ts` - 构建 ExecutionPlan
  - `frontend/src/orchestrator/fileDiscoveryOrchestrator.ts` - 文件发现、排序、过滤、去重

### 2.3 Executor Adapter 层

前端接口 + 多宿主实现。

- **职责**：统一定义 `BackendExecutor` 接口；当前实现是 `WailsExecutor`；未来可以加 `TauriExecutor`、`ElectronExecutor`
- **关键文件**：
  - `frontend/src/executor/types.ts` - `BackendExecutor` 接口定义
  - `frontend/src/executor/wailsExecutor.ts` - Wails 3 实现
  - `frontend/src/executor/electronExecutor.ts` - Electron 预留壳
  - `frontend/src/executor/tauriExecutor.ts` - Tauri 预留壳
  - `frontend/src/executor/index.ts` - Executor 工厂

### 2.4 Go 后端

能力导向接口，前端编排、后端执行。

- **文件系统能力**：`pickFiles()`、`pickDirectory()`、`statFiles()`、`scanDirectory()`
- **执行能力**：`runConversionPlan(plan)`、`cancelRun(runId)`
- **宿主持久化能力**：`loadAppState()`、`saveAppState(payload)`
- **宿主事件能力**：`subscribeRunEvents(runId)`

后端不再接收"前端所有业务设置 JSON 然后自己决定怎么跑"，而是接收一个前端已经编排好的**执行计划（ExecutionPlan）**。

## 3. 核心数据流

### 3.1 文件添加流程

```
用户操作 (点击"Add Files" / 拖入文件 / 选择文件夹)
    ↓
AppState.handleAddFiles() / handleDrop() / handleAddFolder()
    ↓
executor.pickFiles() / executor.statFiles() / executor.scanDirectory()
    ↓
Go backend (AddFiles / ScanDirectory)
    ↓
返回 FileItem[] JSON
    ↓
fileDiscoveryOrchestrator.mergeFileItems() / sortItems() / filterItems()
    ↓
AppState.fileItems 更新
    ↓
UI 重新渲染
```

### 3.2 转换执行流程

```
用户点击 "Convert"
    ↓
AppState.startConversion()
    ↓
conversionOrchestrator.buildExecutionPlan()
    ↓
生成 ExecutionPlan { runId, items, tasks[], policies, toolchain }
    ↓
executor.runConversionPlan(plan)
    ↓
Go backend RunConversionPlan(planJSON, threadCount)
    ↓
Go 执行 tasks，emit 事件: conversion:started/progress/exception/finished/canceled
    ↓
WailsExecutor.subscribeEvents 接收事件
    ↓
翻译为 DomainEvent: run_started/task_progress/task_failed/run_finished/run_canceled
    ↓
initConversionEvents() 分发到 AppState
    ↓
UI 更新进度、异常、完成状态
```

### 3.3 文件拖入事件流 (Wails 框架实现)

Wails 3 的文件拖入由框架在 **Go 后端**统一处理：

```
用户从 OS 拖入文件到应用窗口
    ↓
Wails WebView 拦截 (EnableFileDrop: true)
    ↓
Go backend: WindowFilesDropped 事件
    ↓
main.go 转发: App.Event.Emit("files-dropped", {files: [...]})
    ↓
前端 Events.On('files-dropped') → wailsExecutor.subscribeEvents
    ↓
翻译为 DomainEvent {type: 'files_dropped', paths: [...]}
    ↓
appState.subscribeFileDrops() 接收
    ↓
executor.statFiles(paths) → Go AddFiles
    ↓
addFileItems(result) → 前端状态更新
```

**注意**：前端不再依赖 HTML5 `ondrop` + `file.path` 获取路径。`app.svelte` 中的 `ondrop` 处理仅作为非 Wails 环境的 fallback 保留。

## 4. 事件模型

### 4.1 宿主无关事件 (DomainEvent)

前端 executor 层统一翻译成宿主无关事件：

| 事件类型 | 说明 | 来源 |
|---------|------|------|
| `run_started` | 转换开始 | Wails `conversion:started` |
| `task_progress` | 任务进度更新 | Wails `conversion:progress` |
| `task_succeeded` | 单个任务成功 | (预留) |
| `task_failed` | 单个任务失败 | Wails `conversion:exception` |
| `run_finished` | 转换完成 | Wails `conversion:finished` |
| `run_canceled` | 转换取消 | Wails `conversion:canceled` |
| `files_dropped` | 文件拖入 | Wails `files-dropped` |

### 4.2 事件订阅机制

```typescript
// executor/types.ts
export interface BackendExecutor {
  subscribeEvents(handler: (event: DomainEvent) => void): Unsubscribe;
}
```

每个 executor 实现负责将宿主特定事件翻译为 `DomainEvent`。例如 `WailsExecutor`：

```typescript
Events.On('conversion:progress', (wailsEvent: any) => {
  const data = wailsEvent?.data || wailsEvent;
  handler({
    type: 'task_progress',
    runId: 'current',
    taskId: '',
    completed: data.completed || 0,
    total: data.total || 0,
    line1: data.line1 || '',
    line2: data.line2 || '',
  });
});
```

## 5. 执行计划 (ExecutionPlan)

与宿主无关的计划结构，由前端生成：

```typescript
interface ExecutionPlan {
  runId: string;
  items: FileItem[];
  tasks: ExecutionTask[];
  policies: ResultPolicy;
  toolchain: ToolchainSelection;
}

interface ExecutionTask {
  id: string;
  inputPath: string;
  outputPath: string;
  command: string;
  args: string[];
  env?: Record<string, string>;
  stepType: 'decode' | 'downscale' | 'encode' | 'metadata' | 'cleanup';
}
```

前端负责把业务设置转换成规范化过的前端领域模型 `ConversionSpec`，再编排成 `ExecutionPlan`。例如：

- "结果更大时保留原文件" → `policies.keepIfLarger`
- "JXL 自动无损 JPEG 转码" → `args.push('--lossless_jpeg=1')`
- "按路径排序/随机排序" → 前端排序后生成 `items` 数组
- "ExifTool 元数据策略" → 生成 `stepType: 'metadata'` 任务

## 6. 设置持久化

前端定义一个更高层的 `AppStateSnapshot`：

```typescript
interface AppStateSnapshot {
  domain: ConversionSpec;
  layout: {
    laneOrder: string[];
    laneLabels: Record<string, string>;
    laneWidths: Record<string, number>;
    cardLayout: Record<string, string[]>;
    singleLaneMode: boolean;
    activeLaneId: string;
    progressCardConfig: ProgressCardConfig;
  };
  presets: Preset[];
  theme: { name: string; mode: 'light' | 'dark' | 'system'; customThemes: CustomThemeConfig[] };
  lang: string;
  executor: string;
}
```

后端只负责存、取、可选加密/平台路径处理。这样以后切执行后端时，设置文件结构不必跟着 Go 变化。

## 7. 迁移指南

### 7.1 从旧架构迁移到新架构

旧架构中，Go 后端暴露业务导向接口：`AddFiles`、`ScanDirectory`、`StartConversion`、`CancelConversion`、`SaveSettings`、`GetSettings`。

新架构中：

1. **前端建立 `domain/` 与 `executor/` 目录**，不改现有 UI 行为，只把 `backend.ts` 包成 `wailsExecutor`
2. **把 appState 中的业务判断抽到 `domain/` + `orchestrator/`**，让状态层只做状态，不做复杂策略
3. **前端生成 `ExecutionPlan`**，仍临时提交给 Go 执行
4. **Go 从"解释设置并决定流程"瘦身为"按计划执行"**，保留进程/文件系统/原生对话框/事件桥接
5. **为未来宿主预留第二实现**，例如空壳 `electronExecutor.ts` / `tauriExecutor.ts`，验证接口边界已经稳定

### 7.2 添加新的 Executor 实现

1. 在 `frontend/src/executor/` 下新建 `xxxExecutor.ts`
2. 实现 `BackendExecutor` 接口
3. 在 `frontend/src/executor/index.ts` 的 `createExecutor()` 中注册
4. 无需修改 domain / orchestrator / UI 层

### 7.3 后端接口改造清单

| 旧接口 | 新接口 | 说明 |
|--------|--------|------|
| `AddFiles(paths)` | `statFiles(paths)` | 返回文件元数据 |
| `ScanDirectory(dir)` | `scanDirectory(dir)` | 递归扫描目录 |
| `StartConversion(...)` | `runConversionPlan(planJSON, threads)` | 接收前端编排的计划 |
| `CancelConversion()` | `cancelRun(runId)` | 取消运行 |
| `SaveSettings(json)` | `saveAppState(snapshotJSON)` | 保存前端状态快照 |
| `GetSettings()` | `loadAppState()` | 加载前端状态快照 |

## 8. 关键文件索引

### 前端

| 文件 | 职责 |
|------|------|
| `frontend/src/domain/models.ts` | 领域模型定义 |
| `frontend/src/domain/normalizers.ts` | 参数归一化 |
| `frontend/src/domain/validators.ts` | 校验逻辑 |
| `frontend/src/orchestrator/conversionOrchestrator.ts` | 执行计划生成 |
| `frontend/src/orchestrator/fileDiscoveryOrchestrator.ts` | 文件处理逻辑 |
| `frontend/src/executor/types.ts` | Executor 接口 |
| `frontend/src/executor/wailsExecutor.ts` | Wails 实现 |
| `frontend/src/executor/index.ts` | Executor 工厂 |
| `frontend/src/state/app.svelte.ts` | 全局状态管理 |
| `frontend/src/state/conversion.svelte.ts` | 转换事件处理 |
| `frontend/src/app.svelte` | 根组件 |

### 后端

| 文件 | 职责 |
|------|------|
| `app.go` | Wails 服务接口 |
| `main.go` | 应用入口、窗口配置、文件拖入事件转发 |
| `controller.go` | 任务执行引擎 |

## 9. 验证清单

- [x] 前端通过 `pnpm check` 与 `pnpm build`，新分层不破坏 Svelte 5 工程
- [x] 用当前 Wails 3 executor 跑通完整流程：选文件 → 扫目录 → 生成计划 → 开始转换 → 接收事件 → 取消/完成
- [x] 验证导入导出设置后，`AppStateSnapshot` 与 lane/card layout 能完整恢复
- [x] 验证只替换 executor 实现时，前端 domain/orchestrator/UI 不需要跟着重写
- [x] 对比现有 Go：确认业务判断已迁到前端，而 Go 只剩宿主/执行职责
- [x] 文件拖入功能通过 Wails 框架事件正确工作
