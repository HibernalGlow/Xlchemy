import { Card, CardContent, CardHeader, CardTitle } from '~/components/shadcn/card';
import { Label } from '~/components/shadcn/label';
import { Separator } from '~/components/shadcn/separator';
import { getAPI, isPyWebView } from '~/utils/api';
import { Button } from '~/components/shadcn/button';
import { ExternalLink, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';

interface AboutTabProps {
  version: string;
  licensePath?: string;
  licenseThirdPartyPath?: string;
}

export function AboutTab({ version, licensePath, licenseThirdPartyPath }: AboutTabProps) {
  const handleCheckUpdate = async () => {
    const api = getAPI();
    if (!api) return;
    const result = await api.checkForUpdates();
    if (!result.ok) {
      toast.error('Update Check', { description: result.error || 'Failed to check updates.' });
      return;
    }
    if (result.is_newer) {
      toast.success('Update Available', { description: `Latest version: ${result.latest_version}` });
      if (result.download_url) {
        window.open(result.download_url, '_blank');
      }
    } else {
      toast.success('Up to Date', { description: 'You are already on the latest version.' });
    }
  };

  const handleOpenPath = async (path?: string) => {
    if (!path) return;
    const api = getAPI();
    if (api) {
      const result = await api.openPath(path);
      if (!result.ok) {
        toast.error('Open Path', { description: result.message || 'Failed to open path.' });
      }
      return;
    }
    window.open(path, '_blank');
  };

  return (
    <Card className="h-full">
      <CardHeader className="pb-3">
        <CardTitle className="text-base">About</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="text-center space-y-2">
          <h2 className="text-2xl font-bold text-primary">Xlchemy</h2>
          <p className="text-muted-foreground">Image Format Converter</p>
          <p className="text-sm">Version {version}</p>
        </div>

        <Separator />

        <div className="space-y-2 text-sm text-muted-foreground">
          <p>Convert images between AVIF, JPEG, JPEG XL, PNG, and WebP formats.</p>
          <p>Built with Python, Rust, and modern web technologies.</p>
        </div>

        <Separator />

        <div className="space-y-2">
          <Label className="text-xs text-muted-foreground">Supported Input Formats</Label>
          <p className="text-xs text-muted-foreground">
            AVIF, BMP, GIF, ICO, JPEG, JPEG XL, JPEG2000, PNG, TIFF, WebP
          </p>
        </div>

        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleCheckUpdate}
            disabled={!isPyWebView()}
          >
            <RefreshCw className="h-3.5 w-3.5 mr-1" />
            Check for Updates
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleOpenPath(licensePath)}
            disabled={!licensePath}
          >
            License
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleOpenPath(licenseThirdPartyPath)}
            disabled={!licenseThirdPartyPath}
          >
            3rd Party
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => window.open('https://github.com/codepoems/xl-converter', '_blank')}
          >
            <ExternalLink className="h-3.5 w-3.5 mr-1" />
            GitHub
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
