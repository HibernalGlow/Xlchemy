import { useAtomValue } from 'jotai';
import { exceptionsAtom } from '~/atom/primitive';
import { Button } from '~/components/shadcn/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '~/components/shadcn/dialog';
import { ScrollArea } from '~/components/shadcn/scroll-area';
import { useState } from 'react';
import { AlertTriangle } from 'lucide-react';
import { getAPI, isPyWebView } from '~/utils/api';
import { toast } from 'sonner';

export function ExceptionViewer() {
  const exceptions = useAtomValue(exceptionsAtom);
  const [open, setOpen] = useState(false);

  if (exceptions.length === 0) return null;

  const handleSave = async () => {
    const api = getAPI();
    if (!api) return;
    const result = await api.saveExceptions(exceptions);
    if (!result.ok) {
      toast.error('Save Exceptions', { description: result.message || 'Failed to save exceptions.' });
    }
  };

  const handleOpenPath = async (path: string) => {
    const api = getAPI();
    if (!api) return;
    const result = await api.openPath(path);
    if (!result.ok) {
      toast.error('Open Path', { description: result.message || 'Failed to open path.' });
    }
  };

  return (
    <>
      <Button
        variant="destructive"
        size="sm"
        className="fixed bottom-4 right-4 z-50"
        onClick={() => setOpen(true)}
      >
        <AlertTriangle className="h-3.5 w-3.5 mr-1" />
        {exceptions.length} Error{exceptions.length > 1 ? 's' : ''}
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Conversion Errors</DialogTitle>
            <DialogDescription>
              {exceptions.length} error{exceptions.length > 1 ? 's' : ''} occurred during conversion.
            </DialogDescription>
          </DialogHeader>

          <ScrollArea className="h-[300px]">
            <div className="space-y-2">
              {exceptions.map((exc, i) => (
                <div key={i} className="rounded-md border p-3 space-y-1">
                  <p className="text-sm font-medium">{exc.title}</p>
                  <p className="text-xs text-muted-foreground">{exc.description}</p>
                  {exc.path && (
                    <button
                      className="text-xs text-muted-foreground font-mono text-left hover:text-primary"
                      onClick={() => handleOpenPath(exc.path)}
                      type="button"
                    >
                      {exc.path}
                    </button>
                  )}
                </div>
              ))}
            </div>
          </ScrollArea>

          <div className="flex justify-between">
            <Button variant="outline" size="sm" onClick={handleSave} disabled={!isPyWebView()}>
              Save to File
            </Button>
            <Button variant="outline" size="sm" onClick={() => setOpen(false)}>
              Close
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
