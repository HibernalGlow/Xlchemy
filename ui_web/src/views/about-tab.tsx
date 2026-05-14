import { Card, CardContent, CardHeader, CardTitle } from '~/components/shadcn/card';
import { Label } from '~/components/shadcn/label';
import { Separator } from '~/components/shadcn/separator';
import { getAPI, isPyWebView } from '~/utils/api';
import { useEffect, useState } from 'react';
import { Button } from '~/components/shadcn/button';
import { ExternalLink } from 'lucide-react';

export function AboutTab() {
  const [version, setVersion] = useState('1.2.4');

  useEffect(() => {
    const api = getAPI();
    if (api) {
      api.getVersion().then(setVersion).catch(() => {});
    }
  }, []);

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
