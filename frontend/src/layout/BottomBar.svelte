<script lang="ts">
  import Badge from '$lib/components/ui/Badge.svelte';
  import Progress from '$lib/components/ui/Progress.svelte';
  import { i18n } from '$lib/i18n/t.svelte';
  import { cn } from '$lib/utils/cn';

  interface Props {
    isConverting: boolean;
    progress: { completed: number; total: number; line1: string; line2: string };
    fileCount: number;
    exceptionCount: number;
    onShowExceptions: () => void;
    disabled?: boolean;
  }

  let {
    isConverting,
    progress,
    fileCount,
    exceptionCount,
    onShowExceptions,
    disabled = false,
  }: Props = $props();

  const t = i18n.t;
  const progressPercent = $derived(progress.total > 0 ? Math.round((progress.completed / progress.total) * 100) : 0);
</script>

<footer class={cn('flex items-center justify-between h-[48px] bg-[var(--bg-3)] border-t border-[var(--border-2)] px-[14px] shrink-0', disabled && 'opacity-50 pointer-events-none')}>
  <div class="flex items-center gap-3 min-w-0 flex-1">
    {#if isConverting}
      <div class="flex items-center gap-3 min-w-0 flex-1">
        <div class="flex-1 min-w-[120px] max-w-[240px]">
          <Progress value={progressPercent} />
        </div>
        <span class="text-xs text-text-2 whitespace-nowrap">{progress.line1}</span>
        {#if progress.line2}
          <span class="text-xs text-text-2 whitespace-nowrap hidden sm:inline">{progress.line2}</span>
        {/if}
      </div>
    {:else}
      <Badge variant="secondary">{fileCount} {t('file(s)')}</Badge>
    {/if}
  </div>

  <div class="flex items-center gap-2 shrink-0">
    {#if exceptionCount > 0}
      <button type="button" class="text-xs text-[var(--fill-pop-bg)] hover:underline" onclick={onShowExceptions}>
        {exceptionCount} {t('Exceptions')}
      </button>
    {/if}
  </div>
</footer>
