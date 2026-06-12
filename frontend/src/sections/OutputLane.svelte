<script lang="ts">
  import Checkbox from '$lib/components/ui/Checkbox.svelte';
  import Input from '$lib/components/ui/Input.svelte';
  import NumberInput from '$lib/components/ui/NumberInput.svelte';
  import Select from '$lib/components/ui/Select.svelte';
  import LaneCard from '$lib/layout/LaneCard.svelte';
  import { FolderDot, FolderOpen } from '@lucide/svelte';
  import { appState } from '$lib/state/app.svelte';
  import { _ } from 'svelte-i18n';

  const formatOptions = [
    'JPEG XL', 'AVIF', 'JPEG', 'WebP', 'PNG', 'Lossless JPEG Transcoding', 'JPEG Reconstruction'
  ].map((value) => ({ value, label: value }));
  const replaceOptions = [
    { value: 'Replace', label: $_('output.replace') },
    { value: 'Skip', label: $_('output.skip') },
    { value: 'Rename', label: $_('output.rename') },
  ];
  const normalizeOptions = [
    { value: 'On Fail', label: $_('output.on_fail') },
    { value: 'Always', label: $_('output.always') },
  ];

  const fmt = $derived(appState.outputSettings.format || 'JPEG XL');
  const isJxl = $derived(fmt === 'JPEG XL');
  const isAvif = $derived(fmt === 'AVIF');
  const isWebp = $derived(fmt === 'WebP');
  const supportsLossless = $derived(isJxl || isAvif || isWebp);
  const supportsQuality = $derived(!appState.outputSettings.lossless && (isJxl || isAvif || fmt === 'JPEG' || isWebp));
  const supportsEffort = $derived(supportsLossless && !appState.outputSettings.lossless);
</script>

<div class="flex flex-col gap-2">
  <LaneCard id="output-format" header={$_('output.format')}>
    <div class="flex flex-col gap-3">
      <Select value={fmt} options={formatOptions} onChange={(v) => appState.updateOutput('format', v)} />

      {#if supportsLossless}
        <label class="flex items-center gap-2 text-[11px] text-text-1">
          <Checkbox checked={!!appState.outputSettings.lossless} onCheckedChange={(v) => appState.updateOutput('lossless', v)} />
          {$_('output.lossless')}
        </label>
      {/if}

      {#if supportsQuality}
        <NumberInput label={$_('output.quality')} value={appState.outputSettings.quality || 80} onChange={(v) => appState.updateOutput('quality', v)} min={1} max={100} />
      {/if}

      {#if supportsEffort}
        <NumberInput label={$_('output.effort')} value={appState.outputSettings.effort || 7} onChange={(v) => appState.updateOutput('effort', v)} min={1} max={10} />
      {/if}

      {#if isJxl && !appState.outputSettings.lossless}
        <label class="flex items-center gap-2 text-[11px] text-text-1">
          <Checkbox checked={!!appState.outputSettings.jxl_modular} onCheckedChange={(v) => appState.updateOutput('jxl_modular', v)} />
          {$_('settings.jxl_lossy_modular')}
        </label>
      {/if}

      {#if isJxl}
        <label class="flex items-center gap-2 text-[11px] text-text-1">
          <Checkbox checked={!!appState.outputSettings.jxl_png_fallback} onCheckedChange={(v) => appState.updateOutput('jxl_png_fallback', v)} />
          {$_('output.png_fallback')}
        </label>
        <label class="flex items-center gap-2 text-[11px] text-text-1">
          <Checkbox checked={!!appState.outputSettings.jxl_verify} onCheckedChange={(v) => appState.updateOutput('jxl_verify', v)} />
          {$_('output.verify')}
        </label>
        <label class="flex items-center gap-2 text-[11px] text-text-1">
          <Checkbox checked={!!appState.outputSettings.jxl_normalize_enable} onCheckedChange={(v) => appState.updateOutput('jxl_normalize_enable', v)} />
          {$_('output.normalize')}
        </label>
        {#if appState.outputSettings.jxl_normalize_enable}
          <Select value={appState.outputSettings.jxl_normalize_when || 'On Fail'} options={normalizeOptions} onChange={(v) => appState.updateOutput('jxl_normalize_when', v)} />
        {/if}
      {/if}

      {#if supportsEffort}
        <label class="flex items-center gap-2 text-[11px] text-text-1">
          <Checkbox checked={!!appState.outputSettings.intelligent_effort} onCheckedChange={(v) => appState.updateOutput('intelligent_effort', v)} />
          {$_('output.intelligent_effort')}
        </label>
      {/if}
    </div>
  </LaneCard>

  <LaneCard id="output-conversion" header={$_('output.conversion')}>
    <div class="flex flex-col gap-3">
      <NumberInput label={$_('output.threads')} value={appState.outputSettings.threads || appState.cpuCount} onChange={(v) => appState.updateOutput('threads', v)} min={1} max={appState.cpuCount} />
      <Select value={appState.outputSettings.if_file_exists || 'Replace'} options={replaceOptions} onChange={(v) => appState.updateOutput('if_file_exists', v)} />
    </div>
  </LaneCard>

  <LaneCard id="output-save" header={$_('output.save_to')}>
    <div class="flex flex-col gap-3">
      <div class="flex gap-2 flex-wrap">
        <button type="button" class={`flex items-center gap-1 px-2 py-1 rounded-gb text-xs border ${!appState.outputSettings.custom_output_dir ? 'border-fill-pop bg-fill-pop/10 text-fill-pop' : 'border-border-2 text-text-2'}`} onclick={() => appState.updateOutput('custom_output_dir', false)}><FolderDot class="w-3 h-3" />{$_('output.next_to_source')}</button>
        <button type="button" class={`flex items-center gap-1 px-2 py-1 rounded-gb text-xs border ${appState.outputSettings.custom_output_dir ? 'border-fill-pop bg-fill-pop/10 text-fill-pop' : 'border-border-2 text-text-2'}`} onclick={() => appState.updateOutput('custom_output_dir', true)}><FolderOpen class="w-3 h-3" />{$_('output.custom_folder')}</button>
      </div>

      {#if appState.outputSettings.custom_output_dir}
        <Input value={appState.outputSettings.custom_output_dir_path || ''} placeholder={$_('output.output_path')} oninput={(e) => appState.updateOutput('custom_output_dir_path', (e.currentTarget as HTMLInputElement).value)} />
      {/if}

      <label class="flex items-center gap-2 text-[11px] text-text-1">
        <Checkbox checked={!!appState.outputSettings.keep_dir_struct} onCheckedChange={(v) => appState.updateOutput('keep_dir_struct', v)} />
        {$_('output.keep_folder_structure')}
      </label>

      <label class="flex items-center gap-2 text-[11px] text-text-1">
        <Checkbox checked={!!appState.outputSettings.delete_original} onCheckedChange={(v) => appState.updateOutput('delete_original', v)} />
        {$_('output.delete_original')}
      </label>

      {#if appState.outputSettings.delete_original}
        <Select value={appState.outputSettings.delete_original_mode || 'To Trash'} options={[{ value: 'To Trash', label: $_('output.to_trash') }, { value: 'Permanently', label: $_('output.permanently') }]} onChange={(v) => appState.updateOutput('delete_original_mode', v)} />
      {/if}
    </div>
  </LaneCard>
</div>
