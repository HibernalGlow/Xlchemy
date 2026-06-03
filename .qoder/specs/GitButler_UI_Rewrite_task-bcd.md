# GitButler 风格 UI 重写计划

## Context

当前前端是单个 `app.tsx`（1384 行）包含全部 UI 和状态管理，使用 shadcn/ui 组件和 oklch 主题系统。目标是复刻 GitButler 的 UI 美学——暖灰色调、teal 主强调色、Chrome 布局（header + icon sidebar + content）、紧凑字体（12-13px Inter）、6px 小圆角、1px 精细边框——**以及 GitButler 最精髓的自由拖拽调整面板布局系统**——同时保持 React + Wails 3 技术栈和所有现有功能不变。

## GitButler Resizer 精髓分析

GitButler 的面板调整系统由 5 层构成，这是其 UI 最核心的交互体验：

### 1. Resizer 核心组件 (`Resizer.svelte` - 393 行)
- **拖拽机制**: `onMouseDown` 记录初始位置 → `onMouseMove` 计算偏移 → `applyLimits` 约束 → `updateDom` 直接修改 DOM style
- **方向**: left/right (水平 col-resize) / up/down (垂直 row-resize)
- **约束**: minWidth/maxWidth/minHeight/maxHeight，单位统一为 rem
- **持久化**: `persistId` 存 localStorage（1440 分钟过期），下次打开恢复面板宽度
- **双击重置**: `ondblclick` 恢复 defaultValue
- **视觉**: 4px 厚隐形拖拽条，absolute 定位在面板边缘，可选 `showBorder` 显示 1px 分割线
- **回调**: onWidth/onHeight/onResizing/onOverflow 事件

### 2. ResizeGroup 邻居协调 (`resizeGroup.ts` - 82 行)
- **场景**: 多个 Resizer 并排时（如三栏布局），当一个面板被挤压到最小值后继续推，自动收缩左侧邻居
- **算法**: `resize(id, newValue)` → 如果 < minValue，计算 overflow → 循环向左邻居借空间，直到满足或无更多空间
- **溢出传播**: `while (overflow && index - j >= 0)` 可连续收缩多个邻居

### 3. ResizeSync 跨实例同步 (`resizeSync.ts` - 38 行)
- **场景**: 多个页面有相同的面板布局，按住 Shift+拖拽 时同步所有同名 Resizer 的宽度
- **实现**: 发布-订阅模式，`emit(key, exclude, value)` 广播给同 key 的其他 Resizer

### 4. MainViewport 三栏分割布局 (`MainViewport.svelte` - 326 行)
- **布局**: left + preview + main(flex-grow) + right，每个可调面板带 Resizer
- **约束推导**: `finalLeftWidth = Math.min(containerMax - otherMinWidths, Math.max(min, preferred))`
- **窗口缩小**: 自动按比例收缩各面板，但保留用户手动设置的 preferredWidth
- **面板样式**: 1px border + 10px 圆角 + 8px 间距

### 5. FloatingModal 自由拖拽浮动窗口 (`FloatingModal.svelte` - 282 行)
- **拖拽**: DragResizeHandler 支持 8 方向拖拽调整大小（4 角 + 4 边）
- **网格吸附**: SnapPointManager 40px 网格，拖拽结束时 300ms cubic-bezier 动画 snap 到最近点
- **窗口 resize 自适应**: 自动约束位置 + 尺寸到视口内
- **可选**: Xlchemy 场景中暂不需要，但架构上预留扩展

### 在 Xlchemy 中的应用方案

| 位置 | Resizer 方向 | 约束 | 持久化 |
|------|-------------|------|--------|
| Sidebar ↔ Content | `right` (水平) | min:12rem, max:28rem, default:14rem | `sidebar-width` |
| Input Page: 文件列表 ↔ 文件预览 | `right` (水平) | min:16rem, max:40rem, default:22rem | `input-list-width` |
| Output Page: 上方设置 ↔ 下方预览 | `down` (垂直) | min:12rem, max:32rem, default:18rem | `output-split-height` |
| Settings Page: 子导航 ↔ 设置内容 | `right` (水平) | min:10rem, max:20rem, default:12rem | `settings-nav-width` |
| BottomBar 上方: 可折叠日志面板 | `up` (垂直) | min:6rem, max:20rem, default:10rem | `log-panel-height` |

---

## 目标文件架构

