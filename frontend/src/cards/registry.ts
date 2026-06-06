import type { Component } from 'svelte';
import type { CardId, LaneId } from '$lib/cards/definitions';
import AboutInfoCard from '$lib/cards/AboutInfoCard.svelte';
import InputFilesCard from '$lib/cards/InputFilesCard.svelte';
import InputFilterCard from '$lib/cards/InputFilterCard.svelte';
import ModifyDownscalingCard from '$lib/cards/ModifyDownscalingCard.svelte';
import ModifyMiscCard from '$lib/cards/ModifyMiscCard.svelte';
import OutputConversionCard from '$lib/cards/OutputConversionCard.svelte';
import OutputFormatCard from '$lib/cards/OutputFormatCard.svelte';
import OutputSaveCard from '$lib/cards/OutputSaveCard.svelte';
import ProgressCard from '$lib/cards/ProgressCard.svelte';
import LayoutManagerCard from '$lib/cards/LayoutManagerCard.svelte';
import SettingsAppearanceCard from '$lib/cards/SettingsAppearanceCard.svelte';
import SettingsAdvancedCard from '$lib/cards/SettingsAdvancedCard.svelte';
import SettingsConversionCard from '$lib/cards/SettingsConversionCard.svelte';
import SettingsExifToolCard from '$lib/cards/SettingsExifToolCard.svelte';
import SettingsFrontendCard from '$lib/cards/SettingsFrontendCard.svelte';
import SettingsGeneralCard from '$lib/cards/SettingsGeneralCard.svelte';
import ConversionLogCard from '$lib/cards/ConversionLogCard.svelte';
import SystemStatusCard from '$lib/cards/SystemStatusCard.svelte';

export const cardRegistry: Record<CardId, Component<{ laneId: LaneId }>> = {
  'input-files': InputFilesCard,
  'input-filter': InputFilterCard,
  'progress-status': ProgressCard,
  'output-format': OutputFormatCard,
  'output-conversion': OutputConversionCard,
  'output-save': OutputSaveCard,
  'modify-downscaling': ModifyDownscalingCard,
  'modify-misc': ModifyMiscCard,
  'settings-appearance': SettingsAppearanceCard,
  'settings-general': SettingsGeneralCard,
  'settings-conversion': SettingsConversionCard,
  'settings-exiftool': SettingsExifToolCard,
  'settings-advanced': SettingsAdvancedCard,
  'settings-frontend': SettingsFrontendCard,
  'layout-manager': LayoutManagerCard,
  'about-info': AboutInfoCard,
  'conversion-log': ConversionLogCard,
  'system-status': SystemStatusCard,
};
