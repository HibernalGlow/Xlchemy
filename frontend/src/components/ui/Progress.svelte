<script lang="ts">
  import { cn } from '$lib/utils/cn';

  interface Props {
    value?: number;
    class?: string;
  }

  let { value = 0, class: className = '' }: Props = $props();
</script>

<div class={cn('relative h-2.5 w-full overflow-hidden rounded-full border border-[color-mix(in_oklch,var(--border-2)_55%,transparent)] bg-[color-mix(in_oklch,var(--bg-3)_82%,transparent)] shadow-[inset_0_1px_0_var(--highlight)]', className)}>
  <div
    class="h-full rounded-full bg-[linear-gradient(90deg,color-mix(in_oklch,var(--fill-pop-bg)_92%,white_8%),color-mix(in_oklch,var(--fill-accent)_32%,var(--fill-pop-bg)_68%))] shadow-[0_0_18px_color-mix(in_oklch,var(--fill-pop-bg)_26%,transparent)] transition-[width] duration-150 ease-in-out"
    style="width: {value ?? 0}%"
  ></div>
</div>
