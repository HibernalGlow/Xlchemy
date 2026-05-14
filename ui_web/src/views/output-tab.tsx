import { forwardRef, useCallback, useImperativeHandle, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '~/components/shadcn/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '~/components/shadcn/select';
import { Slider } from '~/components/shadcn/slider';
import { Switch } from '~/components/shadcn/switch';
import { Label } from '~/components/shadcn/label';
import { Input } from '~/components/shadcn/input';
import { Button } from '~/components/shadcn/button';
import { OUTPUT_FORMATS } from '~/consts';
import { getAPI } from '~/utils/api';
import { FolderOpen } from 'lucide-react';

export interface OutputTabRef {
  getSettings: () => Record<string, unknown>;
}

export const OutputTab = forwardRef<OutputTabRef>(function OutputTab(_props, ref) {
  const [format, setFormat] = useState('AVIF');
  const [quality, setQuality] = useState(80);
  const [effort, setEffort] = useState(4);
  const [lossless, setLossless] = useState(false);
  const [customOutputDir, setCustomOutputDir] = useState(false);
  const [customOutputDirPath, setCustomOutputDirPath] = useState('');
  const [keepDirStruct, setKeepDirStruct] = useState(false);
  const [threadCount, setThreadCount] = useState(1);

  const handleBrowseOutputDir = useCallback(async () => {
    const api = getAPI();
    if (!api) return;
    const dir = await api.openFolderDialog();
    if (dir) {
      setCustomOutputDirPath(dir);
    }
  }, []);

  useImperativeHandle(ref, () => ({
    getSettings: () => ({
      format,
      quality,
      effort,
      lossless,
      jxl_modular: false,
      intelligent_effort: false,
      custom_output_dir: customOutputDir,
      custom_output_dir_path: customOutputDirPath,
      keep_dir_struct: keepDirStruct,
      thread_count: threadCount,
      sm_format_pool: [],
    }),
  }));

  return (
    <Card className="h-full">
      <CardHeader className="pb-3">
        <CardTitle className="text-base">Output Settings</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Format</Label>
            <Select value={format} onValueChange={setFormat}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {OUTPUT_FORMATS.map((f) => (
                  <SelectItem key={f} value={f}>
                    {f}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Threads: {threadCount}</Label>
            <Slider
              value={[threadCount]}
              onValueChange={([v]) => setThreadCount(v)}
              min={1}
              max={32}
              step={1}
            />
          </div>
        </div>

        {!lossless && (
          <div className="space-y-2">
            <Label>Quality: {quality}</Label>
            <Slider
              value={[quality]}
              onValueChange={([v]) => setQuality(v)}
              min={1}
              max={100}
              step={1}
            />
          </div>
        )}

        <div className="space-y-2">
          <Label>Effort: {effort}</Label>
          <Slider
            value={[effort]}
            onValueChange={([v]) => setEffort(v)}
            min={1}
            max={10}
            step={1}
          />
        </div>

        <div className="flex items-center space-x-2">
          <Switch checked={lossless} onCheckedChange={setLossless} />
          <Label>Lossless</Label>
        </div>

        <div className="space-y-2">
          <div className="flex items-center space-x-2">
            <Switch checked={customOutputDir} onCheckedChange={setCustomOutputDir} />
            <Label>Custom Output Directory</Label>
          </div>
          {customOutputDir && (
            <div className="flex gap-2">
              <Input
                value={customOutputDirPath}
                onChange={(e) => setCustomOutputDirPath(e.target.value)}
                placeholder="Output directory path"
              />
              <Button variant="outline" size="icon" onClick={handleBrowseOutputDir}>
                <FolderOpen className="h-4 w-4" />
              </Button>
            </div>
          )}
        </div>

        <div className="flex items-center space-x-2">
          <Switch checked={keepDirStruct} onCheckedChange={setKeepDirStruct} />
          <Label>Keep Folder Structure</Label>
        </div>
      </CardContent>
    </Card>
  );
});
