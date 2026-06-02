/**
 * Manual bindings for the Go AppService.
 * Uses the Wails runtime Call.ByName API.
 */
import { Call } from "@wailsio/runtime";

const PKG = "main.AppService";

function call(method: string, ...args: any[]): Promise<any> {
  return Call.ByName(`${PKG}.${method}`, ...args);
}

export const AppService = {
  GetConstants: (): Promise<string> => call("GetConstants"),
  GetTooltips: (): Promise<string> => call("GetTooltips"),
  GetSettings: (): Promise<string> => call("GetSettings"),
  SaveSettings: (settingsJSON: string): Promise<void> =>
    call("SaveSettings", settingsJSON),
  ListPresets: (): Promise<string[]> => call("ListPresets"),
  SavePreset: (name: string, presetJSON: string): Promise<void> =>
    call("SavePreset", name, presetJSON),
  LoadPreset: (name: string): Promise<string> => call("LoadPreset", name),
  DeletePreset: (name: string): Promise<void> => call("DeletePreset", name),
  SetDefaultPreset: (name: string): Promise<void> =>
    call("SetDefaultPreset", name),
  GetDefaultPreset: (): Promise<string> => call("GetDefaultPreset"),
  AddFiles: (paths: string[]): Promise<string> => call("AddFiles", paths),
  ScanDirectory: (dirPath: string): Promise<string> =>
    call("ScanDirectory", dirPath),
  StartConversion: (
    itemsJSON: string,
    outputJSON: string,
    modifyJSON: string,
    settingsJSON: string,
    threadCount: number
  ): Promise<void> =>
    call(
      "StartConversion",
      itemsJSON,
      outputJSON,
      modifyJSON,
      settingsJSON,
      threadCount
    ),
  CancelConversion: (): Promise<void> => call("CancelConversion"),
  IsConverting: (): Promise<boolean> => call("IsConverting"),
  GetCPUCount: (): Promise<number> => call("GetCPUCount"),
  CheckForUpdates: (): Promise<string> => call("CheckForUpdates"),
};
