<script lang="ts">
  import { Events } from "@wailsio/runtime";
  import { AppService } from "./lib/bindings";
  import { applyTheme, themeNames } from "./lib/theme/themes";

  // State
  let activeTab = $state(0);
  let isConverting = $state(false);

  // File items
  let fileItems: any[] = $state([]);

  // Settings (loaded from backend)
  let outputSettings: any = $state({});
  let modifySettings: any = $state({});
  let appSettings: any = $state({});

  // Progress
  let progress = $state({ completed: 0, total: 0, line1: '', line2: '' });
  let showProgress = $state(false);
  let exceptions: any[] = $state([]);
  let showExceptions = $state(false);

  // Constants
  let constants: any = $state({});
  let cpuCount = $state(4);

  const tabNames = ['Input', 'Output', 'Modify', 'Settings', 'About'];

  // Formats
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
  Events.On('conversion:progress', (data: any) => {
    progress = data.data;
  });

  Events.On('conversion:exception', (data: any) => {
    exceptions = [...exceptions, data.data];
  });

  Events.On('conversion:finished', () => {
    isConverting = false;
    showProgress = false;
    if (exceptions.length > 0) {
      showExceptions = true;
    }
  });

  Events.On('conversion:canceled', () => {
    isConverting = false;
    showProgress = false;
  });

  Events.On('conversion:started', () => {
    showProgress = true;
    exceptions = [];
  });

  // Actions
  async function handleDrop(e: DragEvent) {
    e.preventDefault();
    const files = e.dataTransfer?.files;
    if (!files) return;

    const paths: string[] = [];
    for (let i = 0; i < files.length; i++) {
      const file = files[i] as any;
      if (file.path) {
        paths.push(file.path);
      }
    }

    if (paths.length > 0) {
      const result = await AppService.AddFiles(paths);
      const items = JSON.parse(result);
      fileItems = [...fileItems, ...items];
    }
  }

  async function addFiles() {
    // Wails file dialog would be called here
    // For now, this is a placeholder
  }

  async function clearFiles() {
    fileItems = [];
  }

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

  async function cancelConversion() {
    await AppService.CancelConversion();
  }

  async function saveSettings() {
    await AppService.SaveSettings(JSON.stringify({
      output: outputSettings,
      modify: modifySettings,
      app: appSettings,
    }));
  }

  function changeTheme(name: string) {
    appSettings.theme = name;
    applyTheme(name);
    saveSettings();
  }

  // Filter state
  let activeFilters: Set<string> = $state(new Set());
  let sortMode = $state('Name');

  function toggleFilter(ext: string) {
    const newSet = new Set(activeFilters);
    if (newSet.has(ext)) {
      newSet.delete(ext);
    } else {
      newSet.add(ext);
    }
    activeFilters = newSet;
  }

  function getFilteredItems() {
    let items = fileItems;
    if (activeFilters.size > 0) {
      items = items.filter(item => activeFilters.has(item.ext));
    }
    return items;
  }
</script>

