# 保留 ComfyUI 元数据指南

## 问题背景

ComfyUI 生成的 PNG 图片包含 `workflow` 和 `prompt` 元数据，存储在 PNG 的 tEXt chunk 中。当使用 XL Converter 转换为 AVIF 格式时，这些元数据会丢失，因为 AVIF 不支持 PNG 的 tEXt chunk 格式。

## 解决方案

使用 ExifTool 的 Custom 模式，将 ComfyUI 的元数据转换为 XMP 格式写入 AVIF 文件。

### 可行参数

在 **Settings -> ExifTool -> Custom** 中输入以下参数：

```
-m -tagsFromFile $src -workflow>XMP-dc:Description -prompt>XMP-dc:Subject $dst -overwrite_original
```

> ⚠️ **重要**：参数中不要使用引号！Xlchemy 使用空格分割参数，引号会被保留在字符串中导致 exiftool 无法正确解析。

### 参数说明

| 参数 | 作用 |
|------|------|
| `-m` | 忽略次要错误 |
| `-tagsFromFile $src` | 从源文件读取标签 |
| `-workflow>XMP-dc:Description` | 将 workflow 写入 XMP Description 字段 |
| `-prompt>XMP-dc:Subject` | 将 prompt 写入 XMP Subject 字段 |
| `$dst` | 目标文件路径 |
| `-overwrite_original` | 覆盖原文件，不创建备份 |

### 使用步骤

1. 打开 XL Converter 设置界面
2. 进入 **Settings -> ExifTool**
3. 在 **Custom** 文本框输入上述参数
4. 在 **Modify** 标签页的 **Metadata** 下拉菜单中选择 **ExifTool - Custom**
5. 开始转换文件

## 测试结果

| 项目 | 数据 |
|------|------|
| 原始 PNG 大小 | 1,408,055 bytes |
| 转换后 AVIF 大小 | 205,983 bytes |
| workflow 元数据大小 | ~13,000 bytes |
| 压缩率 | **85%** |
| 元数据保留 | ✅ 成功 |

## 注意事项

1. **XMP 大小限制**: AVIF 的 XMP 元数据有大小限制，超大 workflow（>64KB）可能无法完整保存

2. **ComfyUI 识别问题**: ComfyUI 可能无法直接识别存储在 XMP 中的 workflow 数据。如需在 ComfyUI 中使用，可能需要：
   - 手动提取 XMP 数据
   - 使用第三方工具转换回 PNG tEXt 格式

3. **推荐格式**: 如果需要完整保留 ComfyUI 工作流并在 ComfyUI 中直接使用，建议：
   - 转换为 **PNG** 或 **WebP** 格式（它们对文本元数据支持更好）
   - 或保留原始 PNG 文件作为工作流备份

4. **仅保留 workflow**: 如果只需要 workflow 不需要 prompt，可以使用：
   ```
   -m -tagsFromFile $src -workflow>XMP-dc:Description $dst -overwrite_original
   ```

## 从 AVIF 提取 workflow

如果需要从转换后的 AVIF 文件中提取 workflow 数据：

```bash
exiftool -XMP-dc:Description -b output.avif > workflow.json
```

然后可以将 workflow.json 的内容手动导入到 ComfyUI。

## 相关文件

- 元数据处理代码: [core/metadata.py](../core/metadata.py)
- ExifTool 设置界面: [ui/tabs/settings_tab.py](../ui/tabs/settings_tab.py)
- Worker 转换逻辑: [core/worker.py](../core/worker.py)