```
frontend/src/
├── app.tsx                    # 精简为 ~200 行: Provider + Chrome 骨架
├── input.css                  # 重写: GitButler token 系统
├── main.tsx                   # 添加 Inter 字体导入
├── components/
│   ├── ui/                    # 新 GitButler 风格组件 (替代 shadcn)
│   │   ├── Button.tsx, Checkbox.tsx, Select.tsx, Slider.tsx
│   │   ├── Input.tsx, Textarea.tsx, Progress.tsx, Badge.tsx
│   │   ├── Dialog.tsx, SectionCard.tsx, ToggleGroup.tsx, NumberInput.tsx
│   │   └── index.ts
│   └── resizer/               # ★ 核心: 可调整面板系统
│       ├── Resizer.tsx        # 核心拖拽调整组件 (React 版)
│       ├── ResizeGroup.ts     # 多面板邻居协调器
│       ├── ResizeSync.ts      # Shift+拖拽跨实例同步
│       ├── SplitView.tsx      # 两栏/三栏分割布局容器
│       ├── Drawer.tsx         # 可折叠面板 (带可选 Resizer)
│       └── index.ts
├── layout/                    # Chrome 布局组件
│   ├── AppChrome.tsx          # 主骨架: Header + (Sidebar|Resizer|Content) + Bottom
│   ├── HeaderBar.tsx
│   ├── Sidebar.tsx            # 可拖拽调整宽度的侧栏
│   └── BottomBar.tsx
├── pages/                     # 5 个页面 (从 app.tsx 拆分)
│   ├── InputPage.tsx          # 带 Resizer 的文件列表/预览分栏
│   ├── OutputPage.tsx         # 带垂直 Resizer 的设置/预览分栏
│   ├── ModifyPage.tsx
│   ├── SettingsPage.tsx       # 带 Resizer 的子导航/内容分栏
│   └── AboutPage.tsx
├── settings/                  # Settings 的 5 个子面板
│   ├── AppearanceSettings.tsx, GeneralSettings.tsx
│   ├── ConversionSettings.tsx, ExifToolSettings.tsx, AdvancedSettings.tsx
├── dialogs/                   # 模态对话框
│   ├── ExceptionsDialog.tsx, ImportSettingsDialog.tsx
├── hooks/
│   ├── useAppState.ts         # 状态 + actions (从 app.tsx 提取)
│   └── useConversionEvents.ts # Wails 事件监听
└── utils/themes.ts            # 重写: GitButler token 主题系统
```

## CSS 变量策略

采用 GitButler 语义化 token + shadcn 兼容层，让新组件用 `--bg-1/--text-1` 等新变量，旧组件通过映射继续工作：

| GitButler Token | 值 (dark) | shadcn 兼容 |
|---|---|---|
| `--bg-1` | 暖灰 10% (卡片) | `--card` |
| `--bg-2` | 暖灰 5% (页面) | `--background` |
| `--bg-3` | 纯黑 (侧栏/顶栏) | `--sidebar-background` |
| `--text-1` | 暖灰 95% | `--foreground` |
| `--text-2` | 暖灰 60% | `--muted-foreground` |
| `--border-2` | 暖灰 30% | `--border` |
| `--fill-pop-bg` | teal-50 | `--primary` |

Tailwind 配置添加 `bg-1`, `bg-2`, `text-1`, `text-2`, `border-2` 等颜色映射。字体从 Open Sans 换为 Inter。

---

## Task 1: CSS Token 系统 + Tailwind 配置

**修改文件**: `src/input.css`, `tailwind.config.js`, `src/main.tsx`

- 安装 `@fontsource-variable/inter`
- 重写 `input.css`: 定义完整 GitButler token 系统（暖灰色阶 + teal 色阶 + 语义 token + shadcn 兼容映射）
- 添加 Resizer 相关 CSS: `--resizer-thickness: 4px`, `--resizer-border-color`
- 更新 `tailwind.config.js`: 添加新颜色映射、Inter 字体、分级圆角、小字体尺寸
- `main.tsx` 导入 Inter 字体

**验证**: CSS 变量可用，`--resizer-thickness` 等变量正确

---

## Task 2: ★ Resizer 核心组件

**新建**: `src/components/resizer/Resizer.tsx`

React 版实现 GitButler `Resizer.svelte` 的全部核心功能：

