# Xlchemy 中间层（前端 Orchestrator + Domain）功能清单

> 本文档详细列出前端中间层（Orchestrator + Domain）**已经实现**和**可以/应该迁移**的功能。基于对现有前端代码和 Python 后端（`core/`、`data/`）的完整分析。

---

## 1. 已在前端中间层实现的功能

### 1.1 Domain 层 — 纯数据、纯逻辑、与宿主无关

| 功能 | 文件 | 说明 |
|------|------|------|
| **领域模型定义** | `domain/models.ts` | 定义 `FileItem`、`OutputSettings`、`ModifySettings`、`AppSettings`、`ExecutionPlan`、`ExecutionTask`、`ResultPolicy`、`ToolchainSelection`、`DomainEvent` 等所有核心数据结构 |
| **默认值管理** | `domain/defaults.ts` | 提供所有设置的默认值，包括输出设置、修改设置、应用设置、进度卡片配置、Lane/Card 布局默认结构 |
| **参数归一化** | `domain/normalizers.ts` | 将原始/部分设置对象归一化为完整的领域模型；处理数值裁剪（clamp）、元数据模式映射、数组/对象缺省填充 |
| **校验逻辑** | `domain/validators.ts` | `validateConversionReady`：检查文件列表非空、格式已选、Smallest Format Pool 非空、降采样参数合法、自定义输出目录合法等 |
| **格式能力判断** | `domain/capabilities.ts` | `FORMAT_CAPABILITIES` 表：定义每种格式支持的无损/质量/effort/色度子采样/元数据能力；`getVisibleSettings` 动态计算 UI 应显示的设置项 |
| **输入格式判断** | `domain/validators.ts` | `isJPEGAlias`、`isAllowedInput`、`getOutputExtension` |

### 1.2 Orchestrator 层 — 业务流程编排

| 功能 | 文件 | 说明 |
|------|------|------|
| **执行计划生成** | `orchestrator/conversionOrchestrator.ts` | `buildExecutionPlan`：将前端领域状态（`items` + `output` + `modify` + `app` + `toolchain`）编排为后端可执行的 `ExecutionPlan`，包含完整的任务列表、策略、工具链选择 |
| **多格式编码任务构建** | `orchestrator/conversionOrchestrator.ts` | 支持 JPEG XL、AVIF、JPEG、WebP、PNG、Lossless JPEG Transcoding、JPEG Reconstruction 的编码任务生成 |
| **降采样任务构建** | `orchestrator/conversionOrchestrator.ts` | `buildDownscaleTask`：支持 Resolution、Percent、Shortest Side、Longest Side、Megapixels、File Size 六种模式的降采样参数生成 |
| **元数据任务构建** | `orchestrator/conversionOrchestrator.ts` | `buildMetadataTask`：根据 ExifTool 模式生成元数据复制/清除任务，支持 `$src`/`$dst` 变量替换 |
| **结果策略构建** | `orchestrator/conversionOrchestrator.ts` | `ResultPolicy`：整合 `keepIfLarger`、`copyIfLarger`、`deleteOriginal`、`keepTimestamps`、`ifFileExists` 等策略 |
| **文件发现与处理** | `orchestrator/fileDiscoveryOrchestrator.ts` | `sortItems`：支持 Path Ascending/Descending、Size Ascending/Descending、Sequential、Random 排序；`filterItems`：按排除格式过滤；`dedupeItems`：按绝对路径去重；`mergeFileItems`：合并新文件到现有列表 |

### 1.3 Executor Adapter 层 — 宿主适配

| 功能 | 文件 | 说明 |
|------|------|------|
| **Wails 执行器** | `executor/wailsExecutor.ts` | 实现 `BackendExecutor` 接口：文件选择、目录选择、文件元数据获取、目录扫描、执行计划提交、转换取消、设置加载/保存、预设管理、事件订阅（转换进度/异常/完成/取消/文件拖入） |
| **事件翻译** | `executor/wailsExecutor.ts` | 将 Wails 宿主事件（`conversion:started/progress/exception/finished/canceled`、`files-dropped`）翻译为宿主无关的 `DomainEvent` |
| **线程数推导** | `executor/wailsExecutor.ts` | `deriveThreadCount`：从 `ExecutionPlan` 的任务参数中自动推导线程数 |

### 1.4 State 管理层 — 全局状态与业务动作

