# Context

Xlchemy 现有前端已经从 React 时代迁移到一套可运行的 Svelte 5 + runes + TailwindCSS 3 + Wails 3 结构，但当前业务边界仍然过度依赖 Go 后端：前端主要负责 UI 和局部状态，后端同时承担了参数校验、输入扫描、任务编排、转换流程控制、事件生成与结果判断。这会让后续把执行层从 Wails/Go 切到 Tauri、Electron、Python worker，甚至远程服务时，迁移成本非常高。

这次架构调整的目标不是单纯“继续重写 UI”，而是把系统改造成一个**前端主导业务逻辑、后端只负责执行与宿主能力**的通用中间层：

- 前端负责：领域模型、任务规划、参数归一化、规则判断、队列/泳道/卡片状态、预估与结果解释。
- 后端负责：文件系统访问、目录扫描、进程执行、原生对话框、长期任务运行、进度事件转发。
- Wails 3 只是当前的执行适配器，不再是业务逻辑的归属地。

这样后面切到 Tauri、Electron、Python，甚至把 Go 只保留为一个 encoder runner，都只需要替换执行适配层，而不需要重做前端业务系统。

# Recommended approach

## 1. 明确分三层：Domain / Orchestrator / Executor Adapter

在前端建立稳定的三层结构：

1. **Domain 层**：纯前端、纯数据、与宿主无关。
   - 定义统一的任务模型、文件模型、输出/修改/应用设置模型、lane/card layout 模型。
   - 负责参数默认值、归一化、校验、派生字段、格式能力判断、策略选择。
2. **Orchestrator 层**：纯前端、面向业务流程。
   - 负责“开始转换前要做什么、过程中如何更新状态、完成后如何解释结果”。
   - 把 UI 动作翻译成执行命令，把 executor 事件翻译回前端领域状态。
3. **Executor Adapter 层**：前端接口 + 多宿主实现。
   - 统一定义 `BackendExecutor` 接口。
   - 当前实现是 `wailsExecutor`；未来可以加 `tauriExecutor`、`electronExecutor`、`pythonExecutor`。

建议新增或重组这些前端模块：

- [Xlchemy/frontend/src/domain/](Xlchemy/frontend/src/domain/)
  - `models.ts`
  - `defaults.ts`
  - `normalizers.ts`
  - `validators.ts`
  - `capabilities.ts`
- [Xlchemy/frontend/src/orchestrator/](Xlchemy/frontend/src/orchestrator/)
  - `conversionOrchestrator.ts`
  - `fileDiscoveryOrchestrator.ts`
  - `settingsOrchestrator.ts`
- [Xlchemy/frontend/src/executor/](Xlchemy/frontend/src/executor/)
  - `types.ts`
  - `wailsExecutor.ts`
  - `index.ts`

现有 [Xlchemy/frontend/src/backend.ts](Xlchemy/frontend/src/backend.ts) 作为过渡层保留，但逐步收敛成 `wailsExecutor.ts` 的宿主实现，而不是直接被整个 appState 任意调用。

## 2. 把 Go 暴露面压缩成“能力调用”，不再暴露业务流程

当前 [Xlchemy/app.go](Xlchemy/app.go) 的接口是业务导向的：

- `AddFiles`
- `ScanDirectory`
- `StartConversion`
- `CancelConversion`
- `SaveSettings`
- `GetSettings`

建议改造成**能力导向**接口，前端编排、后端执行：

- 文件系统能力：
  - `pickFiles()`
  - `pickDirectory()`
  - `statFiles()`
  - `scanDirectory()`
- 执行能力：
  - `runConversionPlan(plan)`
  - `cancelRun(runId)`
- 宿主持久化能力：
  - `loadAppState()`
  - `saveAppState(payload)`
- 宿主事件能力：
  - `subscribeRunEvents(runId)`

也就是说，后端不再接收“前端所有业务设置 JSON 然后自己决定怎么跑”，而是接收一个前端已经编排好的**执行计划（ExecutionPlan）**。

## 3. 在前端引入统一执行计划（ExecutionPlan）

建议新增一个与宿主无关的计划结构，由前端生成：

- `runId`
- `items: FileTask[]`
- `steps: ExecutionStep[]`
- `toolchain: ToolchainSelection`
- `policies: ResultPolicy`
- `progressModel`

前端负责把现有：

- [Xlchemy/types.go](Xlchemy/types.go)
- [Xlchemy/frontend/src/state/app.svelte.ts](Xlchemy/frontend/src/state/app.svelte.ts)

里的 `OutputSettings` / `ModifySettings` / `AppSettings` 转换成：

- 规范化过的前端领域模型 `ConversionSpec`
- 再编排成 `ExecutionPlan`

例如：

- “结果更大时保留原文件”
- “JXL 自动无损 JPEG 转码”
- “按路径排序/随机排序”
- “ExifTool 元数据策略”

这些都应该先在前端变成**明确的决策结果**，后端只执行，不再自己解释高层策略。

## 4. 事件模型也统一成前端领域事件

当前 Wails 事件像：

- `conversion:started`
- `conversion:progress`
- `conversion:exception`
- `conversion:finished`
- `conversion:canceled`

