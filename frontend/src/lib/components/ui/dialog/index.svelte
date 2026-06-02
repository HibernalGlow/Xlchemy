<script lang="ts">
  import { cn } from "$lib/utils";

  interface Props {
    open?: boolean;
    onclose?: () => void;
    title?: string;
    children: import("svelte").Snippet;
    footer?: import("svelte").Snippet;
  }

  let { open = $bindable(false), onclose, title = "", children, footer }: Props = $props();

  function handleOverlayClick() {
    open = false;
    onclose?.();
  }

  function handleKeydown(e: KeyboardEvent) {
    if (e.key === "Escape") {
      open = false;
      onclose?.();
    }
  }
</script>

<svelte:window onkeydown={handleKeydown} />

{#if open}
  <div
    class="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
    onclick={handleOverlayClick}
    role="dialog"
    aria-modal="true"
  >
    <div
      class={cn("relative bg-card rounded-lg border shadow-lg p-6 max-w-lg w-full max-h-[80vh] overflow-auto")}
      onclick={(e) => e.stopPropagation()}
    >
      {#if title}
        <h2 class="text-lg font-semibold mb-4">{title}</h2>
      {/if}
      {@render children()}
      {#if footer}
        <div class="flex justify-end gap-2 mt-4">
          {@render footer()}
        </div>
      {/if}
    </div>
  </div>
{/if}
