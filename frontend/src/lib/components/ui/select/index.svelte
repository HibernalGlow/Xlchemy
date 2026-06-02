<script lang="ts">
  import { cn } from "$lib/utils";

  interface Option {
    value: string;
    label: string;
  }

  interface Props {
    class?: string;
    options: (string | Option)[];
    bindValue?: string;
    disabled?: boolean;
    onchange?: (value: string) => void;
  }

  let { class: className = "", options = [], bindValue = $bindable(""), disabled = false, onchange }: Props = $props();

  function handleChange(e: Event) {
    const target = e.target as HTMLSelectElement;
    bindValue = target.value;
    onchange?.(bindValue);
  }
</script>

<select
  class={cn(
    "h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50",
    className
  )}
  {disabled}
  value={bindValue}
  onchange={handleChange}
>
  {#each options as opt}
    {#if typeof opt === 'string'}
      <option value={opt}>{opt}</option>
    {:else}
      <option value={opt.value}>{opt.label}</option>
    {/if}
  {/each}
</select>
