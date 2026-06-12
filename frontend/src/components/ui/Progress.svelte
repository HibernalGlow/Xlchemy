<script lang="ts">
  import { cn } from '$lib/utils/cn';

  interface Props {
    value?: number;
    class?: string;
  }

  let { value = 0, class: className = '' }: Props = $props();
</script>

<div class={cn('relative h-2 w-full overflow-hidden rounded-full border border-border-2 bg-bg-2', className)}>
  <div
    class="h-full rounded-full bg-fill-pop transition-[width] duration-150 ease-in-out"
    style="width: {value ?? 0}%"
  ></div>
</div>
