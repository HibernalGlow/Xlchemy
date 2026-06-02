<script lang="ts">
  import { cn } from "$lib/utils";
  import type { Component as SvelteComponent } from "svelte";
  import { PanelLeftClose, PanelLeftOpen } from "@lucide/svelte";

  export interface SidebarItem {
    label: string;
    icon?: SvelteComponent<any>;
    disabled?: boolean;
  }

  interface Props {
    class?: string;
    items: SidebarItem[];
    activeIndex?: number;
    collapsed?: boolean;
    /** When true, sidebar becomes an overlay drawer on small screens */
    mobileOpen?: boolean;
    disabled?: boolean;
    onchange?: (index: number) => void;
    onmobileclose?: () => void;
    content: import("svelte").Snippet;
    header?: import("svelte").Snippet;
    footer?: import("svelte").Snippet;
  }

  let {
    class: className = "",
    items = [],
    activeIndex = $bindable(0),
    collapsed = $bindable(false),
    mobileOpen = $bindable(false),
    disabled = false,
    onchange,
    onmobileclose,
    content,
    header,
    footer,
  }: Props = $props();

  // Track if we're in mobile viewport
  let isMobile = $state(false);

  // Use matchMedia for responsive detection
  let mql: MediaQueryList | null = null;

  $effect(() => {
    if (typeof window === 'undefined') return;
    mql = window.matchMedia('(max-width: 768px)');
    const handler = (e: MediaQueryListEvent | MediaQueryList) => {
      isMobile = e.matches;
      if (e.matches) {
        // Auto-collapse on mobile
        collapsed = true;
      }
    };
    handler(mql);
    mql.addEventListener('change', handler as (e: MediaQueryListEvent) => void);
    return () => mql?.removeEventListener('change', handler as (e: MediaQueryListEvent) => void);
  });

  function selectItem(i: number) {
    if (disabled || items[i]?.disabled) return;
    activeIndex = i;
    onchange?.(i);
    // Close mobile drawer after selection
    if (isMobile) {
      mobileOpen = false;
      onmobileclose?.();
    }
  }

  function toggle() {
    if (isMobile) {
      mobileOpen = !mobileOpen;
    } else {
      collapsed = !collapsed;
    }
  }

  // Keyboard navigation within sidebar
  function handleKeydown(e: KeyboardEvent) {
    if (disabled) return;
    const len = items.length;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      let next = (activeIndex + 1) % len;
      while (items[next]?.disabled && next !== activeIndex) next = (next + 1) % len;
      selectItem(next);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      let prev = (activeIndex - 1 + len) % len;
      while (items[prev]?.disabled && prev !== activeIndex) prev = (prev - 1 + len) % len;
      selectItem(prev);
    }
  }

  // Expose toggle for parent (mobile hamburger)
  export function openMobile() { mobileOpen = true; }
  export function closeMobile() { mobileOpen = false; onmobileclose?.(); }
  export function toggleMobile() { mobileOpen = !mobileOpen; }
</script>

<!-- svelte-ignore a11y_no_static_element_interactions -->
<div class={cn("flex h-full", className)} onkeydown={handleKeydown}>
  <!-- Mobile backdrop -->
  {#if isMobile && mobileOpen}
    <!-- svelte-ignore a11y_no_static_element_interactions -->
    <div
      class="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm md:hidden"
      onclick={() => { mobileOpen = false; onmobileclose?.(); }}
      onkeydown={(e) => { if (e.key === 'Escape') { mobileOpen = false; onmobileclose?.(); } }}
    ></div>
  {/if}

  <!-- Sidebar -->
  <aside
    role="navigation"
    aria-label="Main navigation"
    class={cn(
      "flex flex-col border-r border-sidebar-border bg-sidebar text-sidebar-foreground transition-all duration-200 shrink-0 z-50",
      // Desktop sizing
      !isMobile && (collapsed ? "w-14" : "w-52"),
      // Mobile: fixed overlay drawer
      isMobile && cn(
        "fixed inset-y-0 left-0 w-56 shadow-xl",
        mobileOpen ? "translate-x-0" : "-translate-x-full"
      )
    )}
  >
    <!-- Header -->
    {#if header}
      <div class={cn("shrink-0 border-b border-sidebar-border", collapsed && !isMobile ? "p-2" : "px-4 py-3")}>
        {@render header()}
      </div>
    {/if}

    <!-- Nav items -->
    <nav class="flex-1 overflow-y-auto py-1.5" aria-label="Sidebar navigation">
      {#each items as item, i}
        <button
          role="menuitem"
          aria-current={activeIndex === i ? "page" : undefined}
          class={cn(
            "flex items-center gap-3 w-full transition-all duration-150 cursor-pointer rounded-md mx-1.5",
            collapsed && !isMobile ? "px-0 py-2.5 justify-center w-[calc(100%-0.75rem)]" : "px-3 py-2.5",
            activeIndex === i
              ? "bg-sidebar-accent text-sidebar-accent-foreground font-medium shadow-sm"
              : "text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground",
            (disabled || item.disabled) && "opacity-50 cursor-not-allowed pointer-events-none"
          )}
          disabled={disabled || item.disabled}
          onclick={() => selectItem(i)}
          title={collapsed && !isMobile ? item.label : undefined}
        >
          {#if item.icon}
            {@const Icon = item.icon}
            <Icon class={cn("shrink-0 transition-transform", activeIndex === i ? "w-5 h-5" : "w-[18px] h-[18px]")} />
          {/if}
          {#if isMobile || !collapsed}
            <span class="text-sm truncate">{item.label}</span>
          {/if}
        </button>
      {/each}
    </nav>

    <!-- Footer slot -->
    {#if footer}
      <div class={cn("shrink-0 border-t border-sidebar-border", collapsed && !isMobile ? "p-2" : "px-4 py-3")}>
        {@render footer()}
      </div>
    {/if}

    <!-- Collapse toggle (desktop only) -->
    {#if !isMobile}
      <button
        class="flex items-center justify-center p-2.5 border-t border-sidebar-border text-sidebar-foreground/50 hover:text-sidebar-foreground hover:bg-sidebar-accent/30 transition-colors cursor-pointer"
        onclick={toggle}
        aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
      >
        {#if collapsed}
          <PanelLeftOpen class="w-4 h-4" />
        {:else}
          <PanelLeftClose class="w-4 h-4" />
        {/if}
      </button>
    {/if}
  </aside>

  <!-- Main content -->
  <main class="flex-1 overflow-auto min-w-0">
    {@render content()}
  </main>
</div>
