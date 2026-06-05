<script lang="ts">
  import { FileImage } from '@lucide/svelte';
  import { cn } from '$lib/utils/cn';

  interface Props {
    path: string;
    name?: string;
    enabled?: boolean;
    class?: string;
    iconClass?: string;
    imageClass?: string;
  }

  let {
    path,
    name = '',
    enabled = false,
    class: className = '',
    iconClass = 'h-4 w-4 text-text-2',
    imageClass = 'h-full w-full object-cover',
  }: Props = $props();

  let failed = $state(false);

  function isPywebviewHost(): boolean {
    return typeof window !== 'undefined' && !!window.pywebview?.api;
  }

  function toFileUrl(filePath: string): string {
    const normalized = filePath.replace(/\\/g, '/');
    const withLeadingSlash = /^[a-zA-Z]:\//.test(normalized)
      ? `/${normalized}`
      : normalized;
    return `file://${encodeURI(withLeadingSlash)}`;
  }

  function toPreviewUrl(filePath: string): string {
    if (!filePath) return '';
    if (isPywebviewHost()) {
      return toFileUrl(filePath);
    }
    const query = new URLSearchParams({ path: filePath });
    return `/local-preview?${query.toString()}`;
  }

  const source = $derived(enabled && !failed ? toPreviewUrl(path) : '');

  function handleError() {
    failed = true;
  }

  $effect(() => {
    path;
    enabled;
    failed = false;
  });
</script>

<div
  class={cn(
    'overflow-hidden rounded-[inherit] bg-[color-mix(in_oklch,var(--bg-1)_76%,transparent)]',
    className,
  )}
>
  {#if enabled && !failed && source}
    <img
      src={source}
      alt={name}
      class={imageClass}
      loading="lazy"
      decoding="async"
      draggable="false"
      onerror={handleError}
    />
  {:else}
    <div class="flex h-full w-full items-center justify-center">
      <FileImage class={iconClass} />
    </div>
  {/if}
</div>
