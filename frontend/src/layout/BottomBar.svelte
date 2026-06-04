<script lang="ts">
  import Button from '$lib/components/ui/Button.svelte';
  import Badge from '$lib/components/ui/Badge.svelte';
  import Progress from '$lib/components/ui/Progress.svelte';
  import { i18n } from '$lib/i18n/t.svelte';
  import { cn } from '$lib/utils/cn';
  import { X } from '@lucide/svelte';

  interface Props {
    isConverting: boolean;
    progress: { completed: number; total: number; line1: string; line2: string };
    fileCount: number;
    exceptionCount: number;
    onConvert: () => void;
    onCancel: () => void;
    onShowExceptions: () => void;
    disabled?: boolean;
  }

  let {
    isConverting,
    progress,
    fileCount,
    exceptionCount,
    onConvert,
    onCancel,
    onShowExceptions,
    disabled = false,
  }: Props = $props();

  const t = i18n.t;
  const progressPercent = $derived(progress.total > 0 ? Math.round((progress.completed / progress.total) * 100) : 0);
</script>

<footer class={cn('flex items-center justify-between h-[48px] bg-[var(--bg-3)] border-t border-[var(--border-2)] px-[14px] shrink-0', disabled && 'opacity-50 pointer-events-none')}>
  <div class="flex items-center gap-3 min-w-0">
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
      <div class="flex items-center gap-2">
        <Badge variant="secondary">{fileCount} {t('file(s)')}</Badge>
        {#if exceptionCount > 0}
          <Button kind="ghost" variant="error" size="sm" onclick={onShowExceptions}>
            {exceptionCount} {t('Exceptions')}
          </Button>
        {/if}
      </div>
    {/if}
  </div>

  <div class="flex items-center gap-2 shrink-0">
    {#if isConverting}
      <Button kind="outline" variant="neutral" size="sm" onclick={onCancel}>
        <X class="h-3 w-3" />
        {t('Cancel')}
      </Button>
    {:else}
      <Button kind="solid" variant="pop" size="default" onclick={onConvert} {disabled}>
        {t('Convert')}
      </Button>
    {/if}
  </div>
</footer>