```tsx
interface ResizerProps {
  viewport: React.RefObject<HTMLElement>;  // 被调整大小的元素
  direction: 'left' | 'right' | 'up' | 'down';
  defaultValue?: number;       // 默认值 (rem)
  minWidth?: number;           // 最小宽度 (rem)
  maxWidth?: number;           // 最大宽度 (rem)
  minHeight?: number;          // 最小高度 (rem)
  maxHeight?: number;          // 最大高度 (rem)
  persistId?: string;          // localStorage key
  syncName?: string;           // 跨实例同步名
  resizeGroup?: ResizeGroup;   // 邻居协调器
  order?: number;              // 在 group 中的排序
  showBorder?: boolean;        // 显示 1px 分割线
  passive?: boolean;           // 只回调不修改 DOM
  disabled?: boolean;
  onWidth?: (w: number) => void;
  onResizing?: (resizing: boolean) => void;
  onOverflow?: (overflow: number) => void;
  onDblClick?: () => void;
}
```

**核心实现要点**:
- `useRef` + `useEffect` 管理 mousedown/mousemove/mouseup 事件链
- `applyLimits(value)` 约束到 min/max 范围
- `updateDom(value)` 直接修改 viewport DOM 的 `style.width/height`（rem 单位）
- `persistId` 用 `localStorage.getItem/setItem` 持久化
- 双击 `ondblclick` 重置为 defaultValue
- CSS: 4px 厚 absolute 定位拖拽条, `cursor: col-resize/row-resize`
- `z-index` 可自定义，默认 `var(--z-lifted)`

---

## Task 3: ★ ResizeGroup + ResizeSync 协调器

**新建**: `src/components/resizer/ResizeGroup.ts`, `src/components/resizer/ResizeSync.ts`

**ResizeGroup** (移植 `resizeGroup.ts`):
- `register(resizer)` 注册面板 → `resize(id, newValue)` 协调调整
- 当面板被挤压到 minValue 以下，循环向左邻居借空间
- 返回 subtracted 偏移量用于修正初始点击坐标

**ResizeSync** (移植 `resizeSync.ts`):
- 发布-订阅: `subscribe({ key, resizerId, callback })` 注册
- `emit(key, excludeId, value)` 广播给同 key 的其他 Resizer
- Shift+拖拽时触发

---

## Task 4: ★ SplitView + Drawer 布局容器

**新建**: `src/components/resizer/SplitView.tsx`, `src/components/resizer/Drawer.tsx`

**SplitView** (React 版 `MainViewport.svelte`):
```tsx
interface SplitViewProps {
  name: string;                           // 持久化前缀
  left: React.ReactNode;
  leftWidth: { default: number; min: number };
  right?: React.ReactNode;
  rightWidth?: { default: number; min: number };
  middle: React.ReactNode;                // flex-grow 主面板
}
```
- 管理多面板约束推导: `finalWidth = Math.min(containerMax - otherMins, Math.max(min, preferred))`
- 每个可调面板自动注入 Resizer
- 面板样式: 1px border + 10px 圆角 + 8px 间距

**Drawer** (React 版 `Drawer.svelte`):
- 可折叠面板 + 可选 Resizer
- chevron 旋转动画 (90deg)
- 折叠状态持久化

---

## Task 5: Button 组件

**新建**: `src/components/ui/Button.tsx`

- API: `kind` (solid/outline/ghost) × `variant` (neutral/pop/success/error/warning) × `size` (sm/default/icon)
- 圆角 6px, 高度 28px, 文字 12px, `color-mix()` 透明度控制
- 过渡: 50ms ease

---

## Task 6: 表单组件集

**新建**: `src/components/ui/` 下的 Checkbox, Select, Slider, Input, Textarea, Progress, Badge

- 全部基于现有 Radix 原语，重做样式匹配 GitButler
- 统一导出 `index.ts`

---

## Task 7: SectionCard + ToggleGroup + NumberInput

**新建**: `src/components/ui/` 下的 SectionCard, ToggleGroup, NumberInput

- SectionCard: bg-1 背景 + border-2 边框 + 6px 圆角 + 16px 内边距，支持 Header 子组件
- ToggleGroup: 紧凑按钮组，选中 solid+pop / 未选中 ghost+neutral
- NumberInput: Slider + 数字输入框联动

---

## Task 8: HeaderBar

**新建**: `src/layout/HeaderBar.tsx`

- 高度 44px, bg-3 背景, border-3 下边框, padding 14px
- 左: teal 圆角 logo "X" + "Xlchemy" + 版本 Badge
- 右: 移动端汉堡按钮

---

## Task 9: Sidebar + Resizer 集成

**新建**: `src/layout/Sidebar.tsx`

- 宽 14rem 默认, **右侧带 Resizer 可拖拽调整宽度** (min:12rem, max:28rem)
- bg-3 背景, border-3 右边框
- 5 个 Tab 图标按钮 (34×34, 圆角 10px) + 文字标签
- Active 指示: 左侧 3px×18px teal pill, slide 动画
- 折叠按钮 (chevron) 可收起为 66px 纯图标模式
- 宽度持久化到 localStorage (`persistId="sidebar-width"`)
- 转换期间全部 disabled

