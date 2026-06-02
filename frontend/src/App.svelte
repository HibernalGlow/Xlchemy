<script lang="ts">
  import { Events } from "@wailsio/runtime";
  import { AppService } from "$lib/bindings";
  import { applyTheme, themeNames } from "$lib/theme/themes";

  import Sidebar from "$lib/components/ui/sidebar/index.svelte";
  import type { SidebarItem } from "$lib/components/ui/sidebar/index.svelte";
  import Button from "$lib/components/ui/button/index.svelte";
  import Card from "$lib/components/ui/card/index.svelte";
  import Select from "$lib/components/ui/select/index.svelte";
  import Checkbox from "$lib/components/ui/checkbox/index.svelte";
  import Slider from "$lib/components/ui/slider/index.svelte";
  import Badge from "$lib/components/ui/badge/index.svelte";
  import Progress from "$lib/components/ui/progress/index.svelte";
  import Dialog from "$lib/components/ui/dialog/index.svelte";

  import {
    FileInput,
    FileOutput,
    SlidersHorizontal,
    Settings,
    Info,
    Menu,
  } from "@lucide/svelte";

  // State
  let activeTab = $state(0);
  let sidebarCollapsed = $state(false);
  let mobileOpen = $state(false);
  let isConverting = $state(false);
  let fileItems: any[] = $state([]);
  let outputSettings: any = $state({});
  let modifySettings: any = $state({});
  let appSettings: any = $state({});
  let progress = $state({ completed: 0, total: 0, line1: '', line2: '' });
  let showProgress = $state(false);
  let exceptions: any[] = $state([]);
  let showExceptions = $state(false);
  let constants: any = $state({});
  let cpuCount = $state(4);

  // Track mobile state
  let isMobile = $state(false);
  $effect(() => {
    if (typeof window === 'undefined') return;
    const mql = window.matchMedia('(max-width: 768px)');
    const handler = (e: MediaQueryListEvent | MediaQueryList) => { isMobile = e.matches; };
    handler(mql);
    mql.addEventListener('change', handler as (e: MediaQueryListEvent) => void);
    return () => mql.removeEventListener('change', handler as (e: MediaQueryListEvent) => void);
  });

  const navItems: SidebarItem[] = [
    { label: 'Input', icon: FileInput },
    { label: 'Output', icon: FileOutput },
    { label: 'Modify', icon: SlidersHorizontal },
    { label: 'Settings', icon: Settings },
    { label: 'About', icon: Info },
  ];

  const formatOptions = ['JPEG XL', 'AVIF', 'JPEG', 'WebP', 'PNG', 'Lossless JPEG Transcoding', 'JPEG Reconstruction', 'Smallest Lossless'];

  // Load initial data
  async function init() {
    try {
      const constStr = await AppService.GetConstants();
      constants = JSON.parse(constStr);
      cpuCount = constants.cpuCount || 4;

      const settingsStr = await AppService.GetSettings();
      const settings = JSON.parse(settingsStr);
      outputSettings = settings.output;
      modifySettings = settings.modify;
      appSettings = settings.app;

      applyTheme(appSettings.theme || 'Miku');
    } catch (e) {
      console.error('Init error:', e);
    }
  }

  init();

  // Event listeners
  Events.On('conversion:progress', (data: any) => { progress = data.data; });
  Events.On('conversion:exception', (data: any) => { exceptions = [...exceptions, data.data]; });
  Events.On('conversion:finished', () => { isConverting = false; showProgress = false; if (exceptions.length > 0) showExceptions = true; });
  Events.On('conversion:canceled', () => { isConverting = false; showProgress = false; });
  Events.On('conversion:started', () => { showProgress = true; exceptions = []; });

  // Actions
  async function handleDrop(e: DragEvent) {
    e.preventDefault();
    const files = e.dataTransfer?.files;
    if (!files) return;
    const paths: string[] = [];
    for (let i = 0; i < files.length; i++) {
      const file = files[i] as any;
      if (file.path) paths.push(file.path);
    }
    if (paths.length > 0) {
      const result = await AppService.AddFiles(paths);
      fileItems = [...fileItems, ...JSON.parse(result)];
    }
  }

  async function addFiles() { /* Wails file dialog placeholder */ }
  async function clearFiles() { fileItems = []; }

  async function startConversion() {
    if (fileItems.length === 0) return;
    isConverting = true;
    try {
      await AppService.StartConversion(
        JSON.stringify(fileItems),
        JSON.stringify(outputSettings),
        JSON.stringify(modifySettings),
        JSON.stringify(appSettings),
        outputSettings.threads || cpuCount
      );
    } catch (e) {
      console.error('Conversion error:', e);
      isConverting = false;
    }
  }

  async function cancelConversion() { await AppService.CancelConversion(); }

  async function saveSettings() {
    await AppService.SaveSettings(JSON.stringify({
      output: outputSettings, modify: modifySettings, app: appSettings,
    }));
  }

  function changeTheme(name: string) {
    appSettings.theme = name;
    applyTheme(name);
    saveSettings();
  }

  // Filter state
  let activeFilters: Set<string> = $state(new Set());

  function toggleFilter(ext: string) {
    const newSet = new Set(activeFilters);
    if (newSet.has(ext)) newSet.delete(ext); else newSet.add(ext);
    activeFilters = newSet;
  }

  function getFilteredItems() {
    let items = fileItems;
    if (activeFilters.size > 0) items = items.filter(item => activeFilters.has(item.ext));
    return items;
  }