建议前端 executor 层统一翻译成宿主无关事件：

- `run_started`
- `task_progress`
- `task_succeeded`
- `task_failed`
- `run_finished`
- `run_canceled`

这样未来 Tauri/Electron/Python backend 只要实现同一个事件接口，前端 orchestrator 和状态层都不需要改。

建议把事件翻译集中在：

- [Xlchemy/frontend/src/executor/wailsExecutor.ts](Xlchemy/frontend/src/executor/wailsExecutor.ts)
- [Xlchemy/frontend/src/state/conversion.svelte.ts](Xlchemy/frontend/src/state/conversion.svelte.ts)

## 5. 设置持久化改成“前端状态快照”，不是 Go 专属结构

当前 [Xlchemy/app.go](Xlchemy/app.go) 和 [Xlchemy/config.go](Xlchemy/config.go) 保存的是 Go struct 视角。

建议前端定义一个更高层的 `AppStateSnapshot`：

- domain settings
- lane/card layout
- presets
- theme/lang
- executor preferences

后端只负责：

- 存
- 取
- 可选加密/平台路径处理

这样以后切执行后端时，设置文件结构不必跟着 Go 变化。

## 6. 迁移顺序：先包裹、再内聚、最后瘦身 Go

建议分 5 步迁移：

1. **前端建立 `domain/` 与 `executor/` 目录**，不改现有 UI 行为，只把 `backend.ts` 包成 `wailsExecutor`。
2. **把 appState 中的业务判断抽到 `domain/` + `orchestrator/`**，让状态层只做状态，不做复杂策略。
3. **前端生成 `ExecutionPlan`**，仍临时提交给 Go 执行。
4. **Go 从“解释设置并决定流程”瘦身为“按计划执行”**，保留进程/文件系统/原生对话框/事件桥接。
5. **为未来宿主预留第二实现**，例如空壳 `electronExecutor.ts` / `tauriExecutor.ts`，验证接口边界已经稳定。

## 7. 这次优先保留的 Go 部分

不建议把以下能力迁到前端：

- 原生文件选择器 / 目录选择器
- 文件系统深扫描和大目录遍历
- encoder / CLI / ExifTool / ImageMagick / avifenc / cjxl 进程执行
- 取消令牌和长任务生命周期
- 宿主级配置路径解析

这些属于“执行层”或“宿主能力”，应该继续留在后端适配器实现中。

## 8. 这次优先迁到前端的逻辑

优先把这些从 Go 或旧 Python 思路迁到前端：

- 默认值与参数归一化
- 格式切换后可见/可用选项判断
- 任务排序、过滤、去重、泳道布局与卡片布局
- 结果保留策略的高层判断
- lane/card/preset/layout 的编排
- 执行计划生成
- 进度卡展示字段、摘要解释、任务 UI 状态机

# Critical files

优先改动前端：

- [Xlchemy/frontend/src/backend.ts](Xlchemy/frontend/src/backend.ts)
- [Xlchemy/frontend/src/state/app.svelte.ts](Xlchemy/frontend/src/state/app.svelte.ts)
- [Xlchemy/frontend/src/state/conversion.svelte.ts](Xlchemy/frontend/src/state/conversion.svelte.ts)
- [Xlchemy/frontend/src/app.svelte](Xlchemy/frontend/src/app.svelte)
- [Xlchemy/frontend/src/cards/definitions.ts](Xlchemy/frontend/src/cards/definitions.ts)
- [Xlchemy/frontend/src/cards/](Xlchemy/frontend/src/cards/)
- [Xlchemy/frontend/src/domain/](Xlchemy/frontend/src/domain/)
- [Xlchemy/frontend/src/orchestrator/](Xlchemy/frontend/src/orchestrator/)
- [Xlchemy/frontend/src/executor/](Xlchemy/frontend/src/executor/)

优先瘦身后端：

- [Xlchemy/app.go](Xlchemy/app.go)
- [Xlchemy/types.go](Xlchemy/types.go)
- [Xlchemy/config.go](Xlchemy/config.go)
- [Xlchemy/controller.go](Xlchemy/controller.go)

优先复用：

- [Xlchemy/frontend/src/utils/themes.ts](Xlchemy/frontend/src/utils/themes.ts)
- [Xlchemy/frontend/src/components/ui/](Xlchemy/frontend/src/components/ui/)
- [Xlchemy/frontend/src/input.css](Xlchemy/frontend/src/input.css)
- [Xlchemy/frontend/src/backend.ts](Xlchemy/frontend/src/backend.ts) 作为过渡入口

# Verification

1. 前端先通过 `pnpm check` 与 `pnpm build`，确保新分层不破坏 Svelte 5 工程。
2. 用当前 Wails 3 executor 跑通一轮完整流程：
   - 选文件
   - 扫目录
   - 生成计划
   - 开始转换
   - 接收事件
   - 取消 / 完成
3. 验证导入导出设置后，`AppStateSnapshot` 与 lane/card layout 能完整恢复。
4. 验证只替换 executor 实现时，前端 domain/orchestrator/UI 不需要跟着重写。
5. 对比现有 Go：确认业务判断已迁到前端，而 Go 只剩宿主/执行职责。