---

## Task 10: AppChrome + BottomBar

**新建**: `src/layout/AppChrome.tsx`, `src/layout/BottomBar.tsx`

- Chrome 布局: Header → (Sidebar **|Resizer|** Content) → BottomBar
- **Sidebar 与 Content 之间有 Resizer** 实现可拖拽分割
- BottomBar: 48px, 左侧进度/文件数, 右侧 Convert 按钮 (solid+pop)
- BottomBar 上方可选折叠日志面板 (Drawer + Resizer, direction="up")

---

## Task 11: 状态管理提取

**新建**: `src/hooks/useAppState.ts`, `src/hooks/useConversionEvents.ts`

- 从 app.tsx 提取全部 useState + useCallback + useMemo + useEffect
- 使用 React Context (AppStateProvider) 提供状态
- 保持 Wails 调用逻辑完全一致

---

## Task 12: 精简 app.tsx

**修改**: `src/app.tsx`

- 精简为 ~200 行: AppStateProvider + AppChrome + PageRouter
- 初始化逻辑 (constants/settings/theme) 移入 AppStateProvider

---

## Task 13: InputPage (带 Resizer 分栏)

**新建**: `src/pages/InputPage.tsx` (从 app.tsx 439-531 行提取)

- **使用 SplitView 实现文件列表 ↔ 文件详情预览的可拖拽分栏**
- 左侧: 文件表格 (SectionCard) + 操作按钮 + 格式过滤 ToggleGroup
- 右侧 (可选): 选中文件的预览/元数据面板
- Resizer 配置: leftWidth={default:22, min:16}, persistId="input-list-width"

---

## Task 14: OutputPage (带垂直 Resizer)

**新建**: `src/pages/OutputPage.tsx` (从 app.tsx 533-852 行提取)

- **使用 Drawer + 垂直 Resizer 实现设置区 ↔ 预览区的可拖拽分栏**
- 上方: 3 个 SectionCard (Format / Conversion / Save To)
- 下方: 输出预览/摘要
- Quality/Effort/Threads 用 NumberInput
- Resizer 配置: direction="down", persistId="output-split-height"

---

## Task 15: ModifyPage

**新建**: `src/pages/ModifyPage.tsx` (从 app.tsx 854-1002 行提取)

- 2 个 SectionCard: Downscaling / Misc

---

## Task 16: SettingsPage (带 Resizer 子导航)

**新建**: `src/pages/SettingsPage.tsx`, `src/settings/` 下 5 个文件

- **使用 SplitView 实现子导航 ↔ 设置内容的可拖拽分栏**
- 左侧: ghost 按钮子 tab + teal 指示线
- 右侧: 各设置面板 (SectionCard + 表单组件)
- Resizer 配置: leftWidth={default:12, min:10}, persistId="settings-nav-width"

---

## Task 17: AboutPage

**新建**: `src/pages/AboutPage.tsx` (从 app.tsx 1234-1263 行提取)

---

## Task 18: Dialog 组件 + 对话框

**新建**: `src/components/ui/Dialog.tsx`, `src/dialogs/` 下 2 个文件

- 12px 圆角, bg-1 背景, overlay 遮罩
- ExceptionsDialog + ImportSettingsDialog

---

## Task 19: 主题系统重写

**修改**: `src/utils/themes.ts`, `src/views/theme-panel.tsx`

- 默认主题 "GitButler": 暖灰 + teal
- 旧主题 (Miku/Ralsei/Amber) 映射到新 token 结构
- 保持 light/dark/system 模式和自定义主题功能

---

## Task 20: 移除 shadcn + 收尾

- 清理所有 shadcn import, 删除 `src/components/shadcn/` 目录
- 清理 tailwind.config.js 兼容层
- 移动端适配 + 动画微调
- 验证所有 Resizer 在不同窗口尺寸下的约束推导

---

## 验证方案

每个 Task 完成后:
1. `pnpm dev` 启动开发服务器，视觉检查对应页面
2. **拖拽 Resizer 验证面板调整**: 拖拽边界、双击重置、刷新恢复持久化宽度
3. **窗口缩放验证**: 缩小窗口时面板自动收缩，放大后恢复 preferredWidth
4. 切换 Tab 确认导航正常
5. 测试文件添加/转换流程端到端
6. 切换主题确认 light/dark 模式
7. 最终 `pnpm build` 确认零编译错误
