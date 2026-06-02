# Xlchemy: i18n + 完整主题管理 + 转换速度基准测试

## Context

Xlchemy 已完成 Svelte→React 前端迁移。现在需要添加三大功能：
1. **i18n 国际化** — 所有 UI 文本从硬编码英文改为可切换的中英文
2. **完整主题管理系统** — 支持 Light/Dark/System 模式、自定义主题 CRUD、从 tweakcn.com URL 或 JSON 导入导出
3. **转换速度基准测试** — 对比 Go 版本和 Python 原版各格式的转换速度

参考 `D:\1VSCODE\Projects\ImageAll\czkawka-tauri` 项目的 i18n 和主题管理实现。

---

## Phase 1: i18n 国际化

### Task 1.1: 安装依赖 + 创建 i18n 基础设施

**安装**: `pnpm add i18next react-i18next`

**新增文件**:
| 文件 | 内容 |
|------|------|
| `src/i18n/index.ts` | i18next 初始化，从 localStorage 读取语言 |
| `src/i18n/en.ts` | 英文翻译 (~100 个 flat key) |
| `src/i18n/zh.ts` | 中文翻译 (与 en.ts 对应) |
| `src/hooks/useT.ts` | `useTranslation` 的薄包装 |

**修改文件**:
| 文件 | 修改 |
|------|------|
| `src/main.tsx` | 在 createRoot 前调用 `initI18n()` |
| `src/app.tsx` | ~75 处硬编码字符串替换为 `t('key')` |
| `src/views/app-sidebar.tsx` | navItems 移到组件内用 `useMemo` + `t()` |

### Task 1.2: 替换所有硬编码字符串

翻译 key 使用 flat 格式（参考 czkawka），按页面分组：

```typescript
// en.ts 示例
export const en = {
  // 导航
  'Input': 'Input', 'Output': 'Output', 'Modify': 'Modify',
  'Settings': 'Settings', 'About': 'About',
  // Input 页
  'Add Files': 'Add Files', 'Clear': 'Clear', 'Convert': 'Convert',
  'Name': 'Name', 'Ext': 'Ext', 'Location': 'Location',
  'file(s)': 'file(s)',
  // Output 页
  'Format': 'Format', 'Select format': 'Select format',
  'Lossless': 'Lossless', 'Quality': 'Quality', 'Effort': 'Effort',
  'Threads': 'Threads', 'If file exists': 'If file exists',
  'Replace': 'Replace', 'Skip': 'Skip', 'Rename': 'Rename',
  'Next to source': 'Next to source', 'Custom folder': 'Custom folder',
  'Keep folder structure': 'Keep folder structure',
  'Delete original': 'Delete original',
  // Modify 页
  'Downscaling': 'Downscaling', 'Enable downscaling': 'Enable downscaling',
  'Mode': 'Mode', 'Width': 'Width', 'Height': 'Height',
  'Percent': 'Percent', 'Megapixels': 'Megapixels',
  'Metadata': 'Metadata', 'Keep timestamps': 'Keep timestamps',
  // Settings 页
  'Appearance': 'Appearance', 'Theme': 'Theme', 'Language': 'Language',
  'Encoders': 'Encoders', 'Behavior': 'Behavior',
  'Processing': 'Processing', 'Processing order': 'Processing order',
  // ... 所有 settings 选项
  // Dialog
  'Converting...': 'Converting...', 'Cancel': 'Cancel', 'Close': 'Close',
  'Exceptions': 'Exceptions',
  // Theme
  'Theme mode': 'Theme Mode', 'Light': 'Light', 'Dark': 'Dark', 'System': 'System',
  'Color scheme': 'Color Scheme', 'Custom themes': 'Custom Themes',
  // ... 主题管理相关
};
```

语言切换 UI 在 Settings > Appearance 中添加 Language Select。

### Task 1.3: 构建验证

`pnpm build` 无 TS 错误，切换语言后所有页面文本正确更新。

---

## Phase 2: 完整主题管理系统

### Task 2.1: 升级 `src/utils/themes.ts`

**保留**: `presetThemes`（4 个 oklch 主题数据不变）

**新增类型**:
```typescript
export type ThemeMode = 'light' | 'dark' | 'system';
export interface CustomThemeConfig {
  name: string;
  description: string;
  colors: { light: ThemeColorsVariant; dark: ThemeColorsVariant };
}
```

