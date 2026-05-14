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

export function ExceptionViewer() {
  const exceptions = useAtomValue(exceptionsAtom);
  const [open, setOpen] = useState(false);

  if (exceptions.length === 0) return null;

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
                    <p className="text-xs text-muted-foreground font-mono">{exc.path}</p>
                  )}
                </div>
              ))}
            </div>
          </ScrollArea>
        </DialogContent>
      </Dialog>
    </>
  );
}
