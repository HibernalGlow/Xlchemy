
下面是可直接放进 md 的手动修改说明。

```md
# Xlchemy GitButler UI 视觉迁移手动修改说明

## 目标

把当前 Xlchemy 纯色 UI 调成更接近 GitButler desktop 原版的视觉语言：

- 浅灰点阵背景
- 半透明白色 lane/card 面板
- 细边框 + 轻阴影
- teal 主色 + 暖橙撞色
- 侧栏 active 圆角指示条
- 顶栏按钮和输入控件使用透明玻璃感

## 参考源码

主要参考这些文件：

- `D:/1VSCODE/Projects/ImageAll/gitbutler/apps/desktop/src/styles/styles.css`
- `D:/1VSCODE/Projects/ImageAll/gitbutler/apps/desktop/src/components/ChromeSidebar.svelte`
- `D:/1VSCODE/Projects/ImageAll/gitbutler/apps/desktop/src/components/ChromeHeader.svelte`
- `D:/1VSCODE/Projects/ImageAll/gitbutler/packages/ui/src/styles/components/card.css`

GitButler 点阵核心：

```css
.dotted-pattern {
  background-image: radial-gradient(
    oklch(from var(--clr-scale-ntrl-50) l c h / 0.13) 1px,
    #ffffff00 1px
  );
  background-size: 5px 5px;
}
```

## 修改文件

优先只改这些文件：

- `Xlchemy/frontend/src/input.css`
- `Xlchemy/frontend/src/layout/HeaderBar.svelte`
- `Xlchemy/frontend/src/components/ui/Button.svelte`
- `Xlchemy/frontend/src/components/ui/Input.svelte`
- `Xlchemy/frontend/src/components/ui/Select.svelte`
- `Xlchemy/frontend/src/components/ui/Checkbox.svelte`
- `Xlchemy/frontend/src/components/ui/NumberInput.svelte`

## input.css 主题变量建议

在 light theme 的 `:root:not(.dark)` 里把语义色调成 GitButler 浅色基调：

```css
--bg-1: oklch(0.985 0.003 75);
--bg-2: oklch(0.955 0.004 75);
--bg-3: oklch(0.925 0.004 75);
--text-1: oklch(0.22 0.006 70);
--text-2: oklch(0.54 0.006 70);
--border-2: oklch(0.84 0.006 75);
--fill-pop-bg: oklch(0.70 0.145 181);
--accent-warm: oklch(0.72 0.16 45);
--accent-lilac: oklch(0.68 0.11 305);
```

暗色主题可以先保持现状，避免一次改太多。

## App Shell / Workspace

替换或调整这些类：

```css
.app-shell {
  display: flex;
  flex-direction: column;
  height: 100%;
  max-width: 100%;
  background:
    linear-gradient(180deg, color-mix(in oklch, var(--bg-2) 94%, white), var(--bg-2));
}

.chrome-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 14px;
  gap: 12px;
  background: color-mix(in oklch, var(--bg-2) 84%, transparent);
  backdrop-filter: blur(14px);
}

.chrome-workspace {
  display: flex;
  flex: 1;
  min-width: 0;
  min-height: 0;
  border: 1px solid color-mix(in oklch, var(--border-2) 72%, transparent);
  border-radius: 18px;
  overflow: hidden;
  background: var(--bg-3);
}

.canvas-bg {
  background-color: var(--bg-3);
  background-image:
    radial-gradient(color-mix(in oklch, var(--text-2) 18%, transparent) 1px, transparent 1px),
    linear-gradient(180deg, color-mix(in oklch, white 42%, transparent), transparent 42%);
  background-size: 5px 5px, 100% 100%;
}
```

## Lane 面板

```css
.lane {
  background: color-mix(in oklch, var(--bg-1) 86%, transparent);
  border: 1px solid color-mix(in oklch, var(--border-2) 76%, transparent);
  border-radius: 10px;
  box-shadow:
    0 1px 0 rgba(255, 255, 255, 0.72) inset,
    0 12px 28px rgba(15, 23, 42, 0.06);
  backdrop-filter: blur(14px);
}

