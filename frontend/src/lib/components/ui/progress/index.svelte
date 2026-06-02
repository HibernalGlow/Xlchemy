<script lang="ts">
  import { cn } from "$lib/utils";

  interface Props {
    class?: string;
    value?: number;
    max?: number;
  }
  let { class: className = "", value = 0, max = 100 }: Props = $props();
  let percent = $derived(max > 0 ? Math.min((value / max) * 100, 100) : 0);
</script>

<div class={cn("relative h-4 w-full overflow-hidden rounded-full bg-secondary", className)}>
  <div
    class="h-full bg-primary transition-all duration-200"
    style="width: {percent}%"
  ></div>
</div>
