<script lang="ts">
  import { cn } from "$lib/utils";

  interface Props {
    class?: string;
    value?: number;
    min?: number;
    max?: number;
    step?: number;
    disabled?: boolean;
  }

  let { class: className = "", value = $bindable(0), min = 0, max = 100, step = 1, disabled = false }: Props = $props();
</script>

<input
  type="range"
  class={cn("w-full h-2 rounded-full appearance-none bg-secondary accent-primary cursor-pointer disabled:cursor-not-allowed disabled:opacity-50", className)}
  bind:value
  {min}
  {max}
  {step}
  {disabled}
/>
