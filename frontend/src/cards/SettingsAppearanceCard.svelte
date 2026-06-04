<script lang="ts">
  import Select from '$lib/components/ui/Select.svelte';
  import LaneCard from '$lib/layout/LaneCard.svelte';
  import ThemePanel from '$lib/views/ThemePanel.svelte';
  import { appState } from '$lib/state/app.svelte';
  import type { LaneId } from '$lib/cards/definitions';

  interface Props { laneId: LaneId }
  let { laneId }: Props = $props();

  const languageOptions = [
    { value: 'en', label: 'English' },
    { value: 'zh', label: '中文' },
  ];
</script>

<LaneCard id="settings-appearance" laneId={laneId} movable header="Appearance">
  <div class="flex flex-col gap-3">
    <Select value={appState.currentLang} options={languageOptions} onChange={(v) => appState.changeLanguage(v)} />
    <ThemePanel currentThemeName={appState.appSettings.theme || 'Miku'} onThemeChange={(name) => appState.changeTheme(name)} onThemeModeChange={(mode) => appState.changeThemeMode(mode)} />
  </div>
</LaneCard>
