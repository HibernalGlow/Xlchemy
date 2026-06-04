<script lang="ts">
  import { cn } from '$lib/utils/cn';

  interface Props {
    value?: number;
    class?: string;
  }

  let { value = 0, class: className = '' }: Props = $props();
</script>

<div class={cn('relative h-1 w-full overflow-hidden rounded-[2px] bg-bg-3', className)}>
  <div class="h-full rounded-[2px] bg-fill-pop transition-[width] duration-150 ease-in-out" style="width: {value ?? 0}%"></div>
</div>
