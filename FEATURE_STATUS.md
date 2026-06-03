# Xlchemy 功能实现状态清单

## 对比原版 Python (PySide6) 和 Go (Wails 3) 版本

### ✅ 已实现的功能（全部完成）

| 功能 | Python | Go | 状态 |
|------|--------|-----|------|
| 文件添加 | ✓ | ✓ | 完成 |
| 文件夹添加 | ✓ | ✓ | 完成 |
| 拖拽文件 | ✓ | ✓ | 完成 |
| **Input Filter** | ✓ | ✓ | 完成 |
| **Input 排序** | ✓ | ✓ | 完成 |
| **Processing Order** | ✓ | ✓ | 完成 |
| 格式转换 (JXL/AVIF/WebP/PNG/JPEG) | ✓ | ✓ | 完成 |
| 质量设置 | ✓ | ✓ | 完成 |
| Effort 设置 | ✓ | ✓ | 完成 |
| 输出目录选择 | ✓ | ✓ | 完成 |
| 保持目录结构 | ✓ | ✓ | 完成 |
| 删除原文件 | ✓ | ✓ | 完成 |
| 文件存在策略 (Replace/Skip/Rename) | ✓ | ✓ | 完成 |
| Downscaling (全部模式) | ✓ | ✓ | 完成 |
| **Custom Resampling** | ✓ | ✓ | 完成 |
| Keep timestamps | ✓ | ✓ | 完成 |
| ExifTool 后处理 | ✓ | ✓ | 完成 |
| KeepIfLarger | ✓ | ✓ | 完成 |
| CopyIfLarger | ✓ | ✓ | 完成 |
| slimg AVIF 编码器 | ✓ | ✓ | 完成 |
| **Preset 系统** | ✓ | ✓ | 完成 |
| 进度显示 | ✓ | ✓ | 完成 |
| 取消转换 | ✓ | ✓ | 完成 |
| 异常显示 | ✓ | ✓ | 完成 |
| i18n 国际化 | - | ✓ | 新增 |
| 主题系统 | ✓ | ✓ | 扩展 |
| **RAM Optimizer** | ✓ | ✓ | 完成 |
| **JXL Lossy Modular** | ✓ | ✓ | 完成 |
| **JXL Auto Lossless JPEG** | ✓ | ✓ | 完成 |
| **JXL Effort 10** | ✓ | ✓ | 完成 |
| **JPEGLI Progressive** | ✓ | ✓ | 完成 |
| **AVIF Bit Depth** | ✓ | ✓ | 完成 |
| **AOM AV1 IQ Tune** | ✓ | ✓ | 完成 |
| **Play Sound on Finish** | ✓ | ✓ | 完成 |
| **Quality Snap** | ✓ | ✓ | 完成 |
| **Disable on Startup** | ✓ | ✓ | 完成 |
| **Logging** | ✓ | ✓ | 完成 |
| **JPEG Reconstruction** | ✓ | ✓ | 完成 |
| **Smallest Lossless** | ✓ | ✓ | 完成 |

## 总结

**已实现：全部 40+ 个功能**

所有原版 Python 功能已完整复刻到 Go/Wails 3 版本，并新增了：
- i18n 国际化支持（中英文切换）
- 扩展主题系统（支持自定义主题）

### 新增文件

| 文件 | 说明 |
|------|------|
| `ram_optimizer.go` | RAM 内存优化器 |
| `slimg_dll.go` | slimg DLL wrapper |
| `slimg_avif.go` | slimg AVIF 转换（CGO 版本） |
| `slimg_avif_stub.go` | 非 slimg 构建时的 stub |
| `docs/SLIMG_INTEGRATION.md` | slimg 集成文档 |
| `build_slimg.ps1` | slimg 编译脚本 |