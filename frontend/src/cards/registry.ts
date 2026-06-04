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
import SettingsAppearanceCard from '$lib/cards/SettingsAppearanceCard.svelte';
import SettingsGeneralCard from '$lib/cards/SettingsGeneralCard.svelte';

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
  'settings-conversion': SettingsGeneralCard,
  'settings-exiftool': SettingsGeneralCard,
  'settings-advanced': SettingsGeneralCard,
  'about-info': AboutInfoCard,
};