</script>

<!-- svelte-ignore a11y_no_static_element_interactions -->
<div class="flex h-screen bg-background text-foreground select-none" ondragover={(e) => e.preventDefault()} ondrop={handleDrop}>
  <!-- Mobile top bar with hamburger -->
  {#if isMobile}
    <div class="fixed top-0 left-0 right-0 z-30 flex items-center gap-3 px-4 py-2 bg-background/95 backdrop-blur-sm border-b border-border md:hidden">
      <button
        class="p-1.5 rounded-md hover:bg-muted transition-colors cursor-pointer"
        onclick={() => { mobileOpen = !mobileOpen; }}
        aria-label="Toggle navigation"
      >
        <Menu class="w-5 h-5" />
      </button>
      <span class="text-sm font-semibold">Xlchemy</span>
    </div>
  {/if}

  <Sidebar
    items={navItems}
    bind:activeIndex={activeTab}
    bind:collapsed={sidebarCollapsed}
    bind:mobileOpen={mobileOpen}
    disabled={isConverting}
  >
    {#snippet header()}
      <div class="flex items-center gap-2.5">
        <div class="w-8 h-8 rounded-lg bg-primary flex items-center justify-center text-primary-foreground font-bold text-sm shrink-0 shadow-sm">
          X
        </div>
        {#if !sidebarCollapsed || mobileOpen}
          <div class="flex flex-col min-w-0">
            <span class="text-sm font-semibold truncate">Xlchemy</span>
            <span class="text-[10px] text-muted-foreground truncate">Image Converter</span>
          </div>
        {/if}
      </div>
    {/snippet}

    {#snippet content()}
      <div class={isMobile ? "pt-12" : ""}>
        {#if activeTab === 0}
          <!-- Input -->
          <div class="flex flex-col flex-1 p-4 gap-3 h-full">
            <div class="flex items-center justify-between">
              <h2 class="text-lg font-semibold">Input</h2>
              <div class="flex gap-2 items-center">
                <Button variant="outline" size="sm" onclick={addFiles}>Add Files</Button>
                <Button variant="ghost" size="sm" onclick={clearFiles}>Clear</Button>
              </div>
            </div>

            {#if fileItems.length > 0}
              <div class="flex gap-1 items-center flex-wrap">
                {#each [...new Set(fileItems.map(f => f.ext))] as ext}
                  <button
                    class="px-2 py-0.5 text-xs rounded-md border transition-colors cursor-pointer"
                    class:bg-primary={activeFilters.has(ext)}
                    class:text-primary-foreground={activeFilters.has(ext)}
                    class:bg-secondary={!activeFilters.has(ext)}
                    onclick={() => toggleFilter(ext)}
                  >
                    .{ext}
                  </button>
                {/each}
                <span class="text-xs text-muted-foreground ml-auto">{fileItems.length} file(s)</span>
              </div>
            {/if}

            <Card class="flex-1 overflow-auto">
              <table class="w-full text-sm">
                <thead>
                  <tr class="bg-muted">
                    <th class="text-left p-2 font-semibold w-2/5">Name</th>
                    <th class="text-left p-2 font-semibold w-[15%]">Ext</th>
                    <th class="text-left p-2 font-semibold">Location</th>
                  </tr>
                </thead>
                <tbody>
                  {#each getFilteredItems() as item}
                    <tr class="border-b border-border/50 hover:bg-muted/50 transition-colors">
                      <td class="p-2">{item.name}</td>
                      <td class="p-2 text-muted-foreground">{item.ext}</td>
                      <td class="p-2 text-muted-foreground text-xs truncate max-w-[200px]">{item.dir}</td>
                    </tr>
                  {/each}
                </tbody>
              </table>
            </Card>

            <div class="flex justify-end">
              <Button onclick={startConversion} disabled={isConverting || fileItems.length === 0}>
                Convert
              </Button>
            </div>
          </div>

        {:else if activeTab === 1}
          <!-- Output -->
          <div class="flex flex-col gap-4 p-4 overflow-auto h-full">
            <h2 class="text-lg font-semibold">Output</h2>

            <Card class="p-4">
              <h3 class="text-sm font-semibold mb-3 text-muted-foreground">Format</h3>
              <div class="flex gap-3 items-center">
                <!-- svelte-ignore a11y_label_has_associated_control -->
                <label class="text-sm">Format:</label>
                <Select options={formatOptions} bind:bindValue={outputSettings.format} class="w-48" />
              </div>
              {#if ['JPEG XL', 'AVIF', 'WebP'].includes(outputSettings.format)}
                <div class="mt-2">
                  <Checkbox bind:checked={outputSettings.lossless} label="Lossless" />
                </div>
              {/if}
              {#if !outputSettings.lossless && ['JPEG XL', 'AVIF', 'JPEG', 'WebP'].includes(outputSettings.format)}
                <div class="flex gap-3 items-center mt-3">
                  <!-- svelte-ignore a11y_label_has_associated_control -->
                  <label class="text-sm w-16">Quality:</label>
                  <Slider bind:value={outputSettings.quality} min={1} max={100} class="flex-1" />
                  <input type="number" class="w-14 h-8 rounded-md border border-input bg-background px-2 text-sm text-center" bind:value={outputSettings.quality} min={1} max={100} />
                </div>
              {/if}
              {#if ['JPEG XL', 'AVIF', 'WebP'].includes(outputSettings.format) && !outputSettings.lossless}
                <div class="flex gap-3 items-center mt-3">
                  <!-- svelte-ignore a11y_label_has_associated_control -->
                  <label class="text-sm w-16">Effort:</label>
                  <Slider bind:value={outputSettings.effort} min={1} max={9} class="flex-1" />
                  <input type="number" class="w-14 h-8 rounded-md border border-input bg-background px-2 text-sm text-center" bind:value={outputSettings.effort} min={1} max={9} />
                </div>
              {/if}
            </Card>

            <Card class="p-4">
              <h3 class="text-sm font-semibold mb-3 text-muted-foreground">Conversion</h3>
              <div class="flex gap-3 items-center">
                <!-- svelte-ignore a11y_label_has_associated_control -->
                <label class="text-sm w-16">Threads:</label>
                <Slider bind:value={outputSettings.threads} min={1} max={cpuCount} class="flex-1" />
                <input type="number" class="w-14 h-8 rounded-md border border-input bg-background px-2 text-sm text-center" bind:value={outputSettings.threads} min={1} max={cpuCount} />
              </div>
              <div class="flex gap-3 items-center mt-3">
                <!-- svelte-ignore a11y_label_has_associated_control -->
                <label class="text-sm">If file exists:</label>
                <Select options={['Replace', 'Skip', 'Rename']} bind:bindValue={outputSettings.if_file_exists} class="w-36" />
              </div>
            </Card>

            <Card class="p-4">
              <h3 class="text-sm font-semibold mb-3 text-muted-foreground">Save To</h3>
              <div class="flex gap-4 items-center">
                <label class="flex items-center gap-2 text-sm cursor-pointer">
                  <input type="radio" name="output_dir" checked={!outputSettings.custom_output_dir} onchange={() => outputSettings.custom_output_dir = false} class="accent-primary" />
                  Next to source
                </label>
                <label class="flex items-center gap-2 text-sm cursor-pointer">
                  <input type="radio" name="output_dir" checked={outputSettings.custom_output_dir} onchange={() => outputSettings.custom_output_dir = true} class="accent-primary" />
                  Custom folder
                </label>
              </div>
              {#if outputSettings.custom_output_dir}
                <input type="text" class="mt-2 w-full h-8 rounded-md border border-input bg-background px-3 text-sm" bind:value={outputSettings.custom_output_dir_path} placeholder="Output path..." />
              {/if}
              <div class="flex gap-4 mt-2">
                <Checkbox bind:checked={outputSettings.keep_dir_struct} label="Keep folder structure" />
                <Checkbox bind:checked={outputSettings.delete_original} label="Delete original" />
              </div>
            </Card>
          </div>

        {:else if activeTab === 2}
          <!-- Modify -->
          <div class="flex flex-col gap-4 p-4 overflow-auto h-full">
            <h2 class="text-lg font-semibold">Modify</h2>

            <Card class="p-4">
              <h3 class="text-sm font-semibold mb-3 text-muted-foreground">Downscaling</h3>
              <Checkbox bind:checked={modifySettings.downscaling.enabled} label="Enable downscaling" />
              {#if modifySettings.downscaling.enabled}
                <div class="flex gap-3 items-center mt-3">
                  <!-- svelte-ignore a11y_label_has_associated_control -->
                  <label class="text-sm">Mode:</label>
                  <Select options={['Resolution', 'Percent', 'File Size', 'Shortest Side', 'Longest Side', 'Megapixels']} bind:bindValue={modifySettings.downscaling.mode} class="w-40" />
                </div>
                {#if modifySettings.downscaling.mode === 'Resolution'}
                  <div class="flex gap-3 items-center mt-2">
                    <!-- svelte-ignore a11y_label_has_associated_control -->
                    <label class="text-sm">Width:</label>
                    <input type="number" class="w-20 h-8 rounded-md border border-input bg-background px-2 text-sm" bind:value={modifySettings.downscaling.width} />
                    <!-- svelte-ignore a11y_label_has_associated_control -->
                    <label class="text-sm">Height:</label>
                    <input type="number" class="w-20 h-8 rounded-md border border-input bg-background px-2 text-sm" bind:value={modifySettings.downscaling.height} />
                  </div>
                {:else if modifySettings.downscaling.mode === 'Percent'}
                  <div class="flex gap-3 items-center mt-2">
                    <!-- svelte-ignore a11y_label_has_associated_control -->
                    <label class="text-sm">Percent:</label>
                    <input type="number" class="w-20 h-8 rounded-md border border-input bg-background px-2 text-sm" bind:value={modifySettings.downscaling.percent} min={1} max={100} />
                  </div>
                {:else if modifySettings.downscaling.mode === 'Megapixels'}
                  <div class="flex gap-3 items-center mt-2">
                    <!-- svelte-ignore a11y_label_has_associated_control -->
                    <label class="text-sm">Megapixels:</label>
                    <input type="number" class="w-20 h-8 rounded-md border border-input bg-background px-2 text-sm" bind:value={modifySettings.downscaling.megapixels} min={0.1} step={0.1} />
                  </div>
                {/if}
              {/if}
            </Card>

            <Card class="p-4">
              <h3 class="text-sm font-semibold mb-3 text-muted-foreground">Misc</h3>
              <div class="flex gap-3 items-center">
                <!-- svelte-ignore a11y_label_has_associated_control -->
                <label class="text-sm">Metadata:</label>
                <Select options={['Encoder - Wipe', 'Encoder - Preserve', 'ExifTool - Wipe', 'ExifTool - Preserve', 'ExifTool - Unsafe Wipe', 'ExifTool - Custom']} bind:bindValue={modifySettings.misc.keep_metadata} class="w-48" />
              </div>
              <div class="mt-2">
                <Checkbox bind:checked={modifySettings.misc.keep_timestamps} label="Keep timestamps" />
              </div>
            </Card>
          </div>

        {:else if activeTab === 3}
          <!-- Settings -->
          <div class="flex flex-col gap-4 p-4 overflow-auto h-full">
            <h2 class="text-lg font-semibold">Settings</h2>

            <Card class="p-4">
              <h3 class="text-sm font-semibold mb-3 text-muted-foreground">Appearance</h3>
              <div class="flex gap-3 items-center">
                <!-- svelte-ignore a11y_label_has_associated_control -->
                <label class="text-sm">Theme:</label>
                <Select options={themeNames} bind:bindValue={appSettings.theme} onchange={changeTheme} class="w-40" />
              </div>
            </Card>

            <Card class="p-4">
              <h3 class="text-sm font-semibold mb-3 text-muted-foreground">Encoders</h3>
              <div class="flex gap-3 items-center">
                <!-- svelte-ignore a11y_label_has_associated_control -->
                <label class="text-sm">JPEG Encoder:</label>
                <Select options={['JPEGLI', 'libjpeg']} bind:bindValue={appSettings.jpg_encoder} class="w-36" />
              </div>
              <div class="flex gap-3 items-center mt-2">
                <!-- svelte-ignore a11y_label_has_associated_control -->
                <label class="text-sm">AVIF Encoder:</label>
                <Select options={['AOM AV1', 'SVT-AV1-PSY', 'slimg']} bind:bindValue={appSettings.avif_encoder} class="w-36" />
              </div>
            </Card>

            <Card class="p-4">
              <h3 class="text-sm font-semibold mb-3 text-muted-foreground">Behavior</h3>
              <div class="flex flex-col gap-2">
                <Checkbox bind:checked={appSettings.play_sound_on_finish} label="Play sound on finish" />
                <Checkbox bind:checked={appSettings.jxl_auto_lossless_jpeg} label="Auto lossless JPEG transcode for JXL" />
                <Checkbox bind:checked={appSettings.keep_if_larger} label="Keep original if result is larger" />
                <Checkbox bind:checked={appSettings.copy_if_larger} label="Copy original if result is larger" />
              </div>
            </Card>

            <Card class="p-4">
              <h3 class="text-sm font-semibold mb-3 text-muted-foreground">Processing</h3>
              <div class="flex gap-3 items-center">
                <!-- svelte-ignore a11y_label_has_associated_control -->
                <label class="text-sm">Processing order:</label>
                <Select options={['Original', 'Random', 'Sequential', 'Path Ascending', 'Path Descending', 'Size Ascending', 'Size Descending']} bind:bindValue={appSettings.processing_order} class="w-44" />
              </div>
            </Card>
          </div>

        {:else if activeTab === 4}
          <!-- About -->
          <div class="flex flex-col items-center justify-center p-6 gap-3 h-full">
            <div class="w-16 h-16 rounded-2xl bg-primary flex items-center justify-center text-primary-foreground font-bold text-2xl shadow-lg mb-2">
              X
            </div>
            <h1 class="text-3xl font-light">Xlchemy</h1>
            <Badge variant="secondary">v{constants.version || '1.2.6'}</Badge>
            <p class="text-muted-foreground">High-performance image converter</p>
            <p class="text-xs text-muted-foreground mt-2">Built with Wails 3 + Svelte + Go</p>
            <div class="flex gap-2 mt-3">
              <Button variant="outline" size="sm" onclick={() => window.open('https://codepoems.eu', '_blank')}>Website</Button>
              <Button variant="outline" size="sm" onclick={() => window.open('https://github.com/nicjacek/xlchemy', '_blank')}>Source</Button>
            </div>
          </div>
        {/if}
      </div>
    {/snippet}
  </Sidebar>

  <!-- Progress Dialog -->
  <Dialog bind:open={showProgress} title="Converting..." onclose={cancelConversion}>
    <Progress value={progress.completed} max={progress.total || 1} class="h-5" />
    <div class="flex justify-between mt-2 text-sm">
      <span>{progress.completed} / {progress.total}</span>
      <span class="text-muted-foreground">{progress.line2}</span>
    </div>
    <p class="mt-2 text-sm truncate">{progress.line1}</p>
    {#snippet footer()}
      <Button variant="outline" onclick={cancelConversion}>Cancel</Button>
    {/snippet}
  </Dialog>

  <!-- Exception Dialog -->
  <Dialog bind:open={showExceptions} title="Exceptions ({exceptions.length})">
    <div class="overflow-auto max-h-[300px] rounded-md border">
      <table class="w-full text-sm">
        <thead>
          <tr class="bg-muted">
            <th class="text-left p-2 font-semibold">ID</th>
            <th class="text-left p-2 font-semibold">Message</th>
          </tr>
        </thead>
        <tbody>
          {#each exceptions as exc}
            <tr class="border-b border-border/50">
              <td class="p-2">{exc.id}</td>
              <td class="p-2 text-xs text-muted-foreground">{exc.msg}</td>
            </tr>
          {/each}
        </tbody>
      </table>
    </div>
    {#snippet footer()}
      <Button variant="outline" onclick={() => { showExceptions = false; exceptions = []; }}>Close</Button>
    {/snippet}
  </Dialog>
</div>