| 功能 | 文件 | 说明 |
|------|------|------|
| **全局状态管理** | `state/app.svelte.ts` | `AppState`：管理 Lane/Card 布局、文件列表、所有领域设置、转换状态、异常列表、持久化到 `localStorage` |
| **文件添加** | `state/app.svelte.ts` | `handleAddFiles`、`handleAddFolder`、`handleDrop`、`handleDroppedPaths`：通过 executor 获取文件并合并到状态 |
| **转换启动** | `state/app.svelte.ts` | `startConversion`：调用 `buildExecutionPlan` 生成计划，提交给 executor |
| **设置导入/导出** | `state/app.svelte.ts` | `handleImportSettings`、`handleExportSettings`、`buildSnapshot`：完整的 `AppStateSnapshot` 序列化/反序列化 |
| **布局管理** | `state/app.svelte.ts` | Lane 增删改、Card 拖拽重排、Lane 折叠/宽度调整、单 Lane 模式、进度卡片配置 |
| **主题/语言** | `state/app.svelte.ts` | 主题切换、系统主题监听、语言切换 |
| **文件拖入订阅** | `state/app.svelte.ts` | `subscribeFileDrops`：接收 `files_dropped` 事件并处理 |

---

## 2. Python 后端现有功能分析

### 2.1 必须保留在后端的功能（宿主/系统能力）

以下功能**无法迁移到前端**，必须由后端（Go/Rust/Python）提供：

| 功能 | Python 文件 | 说明 |
|------|-------------|------|
| **进程执行** | `core/process.py` | `subprocess.Popen/run`：实际调用编码器二进制（cjxl、avifenc、magick 等） |
| **文件系统扫描** | `core/utils.py` | `scanDir`/`scanDirFast`：递归目录扫描 |
| **文件元数据获取** | `app.go` (Go) | `statFiles`/`AddFiles`：获取文件大小、扩展名、目录等信息 |
| **原生对话框** | `executor/wailsExecutor.ts` | Wails `Dialogs.OpenFile`：文件/目录选择器 |
| **事件转发** | `main.go` (Go) | Wails `WindowFilesDropped` → `files-dropped` 事件转发 |
| **设置持久化** | `app.go` (Go) | `saveAppState`/`loadAppState`：宿主级别的设置存储 |
| **进程管理** | `data/process_manager.py` | 跟踪和管理子进程，支持取消时终止 |
| **磁盘空间检查** | `core/utils.py` | `getFreeSpaceLeft`：检查目标目录剩余空间 |
| **临时文件生成** | `core/pathing.py` | `getUniqueTmpFilePath`：线程安全的临时文件路径生成 |
| **唯一文件名生成** | `core/pathing.py` | `getUniqueFilePath`：处理重名冲突（`name (1).ext`） |
| **时间戳读写** | `core/timestamps.py` | `getTimestamps`/`applyTimestamps`：跨平台（Windows/Linux/macOS）精确时间戳保留 |
| **文件删除（到回收站）** | `worker.py` | `send2trash`：跨平台安全删除到回收站 |
| **BLAKE2b 校验** | `core/utils.py` | `b2sum`：文件校验和计算 |
| **ExifTool 可用性检查** | `core/metadata.py` | `isExifToolAvailable`：平台特定的 ExifTool 检测 |
| **ExifTool 执行（Windows argfile）** | `core/metadata.py` | `_runExifTool`：Windows 下使用 argfile 绕过 UTF-8 路径限制 |

### 2.2 可以/应该迁移到前端中间层的功能

以下功能**当前在 Python 后端**，但**完全可以由前端中间层承担**，从而进一步瘦身后端：

#### A. 执行计划构建相关（已由前端承担）

Python `core/worker.py` 中的大量参数构建逻辑，前端 `conversionOrchestrator.ts` 已完全覆盖：

| Python 功能 | 前端对应 | 状态 |
|-------------|----------|------|
| `Worker.convert()` 中各格式的参数构建 | `buildJXLTask`、`buildAVIFTask`、`buildJPEGTask`、`buildWebPTask`、`buildPNGTask` | 已完成 |
| `Worker.setupConversion()` 中的输出目录计算 | `buildOutputDir` | 已完成 |
| `Worker.runChecks()` 中的冲突检查 | 可迁移（见下方） | 待评估 |

#### B. 冲突检查（`core/conflicts.py`）

| 功能 | 说明 | 迁移建议 |
|------|------|----------|
| **动画格式冲突检查** | GIF/APNG → 仅支持特定格式；降采样不支持动画 | **可迁移到前端**：在 `buildExecutionPlan` 中增加 `validateItemCompatibility(item, output, modify)`，提前拦截不支持的转换组合 |
| **多页图像检查** | TIF/TIFF/WebP 多页检测 | **保留在后端**：需要实际读取文件页数（`getImageCount` 依赖 ImageMagick） |

#### C. RAM 优化器（`core/ram_optimizer.py`）