**新增函数**:
| 函数 | 职责 |
|------|------|
| `getThemeMode()` / `setThemeMode()` | localStorage 读写 theme mode |
| `getCustomThemes()` / `saveCustomTheme()` / `deleteCustomTheme()` | 自定义主题 CRUD (localStorage) |
| `applyThemeColors()` | **核心**: 根据 mode + themeName + customThemes 计算最终颜色，设置 CSS 变量 + dark class |
| `watchSystemTheme()` | 监听系统主题变化，mode=system 时自动更新 |
| `importThemeFromURL(url)` | fetch tweakcn.com JSON → CustomThemeConfig |
| `importThemeFromJSON(json)` | 解析 JSON 字符串 → CustomThemeConfig[] |
| `exportTheme(theme)` / `exportAllThemes()` | 序列化为 JSON |
| `captureCurrentTheme()` | 从 DOM 读取当前 CSS 变量值 |

**localStorage keys**:
- `xlchemy-theme` — 主题名（已有）
- `xlchemy-theme-mode` — light/dark/system
- `xlchemy-custom-themes` — CustomThemeConfig[] JSON

### Task 2.2: 创建 `src/views/theme-panel.tsx`

参考 czkawka 的 theme-panel.tsx (469 行)，实现：

```
ThemePanel
├── 主题模式选择 (Light / Dark / System) — 3 个按钮卡片
├── 预设主题网格 (4 个预设主题 + 颜色预览圆点)
├── 自定义主题列表 (展开/折叠, 每个带 Export/Delete 按钮)
├── 保存当前主题 (名称输入 + 保存按钮)
├── 从 URL 导入 (URL 输入 + Import 按钮)
├── 从 JSON 导入 (Textarea + Import 按钮)
└── 颜色预览网格 (primary/accent/background 等色块)
```

### Task 2.3: 改造 app.tsx Settings 页面

- 替换原有 Appearance Card（简单 Select）为 `<ThemePanel />`
- 初始化时调用 `applyThemeColors()` + `watchSystemTheme()` 代替旧 `applyTheme(name)`
- 移除 `changeTheme()` 函数，主题变更由 ThemePanel 内部处理

### Task 2.4: 构建验证

- 主题模式切换（Light/Dark/System）正常
- 4 个预设主题切换正常
- 自定义主题保存/删除/导入/导出正常
- 刷新后主题状态恢复

---

## Phase 3: 转换速度基准测试

### Task 3.1: 创建 `scripts/bench_convert.py`

**核心思路**: Go 和 Python 都是调用相同的外部二进制（cjxl, avifenc, magick 等），对比的是 wrapper 开销。

**测试矩阵**:
| 格式 | 二进制 | 参数 |
|------|--------|------|
| JPEG XL | cjxl.exe | -q 80 -e 7 --num_threads=4 |
| AVIF | avifenc.exe | -q 80 -s 5 -j 4 |
| JPEG (JPEGLI) | cjpegli.exe | -q 80 |
| WebP | magick.exe | -quality 80 |
| Lossless JXL Transcoding | cjxl.exe | -e 7 --num_threads=4 |

**脚本功能**:
- `--iterations N` 参数（默认 5 次）
- `--test-image PATH` 参数（默认 tests/test_images/test.jpg）
- 2 次 warmup 运行不计入统计
- 输出对比表: 格式 / Direct avg / Python avg / Delta %
- 临时文件自动清理

### Task 3.2: 准备测试图片

当前 test.jpg 仅 4.6KB，建议：
- 脚本支持 `--test-image` 参数接受大图
- 输出警告如果测试图片 < 100KB
- 可选: 使用 magick 自动生成 2000x2000 测试图

### Task 3.3: 运行基准测试

```
python scripts/bench_convert.py --iterations 5 --test-image path/to/large.jpg
```

---

## 执行顺序

```
Phase 1: i18n (无依赖)
  → Task 1.1 → 1.2 → 1.3

Phase 2: 主题管理 (Phase 2 的 ThemePanel 文本需要 i18n)
  → Task 2.1 → 2.2 → 2.3 → 2.4

Phase 3: 基准测试 (完全独立)
  → Task 3.1 → 3.2 → 3.3
```

## 验证计划

1. **i18n**: 切换中英文，5 个页面 + 2 个对话框所有文本正确翻译
2. **主题**: Light/Dark/System 切换 + 预设主题切换 + 自定义主题导入导出 + 持久化
3. **基准**: 所有格式至少 3 次有效运行，输出对比表
4. **构建**: `pnpm build` 零错误 + Go 二进制编译成功