.lane:hover {
  box-shadow:
    0 1px 0 rgba(255, 255, 255, 0.72) inset,
    0 14px 32px rgba(15, 23, 42, 0.08),
    0 0 0 1px color-mix(in oklch, var(--fill-pop-bg) 22%, transparent);
}

.stack-content {
  background: color-mix(in oklch, var(--bg-1) 34%, transparent);
}
```

## Drawer / Card

```css
.drawer {
  background: color-mix(in oklch, var(--bg-1) 44%, transparent);
}

.drawer--border {
  border-bottom: 1px solid color-mix(in oklch, var(--border-2) 70%, transparent);
}

.drawer-header {
  height: 32px;
  padding: 0 10px 0 12px;
  border-bottom: 1px solid color-mix(in oklch, var(--border-2) 68%, transparent);
  background: color-mix(in oklch, var(--bg-1) 62%, transparent);
  backdrop-filter: blur(10px);
}

.drawer-header__text {
  font-size: 12px;
  font-weight: 650;
  color: var(--text-1);
}
```

## Sidebar

```css
.chrome-sidebar {
  padding: 0 16px 16px 16px;
}

.chrome-sidebar__active-indicator {
  position: absolute;
  left: 0;
  top: 50%;
  width: 12px;
  height: 18px;
  transform: translateX(-50%) translateY(-50%);
  border-radius: 999px;
  background: linear-gradient(180deg, var(--fill-pop-bg), var(--accent-warm));
}

.chrome-sidebar__button {
  width: 34px;
  aspect-ratio: 1 / 1;
  border: 1px solid color-mix(in oklch, var(--border-2) 70%, transparent);
  border-radius: 12px;
  background: color-mix(in oklch, var(--bg-1) 42%, transparent);
  color: color-mix(in oklch, var(--text-2) 80%, transparent);
  backdrop-filter: blur(8px);
}

.chrome-sidebar__button--active {
  background: var(--bg-1);
  color: var(--text-1);
  box-shadow: 0 1px 0 rgba(255, 255, 255, 0.72) inset;
}
```

## 顶栏品牌

`HeaderBar.svelte` 可以把品牌文字改成独立 class，方便使用 GitButler 自带的 `But Head` 字体：

```svelte
<div class="chrome-header__brand">
  <div class="chrome-header__logo">X</div>
  <div class="chrome-header__brand-copy">
    <div class="chrome-header__brand-row">
      <span class="chrome-header__brand-name">Xlchemy</span>
      {#if version}
        <Badge variant="secondary" class="chrome-header__version">v{version}</Badge>
      {/if}
    </div>
    <div class="chrome-header__status text-xs text-text-2">{fileCount} {t('file(s)')}</div>
  </div>
</div>
```

对应 CSS：

```css
.chrome-header__logo {
  width: 30px;
  height: 30px;
  border-radius: 10px;
  background: linear-gradient(135deg, var(--fill-pop-bg), color-mix(in oklch, var(--fill-pop-bg) 64%, var(--accent-warm)));
  color: white;
  box-shadow: 0 10px 22px color-mix(in oklch, var(--fill-pop-bg) 26%, transparent);
}

.chrome-header__brand-name {
  font-family: "But Head", Inter, sans-serif;
  font-size: 17px;
  font-weight: 400;
  color: var(--text-1);
}
```

## 表单控件方向

把 `Button/Input/Select/Checkbox/NumberInput` 里的 `bg-bg-1 border-border-2` 替换成类似：

```txt
border-[color-mix(in_oklch,var(--border-2)_70%,transparent)]
bg-[color-mix(in_oklch,var(--bg-1)_82%,transparent)]
backdrop-blur-sm
shadow-[inset_0_1px_0_rgba(255,255,255,0.72)]
```

主按钮 `Convert` 建议使用渐变：

```txt
bg-[linear-gradient(135deg,var(--fill-pop-bg),color-mix(in_oklch,var(--fill-pop-bg)_72%,var(--accent-warm)_28%))]
text-white
```

## 验证

改完后在 `Xlchemy/frontend` 跑：

```powershell
pnpm check
pnpm build:dev
```

如果只想先看视觉：

```powershell
pnpm dev
```
```