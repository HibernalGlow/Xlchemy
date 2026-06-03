# Xlchemy 功能验证列表

## Input 页

| 功能 | 前端实现 | 后端连接 | 状态 | 备注 |
|------|---------|---------|------|------|
| 添加文件 | `handleAddFiles` → `AppService.AddFiles` | ✓ | ✅ Working | Dialogs.OpenFile |
| 添加文件夹 | ❌ 缺失按钮 | ✓ 后端支持 | ❌ Missing | 需添加按钮调用 `Dialogs.OpenFile({CanChooseDirectories:true})` |
| 拖拽文件 | `files-dropped` 事件 | ✓ | ⚠️ 需测试 | 已添加 `data-file-drop-target` |
| 清空列表 | `clearFiles` | 不需要后端 | ✅ Working | 前端状态清空 |
| 格式过滤 | `toggleExcludedFormat` | 不传递到后端 | ⚠️ Partial | 需在转换时传递 excludedFormats |
| 排序切换 | `processingOrder` | ✓ | ✅ Working | 在 Settings 中设置 |

## Output 页

| 功能 | 前端 Key | 后端 Key | 状态 | 备注 |
|------|---------|---------|------|------|
| 格式选择 | `format` | `format` | ✅ Working | |
| 无损模式 | `lossless` | `lossless` | ✅ Working | |
| 质量 | `quality` | `quality` | ✅ Working | |
| 压缩力度 | `effort` | `effort` | ✅ Working | |
| 线程数 | `threads` | ❌ 不在 OutputSettings | ⚠️ Partial | 作为单独参数传递 |
| 文件已存在策略 | `if_file_exists` | `if_file_exists` | ✅ Working | Replace/Skip/Rename 已实现 |
| 自定义输出路径 | `custom_output_dir` | `custom_output_dir` | ✅ Working | |
| 输出路径 | `custom_output_dir_path` | `custom_output_dir_path` | ✅ Working | |
| 保持目录结构 | `keep_dir_struct` | `keep_dir_struct` | ✅ Working | |
| 删除原文件 | `delete_original` | `delete_original` | ✅ Working | 已实现删除逻辑 |

## Modify 页

| 功能 | 前端 Key | 后端 Key | 状态 | 备注 |
|------|---------|---------|------|------|
| 启用缩放 | `downscaling.enabled` | `downscaling.enabled` | ✅ Working | |
| 缩放模式 | `downscaling.mode` | `downscaling.mode` | ✅ Working | Resolution/Percent/Megapixels |
| 宽度 | `downscaling.width` | `downscaling.width` | ✅ Working | |
| 高度 | `downscaling.height` | `downscaling.height` | ✅ Working | |
| 百分比 | `downscaling.percent` | `downscaling.percent` | ✅ Working | |
| 百万像素 | `downscaling.megapixels` | `downscaling.megapixels` | ✅ Working | |
| 元数据处理 | `misc.keep_metadata` | `misc.keep_metadata` | ✅ Working | |
| 保持时间戳 | `misc.keep_timestamps` | `misc.keep_timestamps` | ✅ Working | |

## Settings 页

| 功能 | 前端 Key | 后端 Key | 状态 | 备注 |
|------|---------|---------|------|------|
| 主题 | `theme` | `theme` | ✅ Working | |
| 语言 | `currentLang` | localStorage | ✅ Working | i18n |
| JPEG编码器 | `jpg_encoder` | `jpg_encoder` | ✅ Working | |
| AVIF编码器 | `avif_encoder` | `avif_encoder` | ✅ Working | |
| AVIF位深度 | `avif_bit_depth` | `avif_bit_depth` | ✅ Working | |
| AOM IQ Tune | `avif_aom_iq_tune` | `avif_aom_iq_tune` | ✅ Working | |
| 禁用JPEGLI渐进 | `disable_progressive_jpegli` | `disable_progressive_jpegli` | ✅ Working | |
| JXL有损Modular | `jxl_lossy_modular` | `jxl_lossy_modular` | ✅ Working | |
| JXL自动无损转码 | `jxl_auto_lossless_jpeg` | `jxl_auto_lossless_jpeg` | ✅ Working | |
| 播放声音 | `play_sound_on_finish` | `play_sound_on_finish` | ✅ Working | |
| 音量 | `play_sound_on_finish_vol` | `play_sound_on_finish_vol` | ✅ Working | |
| 保留更大结果 | `keep_if_larger` | `keep_if_larger` | ✅ Working | |
| 复制更大结果 | `copy_if_larger` | `copy_if_larger` | ✅ Working | |
| 处理顺序 | `processing_order` | `processing_order` | ✅ Working | |
| ExifTool参数 | `exiftool_args` | `exiftool_args` | ✅ Working | |
| RAM优化器 | `ram_optimizer` | `ram_optimizer` | ✅ Working | |
| JXL effort 10 | `enable_jxl_effort_10` | `enable_jxl_effort_10` | ✅ Working | |
| 自定义重采样 | `custom_resampling` | `custom_resampling` | ✅ Working | |
| 自定义参数 | `enable_custom_args` | `enable_custom_args` | ✅ Working | |
| cjxl参数 | `cjxl_args` | `cjxl_args` | ✅ Working | |
| avifenc参数 | `avifenc_args` | `avifenc_args` | ✅ Working | |
| cjpegli参数 | `cjpegli_args` | `cjpegli_args` | ✅ Working | |
| IM参数 | `im_args` | `im_args` | ✅ Working | |
| 导出设置 | Clipboard | ✓ | ✅ Working | |
| 导入设置 | Dialog + Textarea | ✓ | ✅ Working | |

## 转换功能

| 功能 | 实现 | 状态 | 备注 |
|------|------|------|------|
| 开始转换 | `AppService.StartConversion` | ✅ Working | 传递所有设置 |
| 取消转换 | `AppService.CancelConversion` | ✅ Working | |
| 进度显示 | 底栏 Progress | ✅ Working | 事件监听 |
| 异常显示 | Dialog | ✅ Working | 事件监听 |

## 需要修复的功能

1. **添加文件夹按钮** - 缺失，需要添加
2. **格式过滤传递** - excludedFormats 需要在转换时传递到后端
3. **拖拽测试** - 需要实际测试验证

## 测试计划

1. 启动应用，测试添加文件按钮
2. 测试拖拽文件功能
3. 测试转换功能（选择格式、质量、删除原文件等）
4. 测试设置持久化（重启后设置是否恢复）
5. 测试主题切换和导入
6. 测试语言切换