| 功能 | 说明 | 迁移建议 |
|------|------|----------|
| **规则解析** | `parseOptimizationRules`：解析用户输入的规则字符串 | **可迁移到前端**：作为 Domain 层的校验/归一化功能 |
| **必要性判断** | `isNecessary`：根据格式/编码器/effort 判断是否需要优化 | **可迁移到前端**：前端已掌握所有相关参数 |
| **规则应用** | `_getMaxWorkerCount`：根据分辨率计算最大并发数 | **可迁移到前端**：前端可在生成 `ExecutionPlan` 时计算每任务的 `threads` 参数 |
| **QThreadPool 设置** | `setMaxThreadCount` | **保留在后端**：线程池管理是宿主能力 |

#### D. 代理/解码器选择（`core/proxy.py`、`core/convert.py`）

| 功能 | 说明 | 迁移建议 |
|------|------|----------|
| **代理必要性判断** | `isProxyNeeded`：判断源格式是否需要解码为 PNG 代理 | **可迁移到前端**：前端已掌握格式和输入扩展名信息，可在 `ExecutionPlan` 中增加 `proxy` 步骤 |
| **解码器选择** | `getDecoder`：根据扩展名选择解码器路径 | **可迁移到前端**：前端 `ToolchainSelection` 已包含所有解码器路径 |
| **解码器参数** | `getDecoderArgs`：avifdec/djxl 的线程参数 | **已在前端**：`buildPNGTask` 中已处理 |

#### E. 降采样逻辑（`core/downscale.py`）

| 功能 | 说明 | 迁移建议 |
|------|------|----------|
| **手动模式参数构建** | Resolution/Percent/Shortest/Longest/Megapixels 的 ImageMagick 参数 | **已在前端**：`buildDownscaleTask` 已完整实现 |
| **File Size 模式** | 通过采样+线性回归逼近目标文件大小 | **可保留在后端**：需要实际执行编码并测量文件大小，属于"执行时自适应"逻辑 |
| **Intelligent Effort** | JXL e7/e9 对比选择更小文件 | **可保留在后端**：需要实际执行两次编码并比较大小 |

#### F. 结果处理策略（`core/worker.py` 中的 `finishConversion` / `postConversionRoutines`）

| 功能 | 说明 | 迁移建议 |
|------|------|----------|
| **Keep If Larger** | 结果比原文件大时删除结果 | **可迁移到前端**：前端可在 `ResultPolicy` 中标记，但文件大小比较需要后端执行后反馈 |
| **Copy If Larger** | 结果比原文件大时复制原文件 | **可迁移到前端**：同上，策略由前端定，执行由后端做 |
| **Delete Original** | 转换成功后删除原文件（到回收站/永久） | **保留在后端**：文件删除是系统操作 |
| **If File Exists 策略** | Replace/Rename/Skip | **可迁移到前端**：前端可在 `ExecutionPlan` 中明确指定每文件的处理方式 |
| **时间戳应用** | 转换后将原文件时间戳应用到结果 | **保留在后端**：需要系统调用 |

#### G. Lossless JPEG 相关（`core/lossless_jpeg.py`）

| 功能 | 说明 | 迁移建议 |
|------|------|----------|
| **无损转码参数** | `transcodeJPEGtoJPEGXL` 的参数构建 | **已在前端**：`buildLosslessJXLTask` 已实现 |
| **Normalize 参数** | `normalizeJPEG` 的参数构建 | **可迁移到前端**：作为可选的预处理步骤加入 `ExecutionPlan` |
| **Verify 参数** | `verifyJPEGXLReconstructionData` 的参数构建 | **可迁移到前端**：作为可选的验证步骤加入 `ExecutionPlan` |
| **实际执行** | 调用 jpegtran/djxl | **保留在后端** |

#### H. Smallest Lossless 格式竞争（`core/worker.py` 中的 `smallestLossless`）

| 功能 | 说明 | 迁移建议 |
|------|------|----------|
| **格式池参数构建** | PNG/WebP/JXL 的无损参数 | **可迁移到前端**：前端可生成多个并行任务，但文件大小比较需要后端反馈 |
| **最小文件选择** | 比较各格式输出大小，保留最小 | **保留在后端**：需要实际执行后比较 |

#### I. 工具提示/常量（`data/tooltips.py`、`data/constants.py`）

| 功能 | 说明 | 迁移建议 |
|------|------|----------|
| **工具提示文本** | 各设置项的说明文本 | **可迁移到前端**：作为 i18n 资源的一部分 |
| **允许输入格式列表** | `ALLOWED_INPUT_*` | **已在前端**：`AppConstants.allowedInput` |
| **编码器路径** | 各二进制路径 | **已在前端**：`ToolchainSelection` |

#### J. 更新检查（`core/update_checker.py`）

| 功能 | 说明 | 迁移建议 |
|------|------|----------|
| **版本比较** | `isNewerVersionAvailable` | **可迁移到前端**：纯逻辑，无需后端 |
| **HTTP 请求** | `requests.get` | **可迁移到前端**：前端可直接请求版本文件 |
| **UI 信号** | Qt Signal/