<div class="app" ondragover={(e) => e.preventDefault()} ondrop={handleDrop}>
  <!-- Tab Bar -->
  <nav class="tab-bar">
    {#each tabNames as name, i}
      <button
        class="tab"
        class:active={activeTab === i}
        disabled={isConverting}
        onclick={() => activeTab = i}
      >
        {name}
      </button>
    {/each}
  </nav>

  <!-- Tab Content -->
  <div class="tab-content flex-1 flex flex-col overflow-auto">
    {#if activeTab === 0}
      <!-- Input Tab -->
      <div class="flex flex-col flex-1 p-2 gap-2">
        <!-- Format filter bar -->
        {#if fileItems.length > 0}
          <div class="flex gap-1 items-center" style="flex-wrap: wrap;">
            {#each [...new Set(fileItems.map(f => f.ext))] as ext}
              <button
                class="btn"
                style="padding: 2px 8px; font-size: 10px;"
                style:background-color={activeFilters.has(ext) ? 'var(--color-bg-selected)' : 'transparent'}
                onclick={() => toggleFilter(ext)}
              >
                .{ext}
              </button>
            {/each}
          </div>
        {/if}

        <!-- File list -->
        <div class="file-list">
          <table>
            <thead>
              <tr>
                <th style="width: 40%;">Name</th>
                <th style="width: 15%;">Extension</th>
                <th style="width: 45%;">Location</th>
              </tr>
            </thead>
            <tbody>
              {#each getFilteredItems() as item}
                <tr>
                  <td>{item.name}</td>
                  <td>{item.ext}</td>
                  <td>{item.dir}</td>
                </tr>
              {/each}
            </tbody>
          </table>
        </div>

        <!-- Button row -->
        <div class="flex gap-2 items-center">
          <button class="btn" onclick={addFiles}>Add Files</button>
          <button class="btn" onclick={clearFiles}>Clear</button>
          <div class="flex-1"></div>
          <span class="text-sm text-disabled">{fileItems.length} file(s)</span>
          <button class="btn primary" onclick={startConversion} disabled={isConverting || fileItems.length === 0}>
            Convert
          </button>
        </div>
      </div>

    {:else if activeTab === 1}
      <!-- Output Tab -->
      <div class="flex flex-col gap-2 p-3 overflow-auto">
        <!-- Format -->
        <div class="group-box">
          <span class="group-title">Format</span>
          <div class="flex gap-2 items-center">
            <label>Format / Mode:</label>
            <select class="select" bind:value={outputSettings.format}>
              {#each formatOptions as fmt}
                <option value={fmt}>{fmt}</option>
              {/each}
            </select>
          </div>

          {#if outputSettings.format === 'JPEG XL' || outputSettings.format === 'AVIF' || outputSettings.format === 'WebP'}
            <div class="flex gap-2 items-center mt-2">
              <label class="checkbox">
                <input type="checkbox" bind:checked={outputSettings.lossless} />
                Lossless
              </label>
            </div>
          {/if}

          {#if !outputSettings.lossless && ['JPEG XL', 'AVIF', 'JPEG', 'WebP'].includes(outputSettings.format)}
            <div class="flex gap-2 items-center mt-2">
              <label>Quality:</label>
              <input type="range" class="slider" min="1" max="100" bind:value={outputSettings.quality} style="width: 150px;" />
              <input type="number" class="spinbox" bind:value={outputSettings.quality} min="1" max="100" style="width: 50px;" />
            </div>
          {/if}

          {#if ['JPEG XL', 'AVIF', 'WebP'].includes(outputSettings.format) && !outputSettings.lossless}
            <div class="flex gap-2 items-center mt-2">
              <label>Effort:</label>
              <input type="range" class="slider" min="1" max="9" bind:value={outputSettings.effort} style="width: 150px;" />
              <input type="number" class="spinbox" bind:value={outputSettings.effort} min="1" max="9" style="width: 50px;" />
            </div>
          {/if}
        </div>

        <!-- Threads -->
        <div class="group-box">
          <span class="group-title">Conversion</span>
          <div class="flex gap-2 items-center">
            <label>Threads:</label>
            <input type="range" class="slider" min="1" max={cpuCount} bind:value={outputSettings.threads} style="width: 150px;" />
            <input type="number" class="spinbox" bind:value={outputSettings.threads} min="1" max={cpuCount} style="width: 50px;" />
          </div>
          <div class="flex gap-2 items-center mt-2">
            <label>If file exists:</label>
            <select class="select" bind:value={outputSettings.if_file_exists}>
              <option value="Replace">Replace</option>
              <option value="Skip">Skip</option>
              <option value="Rename">Rename</option>
            </select>
          </div>
        </div>

        <!-- Output directory -->
        <div class="group-box">
          <span class="group-title">Save To</span>
          <div class="flex gap-2 items-center">
            <label class="radio">
              <input type="radio" name="output_dir" checked={!outputSettings.custom_output_dir}
                onchange={() => outputSettings.custom_output_dir = false} />
              Next to source
            </label>
            <label class="radio">
              <input type="radio" name="output_dir" checked={outputSettings.custom_output_dir}
                onchange={() => outputSettings.custom_output_dir = true} />
              Custom folder
            </label>
          </div>
          {#if outputSettings.custom_output_dir}
            <input type="text" class="text-input w-full mt-2" bind:value={outputSettings.custom_output_dir_path} placeholder="Output path..." />
          {/if}
          <div class="flex gap-2 mt-2">
            <label class="checkbox">
              <input type="checkbox" bind:checked={outputSettings.keep_dir_struct} />
              Keep folder structure
            </label>
            <label class="checkbox">
              <input type="checkbox" bind:checked={outputSettings.delete_original} />
              Delete original
            </label>
          </div>
        </div>
      </div>

    {:else if activeTab === 2}
      <!-- Modify Tab -->
      <div class="flex flex-col gap-2 p-3 overflow-auto">
        <div class="group-box">
          <span class="group-title">Downscaling</span>
          <label class="checkbox">
            <input type="checkbox" bind:checked={modifySettings.downscaling.enabled} />
            Enable downscaling
          </label>
          {#if modifySettings.downscaling.enabled}
            <div class="flex gap-2 items-center mt-2">
              <label>Mode:</label>
              <select class="select" bind:value={modifySettings.downscaling.mode}>
                <option value="Resolution">Resolution</option>
                <option value="Percent">Percent</option>
                <option value="File Size">File Size</option>
                <option value="Shortest Side">Shortest Side</option>
                <option value="Longest Side">Longest Side</option>
                <option value="Megapixels">Megapixels</option>
              </select>
            </div>
            {#if modifySettings.downscaling.mode === 'Resolution'}
              <div class="flex gap-2 items-center mt-2">
                <label>Width:</label>
                <input type="number" class="spinbox" bind:value={modifySettings.downscaling.width} />
                <label>Height:</label>
                <input type="number" class="spinbox" bind:value={modifySettings.downscaling.height} />
              </div>
            {:else if modifySettings.downscaling.mode === 'Percent'}
              <div class="flex gap-2 items-center mt-2">
                <label>Percent:</label>
                <input type="number" class="spinbox" bind:value={modifySettings.downscaling.percent} min="1" max="100" />
              </div>
            {:else if modifySettings.downscaling.mode === 'Megapixels'}
              <div class="flex gap-2 items-center mt-2">
                <label>Megapixels:</label>
                <input type="number" class="spinbox" bind:value={modifySettings.downscaling.megapixels} min="0.1" step="0.1" />
              </div>
            {/if}
          {/if}
        </div>

        <div class="group-box">
          <span class="group-title">Misc</span>
          <div class="flex gap-2 items-center">
            <label>Metadata:</label>
            <select class="select" bind:value={modifySettings.misc.keep_metadata}>
              <option value="Encoder - Wipe">Encoder - Wipe</option>
              <option value="Encoder - Preserve">Encoder - Preserve</option>
              <option value="ExifTool - Wipe">ExifTool - Wipe</option>
              <option value="ExifTool - Preserve">ExifTool - Preserve</option>
              <option value="ExifTool - Unsafe Wipe">ExifTool - Unsafe Wipe</option>
              <option value="ExifTool - Custom">ExifTool - Custom</option>
            </select>
          </div>
          <div class="mt-2">
            <label class="checkbox">
              <input type="checkbox" bind:checked={modifySettings.misc.keep_timestamps} />
              Keep timestamps
            </label>
          </div>
        </div>
      </div>

    {:else if activeTab === 3}
      <!-- Settings Tab -->
      <div class="flex flex-col gap-2 p-3 overflow-auto">
        <div class="group-box">
          <span class="group-title">Appearance</span>
          <div class="flex gap-2 items-center">
            <label>Theme:</label>
            <select class="select" value={appSettings.theme} onchange={(e) => changeTheme((e.target as HTMLSelectElement).value)}>
              {#each themeNames as name}
                <option value={name}>{name}</option>
              {/each}
            </select>
          </div>
        </div>

        <div class="group-box">
          <span class="group-title">Encoders</span>
          <div class="flex gap-2 items-center">
            <label>JPEG Encoder:</label>
            <select class="select" bind:value={appSettings.jpg_encoder}>
              <option value="JPEGLI">JPEGLI</option>
              <option value="libjpeg">libjpeg</option>
            </select>
          </div>
          <div class="flex gap-2 items-center mt-2">
            <label>AVIF Encoder:</label>
            <select class="select" bind:value={appSettings.avif_encoder}>
              <option value="AOM AV1">AOM AV1</option>
              <option value="SVT-AV1-PSY">SVT-AV1-PSY</option>
              <option value="slimg">slimg</option>
            </select>
          </div>
        </div>

        <div class="group-box">
          <span class="group-title">Behavior</span>
          <label class="checkbox">
            <input type="checkbox" bind:checked={appSettings.play_sound_on_finish} />
            Play sound on finish
          </label>
          <label class="checkbox mt-2" style="display: flex;">
            <input type="checkbox" bind:checked={appSettings.jxl_auto_lossless_jpeg} />
            Auto lossless JPEG transcode for JXL
          </label>
          <label class="checkbox mt-2" style="display: flex;">
            <input type="checkbox" bind:checked={appSettings.keep_if_larger} />
            Keep original if result is larger
          </label>
          <label class="checkbox mt-2" style="display: flex;">
            <input type="checkbox" bind:checked={appSettings.copy_if_larger} />
            Copy original if result is larger
          </label>
        </div>

        <div class="group-box">
          <span class="group-title">Processing</span>
          <div class="flex gap-2 items-center">
            <label>Processing order:</label>
            <select class="select" bind:value={appSettings.processing_order}>
              <option value="Original">Original</option>
              <option value="Random">Random</option>
              <option value="Sequential">Sequential</option>
              <option value="Path Ascending">Path Ascending</option>
              <option value="Path Descending">Path Descending</option>
              <option value="Size Ascending">Size Ascending</option>
              <option value="Size Descending">Size Descending</option>
            </select>
          </div>
        </div>
      </div>

    {:else if activeTab === 4}
      <!-- About Tab -->
      <div class="flex flex-col items-center p-3 gap-2" style="justify-content: center;">
        <h1 style="font-size: 30px; font-weight: 300;">Xlchemy</h1>
        <p style="font-size: 13px; font-weight: 700;">v{constants.version || '1.2.6'}</p>
        <p class="text-disabled">High-performance image converter</p>
        <p class="text-sm text-disabled mt-2">Built with Wails 3 + Svelte + Go</p>
        <div class="flex gap-2 mt-2">
          <a href="https://codepoems.eu" target="_blank" class="btn">Website</a>
          <a href="https://github.com/nicjacek/xlchemy" target="_blank" class="btn">Source</a>
        </div>
      </div>
    {/if}
  </div>

  <!-- Progress Dialog -->
  {#if showProgress}
    <div class="modal-overlay">
      <div class="modal" style="min-width: 450px;">
        <h2>Converting...</h2>
        <div class="progress-bar mt-2">
          <div class="progress-fill" style="width: {progress.total > 0 ? (progress.completed / progress.total * 100) : 0}%"></div>
          <div class="progress-text">{progress.completed} / {progress.total}</div>
        </div>
        <p class="mt-2 text-sm">{progress.line1}</p>
        <p class="text-sm text-disabled">{progress.line2}</p>
        <div class="flex gap-2 mt-2" style="justify-content: flex-end;">
          <button class="btn" onclick={cancelConversion}>Cancel</button>
        </div>
      </div>
    </div>
  {/if}

  <!-- Exception View -->
  {#if showExceptions}
    <div class="modal-overlay">
      <div class="modal">
        <h2>Exceptions ({exceptions.length})</h2>
        <div class="overflow-auto" style="max-height: 300px;">
          <table style="width: 100%;">
            <thead>
              <tr>
                <th style="background: var(--color-border); padding: 4px;">ID</th>
                <th style="background: var(--color-border); padding: 4px;">Message</th>
              </tr>
            </thead>
            <tbody>
              {#each exceptions as exc}
                <tr>
                  <td style="padding: 4px;">{exc.id}</td>
                  <td style="padding: 4px; font-size: 11px;">{exc.msg}</td>
                </tr>
              {/each}
            </tbody>
          </table>
        </div>
        <div class="flex gap-2 mt-2" style="justify-content: flex-end;">
          <button class="btn" onclick={() => { showExceptions = false; exceptions = []; }}>Close</button>
        </div>
      </div>
    </div>
  {/if}
</div>

<style>
  .app {
    display: flex;
    flex-direction: column;
    height: 100vh;
    background: var(--color-canvas);
    color: var(--color-font);
    user-select: none;
  }

  .tab-content {
    min-height: 0;
  }
</style>
