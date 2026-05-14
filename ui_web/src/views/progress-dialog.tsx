import { Button } from '~/components/shadcn/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '~/components/shadcn/dialog';
import { Progress } from '~/components/shadcn/progress';
import { getAPI } from '~/utils/api';
import { useSetAtom } from 'jotai';
import { progressAtom } from '~/atom/primitive';
import { toast } from 'sonner';

interface ProgressDialogProps {
  open: boolean;
  line1: string;
  line2: string;
  value: number;
  maximum: number;
}

export function ProgressDialog({ open, line1, line2, value, maximum }: ProgressDialogProps) {
  const setProgress = useSetAtom(progressAtom);

  const handleCancel = async () => {
    const api = getAPI();
    if (api) {
      try {
        await api.cancelConversion();
      } catch {
        toast.error('Cancel', { description: 'Failed to cancel conversion.' });
      }
    }
    setProgress((prev) => ({ ...prev, isProcessing: false }));
  };

  const pct = maximum > 0 ? Math.round((value / maximum) * 100) : 0;

  return (
    <Dialog open={open}>
      <DialogContent className="sm:max-w-md" onInteractOutside={(e) => e.preventDefault()}>
        <DialogHeader>
          <DialogTitle>Converting...</DialogTitle>
          <DialogDescription>{line1}</DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <Progress value={pct} />
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>{value} / {maximum}</span>
            <span>{pct}%</span>
          </div>
          {line2 && <p className="text-xs text-muted-foreground">{line2}</p>}
        </div>

        <DialogFooter>
          <Button variant="destructive" onClick={handleCancel}>
            Cancel
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
