import type { AppStateSnapshot, ConversionSpec, Preset } from '$lib/domain';
import { normalizeOutputSettings, normalizeModifySettings, normalizeAppSettings } from '$lib/domain';

export function extractConversionSpec(snapshot: AppStateSnapshot): ConversionSpec {
  return {
    output: normalizeOutputSettings(snapshot.domain?.output || {}),
    modify: normalizeModifySettings(snapshot.domain?.modify || {}),
    app: normalizeAppSettings(snapshot.domain?.app || {}),
  };
}

export function applyPreset(
  snapshot: AppStateSnapshot,
  preset: Preset
): AppStateSnapshot {
  return {
    ...snapshot,
    domain: {
      output: normalizeOutputSettings(preset.output || {}),
      modify: normalizeModifySettings(preset.modify || {}),
      app: normalizeAppSettings({ ...snapshot.domain.app, ...preset.app }),
    },
  };
}

export function createPresetFromSnapshot(
  name: string,
  snapshot: AppStateSnapshot
): Preset {
  return {
    name,
    output: snapshot.domain.output,
    modify: snapshot.domain.modify,
    app: snapshot.domain.app,
  };
}

export function sanitizePresetName(name: string): string {
  return name.trim().replace(/[\\/:*?"<>|]/g, '_');
}
