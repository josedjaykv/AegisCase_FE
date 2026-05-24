import { Toaster } from 'sonner';
import { useUiStore } from '@/stores/ui.store';

export function ToastProvider() {
  const theme = useUiStore((s) => s.theme);
  return <Toaster position="top-right" richColors theme={theme} />;
}
