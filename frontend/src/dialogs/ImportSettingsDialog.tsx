import { useT } from '~/hooks/useT';
import { Button } from '~/components/ui/Button';
import { Textarea } from '~/components/ui/Textarea';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '~/components/ui/Dialog';

interface ImportSettingsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  importJson: string;
  onImportJsonChange: (json: string) => void;
  onImport: () => void;
}

export function ImportSettingsDialog({
  open,
  onOpenChange,
  importJson,
  onImportJsonChange,
  onImport,
}: ImportSettingsDialogProps) {
  const t = useT();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>
            {t('Import')} {t('Settings')}
          </DialogTitle>
        </DialogHeader>
        <Textarea
          value={importJson}
          onChange={(e) => onImportJsonChange(e.target.value)}
          placeholder="Paste settings JSON here..."
          className="min-h-[200px] font-mono"
        />
        <DialogFooter>
          <Button kind="outline" variant="neutral" onClick={() => onOpenChange(false)}>
            {t('Cancel')}
          </Button>
          <Button kind="solid" variant="pop" onClick={onImport}>
            {t('Import')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
