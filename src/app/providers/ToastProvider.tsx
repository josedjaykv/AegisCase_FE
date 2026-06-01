import { Toaster } from 'sonner';
import { useUiStore } from '@/stores/ui.store';

export function ToastProvider() {
  const theme = useUiStore((s) => s.theme);
  // `richColors` is intentionally OFF: sonner's rich palette (e.g. success green
  // #008a2e on #ecfdf3 = 4.25:1) fails WCAG AA (4.5:1). The neutral toast (card
  // bg + foreground text) passes contrast and still conveys type via its icon —
  // consistent with the design system's neutral aesthetic. See docs/phases/phase-10.
  return <Toaster position="top-right" theme={theme} />;
}
