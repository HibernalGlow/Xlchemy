<script lang="ts">
  import { cn } from "$lib/utils";

  interface Tab {
    label: string;
    disabled?: boolean;
  }

  interface Props {
    class?: string;
    tabs: Tab[];
    activeIndex?: number;
    disabled?: boolean;
    onchange?: (index: number) => void;
    content: import("svelte").Snippet;
  }

  let { class: className = "", tabs = [], activeIndex = $bindable(0), disabled = false, onchange, content }: Props = $props();

  function selectTab(i: number) {
    if (disabled || tabs[i]?.disabled) return;
    activeIndex = i;
    onchange?.(i);
  }
</script>

<div class={cn("flex flex-col h-full", className)}>
  <nav class="flex border-b border-border px-3 shrink-0">
    {#each tabs as tab, i}
      <button
        class={cn(
          "px-4 py-2.5 text-sm font-medium transition-colors border-b-2 -mb-px cursor-pointer",
          activeIndex === i
            ? "border-primary text-primary"
            : "border-transparent text-muted-foreground hover:text-foreground hover:border-muted-foreground",
          (disabled || tab.disabled) && "opacity-50 cursor-not-allowed"
        )}
        disabled={disabled || tab.disabled}
        onclick={() => selectTab(i)}
      >
        {tab.label}
      </button>
    {/each}
  </nav>
  <div class="flex-1 overflow-auto">
    {@render content()}
  </div>
</div>
