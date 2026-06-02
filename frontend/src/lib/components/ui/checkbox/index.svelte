<script lang="ts">
  import { cn } from "$lib/utils";

  interface Props {
    class?: string;
    checked?: boolean;
    disabled?: boolean;
    label?: string;
    onchange?: (checked: boolean) => void;
  }

  let { class: className = "", checked = $bindable(false), disabled = false, label = "", onchange }: Props = $props();

  function handleChange(e: Event) {
    checked = (e.target as HTMLInputElement).checked;
    onchange?.(checked);
  }
</script>

<label class={cn("flex items-center gap-2 text-sm cursor-pointer select-none", disabled && "opacity-50 cursor-not-allowed", className)}>
  <input
    type="checkbox"
    {checked}
    {disabled}
    onchange={handleChange}
    class="h-4 w-4 rounded border-border text-primary focus:ring-ring accent-primary"
  />
  {#if label}<span>{label}</span>{/if}
</label>
