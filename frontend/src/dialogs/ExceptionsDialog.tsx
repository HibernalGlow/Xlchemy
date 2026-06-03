import { useT } from '~/hooks/useT';
import { Button } from '~/components/ui/Button';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '~/components/ui/Dialog';

interface ExceptionsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  exceptions: any[];
  onClose: () => void;
}

export function ExceptionsDialog({
  open,
  onOpenChange,
  exceptions,
  onClose,
}: ExceptionsDialogProps) {
  const t = useT();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>
            {t('Exceptions')} ({exceptions.length})
          </DialogTitle>
        </DialogHeader>
        <div className="overflow-auto max-h-[300px] rounded-md border border-border-2">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-ntrl-30">
                <th className="text-left p-2 font-semibold">{t('ID')}</th>
                <th className="text-left p-2 font-semibold">{t('Message')}</th>
              </tr>
            </thead>
            <tbody>
              {exceptions.map((exc, i) => (
                <tr key={i} className="border-b border-border-2/50">
                  <td className="p-2">{exc.id}</td>
                  <td className="p-2 text-xs text-text-2">{exc.msg}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <DialogFooter>
          <Button kind="outline" variant="neutral" onClick={onClose}>
            {t('Close')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
