<script lang="ts">
  import { cn } from '$lib/utils/cn';
  import { X } from '@lucide/svelte';

  interface Props {
    open?: boolean;
    onOpenChange?: (open: boolean) => void;
    class?: string;
    children?: import('svelte').Snippet;
  }

  let { open = $bindable(false), onOpenChange, class: className = '', children }: Props = $props();

  function handleClose() {
    open = false;
    onOpenChange?.(false);
  }

  function handleKeydown(e: KeyboardEvent) {
    if (e.key === 'Escape' && open) {
      handleClose();
    }
  }

  $effect(() => {
    if (open) {
      document.addEventListener('keydown', handleKeydown);
      document.body.style.overflow = 'hidden';
      return () => {
        document.removeEventListener('keydown', handleKeydown);
        document.body.style.overflow = '';
      };
    }
  });
</script>

{#if open}
  <div class="fixed inset-0 z-modal" role="dialog" aria-modal="true">
    <div class="fixed inset-0 bg-black/60 backdrop-blur-sm" onclick={handleClose} aria-hidden="true"></div>
    <div class="fixed inset-0 flex items-center justify-center p-4">
      <div
        class={cn(
          'relative w-full max-w-lg rounded-gb-lg border border-border-2 bg-bg-1 shadow-[0_4px_16px_rgba(0,0,0,0.3)]',
          className,
        )}
      >
        <button
          type="button"
          onclick={handleClose}
          class="absolute right-2 top-2 inline-flex h-6 w-6 items-center justify-center rounded-[4px] text-text-2 transition-colors hover:bg-ntrl-30 hover:text-text-1"
        >
          <X class="h-3.5 w-3.5" />
        </button>
        {@render children?.()}
      </div>
    </div>
  </div>
{/if}
