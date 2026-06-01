import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type KeyboardEvent as ReactKeyboardEvent,
  type PointerEvent as ReactPointerEvent,
  type ReactNode,
  type WheelEvent as ReactWheelEvent,
} from 'react';
import {
  FlipHorizontal2,
  RefreshCw,
  RotateCcw,
  RotateCw,
  SlidersHorizontal,
  ZoomIn,
  ZoomOut,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

const MIN_SCALE = 0.25;
const MAX_SCALE = 8;
const ZOOM_STEP = 1.2;

const clamp = (v: number, min: number, max: number) => Math.min(max, Math.max(min, v));

interface Transform {
  scale: number;
  rotation: number; // degrees, multiples of 90
  flipH: boolean;
  offsetX: number;
  offsetY: number;
  brightness: number; // %
  contrast: number; // %
}

const INITIAL: Transform = {
  scale: 1,
  rotation: 0,
  flipH: false,
  offsetX: 0,
  offsetY: 0,
  brightness: 100,
  contrast: 100,
};

/**
 * Evidence image inspector: zoom (buttons / wheel / double-click), pan (drag
 * when zoomed), rotate, mirror, and brightness/contrast adjustment for dark or
 * washed-out photos. Keyboard: +/- zoom, r/R rotate, f flip, 0 reset, arrows pan.
 * No external library — pure CSS transforms + filters.
 *
 * The viewport (`role="application"`) is a custom interactive surface with no
 * native HTML equivalent; every action is ALSO reachable via the accessible
 * toolbar buttons below, so the div's listeners + tabIndex are a progressive
 * enhancement. Hence the scoped a11y-rule disables.
 */
/* eslint-disable jsx-a11y/no-noninteractive-element-interactions, jsx-a11y/no-noninteractive-tabindex */
export function ImageViewer({ src, alt }: { src: string; alt: string }) {
  const [t, setT] = useState<Transform>(INITIAL);
  const [showAdjust, setShowAdjust] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const drag = useRef<{ x: number; y: number } | null>(null);

  // Reset everything when a different image is shown.
  useEffect(() => {
    setT(INITIAL);
    setShowAdjust(false);
  }, [src]);

  const zoomBy = useCallback((factor: number) => {
    setT((prev) => {
      const scale = clamp(prev.scale * factor, MIN_SCALE, MAX_SCALE);
      // Recentre when returning to (or below) fit.
      return scale <= 1
        ? { ...prev, scale, offsetX: 0, offsetY: 0 }
        : { ...prev, scale };
    });
  }, []);

  const rotate = useCallback((dir: 1 | -1) => {
    setT((prev) => ({ ...prev, rotation: prev.rotation + dir * 90 }));
  }, []);

  const reset = useCallback(() => setT(INITIAL), []);

  const onWheel = (e: ReactWheelEvent<HTMLDivElement>) => {
    e.preventDefault();
    zoomBy(e.deltaY < 0 ? ZOOM_STEP : 1 / ZOOM_STEP);
  };

  const onPointerDown = (e: ReactPointerEvent<HTMLDivElement>) => {
    if (t.scale <= 1) return;
    drag.current = { x: e.clientX - t.offsetX, y: e.clientY - t.offsetY };
    e.currentTarget.setPointerCapture(e.pointerId);
  };

  const onPointerMove = (e: ReactPointerEvent<HTMLDivElement>) => {
    if (!drag.current) return;
    setT((prev) => ({
      ...prev,
      offsetX: e.clientX - drag.current!.x,
      offsetY: e.clientY - drag.current!.y,
    }));
  };

  const endDrag = (e: ReactPointerEvent<HTMLDivElement>) => {
    drag.current = null;
    if (e.currentTarget.hasPointerCapture(e.pointerId)) {
      e.currentTarget.releasePointerCapture(e.pointerId);
    }
  };

  const onKeyDown = (e: ReactKeyboardEvent<HTMLDivElement>) => {
    switch (e.key) {
      case '+':
      case '=':
        zoomBy(ZOOM_STEP);
        break;
      case '-':
      case '_':
        zoomBy(1 / ZOOM_STEP);
        break;
      case 'r':
        rotate(1);
        break;
      case 'R':
        rotate(-1);
        break;
      case 'f':
      case 'F':
        setT((p) => ({ ...p, flipH: !p.flipH }));
        break;
      case '0':
        reset();
        break;
      case 'ArrowLeft':
        if (t.scale > 1) setT((p) => ({ ...p, offsetX: p.offsetX + 30 }));
        break;
      case 'ArrowRight':
        if (t.scale > 1) setT((p) => ({ ...p, offsetX: p.offsetX - 30 }));
        break;
      case 'ArrowUp':
        if (t.scale > 1) setT((p) => ({ ...p, offsetY: p.offsetY + 30 }));
        break;
      case 'ArrowDown':
        if (t.scale > 1) setT((p) => ({ ...p, offsetY: p.offsetY - 30 }));
        break;
      default:
        return;
    }
    e.preventDefault();
  };

  const adjusted = t.brightness !== 100 || t.contrast !== 100;

  return (
    <div
      ref={containerRef}
      tabIndex={0}
      onWheel={onWheel}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={endDrag}
      onPointerLeave={endDrag}
      onDoubleClick={() => zoomBy(t.scale < 2 ? 2 : 1 / (t.scale))}
      onKeyDown={onKeyDown}
      role="application"
      aria-label="Image viewer. Use plus and minus to zoom, r to rotate, f to flip, 0 to reset, arrows to pan."
      className={cn(
        'relative flex h-full w-full items-center justify-center overflow-hidden outline-none select-none',
        t.scale > 1 ? (drag.current ? 'cursor-grabbing' : 'cursor-grab') : 'cursor-zoom-in',
      )}
    >
      <img
        src={src}
        alt={alt}
        draggable={false}
        className="max-h-full max-w-full object-contain transition-transform duration-75 will-change-transform"
        style={{
          transform: `translate(${t.offsetX}px, ${t.offsetY}px) rotate(${t.rotation}deg) scale(${t.scale}) scaleX(${t.flipH ? -1 : 1})`,
          filter: `brightness(${t.brightness}%) contrast(${t.contrast}%)`,
        }}
      />

      {/* Brightness / contrast panel */}
      {showAdjust && (
        <div className="absolute right-2 top-2 w-52 space-y-2 rounded-md border border-border bg-card/95 p-3 shadow-md backdrop-blur">
          <Slider
            label="Brightness"
            value={t.brightness}
            onChange={(v) => setT((p) => ({ ...p, brightness: v }))}
          />
          <Slider
            label="Contrast"
            value={t.contrast}
            onChange={(v) => setT((p) => ({ ...p, contrast: v }))}
          />
          <Button
            variant="ghost"
            size="sm"
            className="h-7 w-full text-xs"
            disabled={!adjusted}
            onClick={() => setT((p) => ({ ...p, brightness: 100, contrast: 100 }))}
          >
            Reset adjustments
          </Button>
        </div>
      )}

      {/* Toolbar */}
      <div className="absolute bottom-2 left-1/2 flex -translate-x-1/2 items-center gap-0.5 rounded-md border border-border bg-card/95 p-1 shadow-md backdrop-blur">
        <ToolbarButton label="Zoom out" onClick={() => zoomBy(1 / ZOOM_STEP)}>
          <ZoomOut className="h-4 w-4" />
        </ToolbarButton>
        <span className="w-12 text-center text-xs tabular-nums text-muted-foreground">
          {Math.round(t.scale * 100)}%
        </span>
        <ToolbarButton label="Zoom in" onClick={() => zoomBy(ZOOM_STEP)}>
          <ZoomIn className="h-4 w-4" />
        </ToolbarButton>

        <Divider />

        <ToolbarButton label="Rotate left" onClick={() => rotate(-1)}>
          <RotateCcw className="h-4 w-4" />
        </ToolbarButton>
        <ToolbarButton label="Rotate right" onClick={() => rotate(1)}>
          <RotateCw className="h-4 w-4" />
        </ToolbarButton>
        <ToolbarButton
          label="Flip horizontal"
          active={t.flipH}
          onClick={() => setT((p) => ({ ...p, flipH: !p.flipH }))}
        >
          <FlipHorizontal2 className="h-4 w-4" />
        </ToolbarButton>

        <Divider />

        <ToolbarButton
          label="Adjust brightness and contrast"
          active={showAdjust || adjusted}
          onClick={() => setShowAdjust((v) => !v)}
        >
          <SlidersHorizontal className="h-4 w-4" />
        </ToolbarButton>
        <ToolbarButton label="Reset view" onClick={reset}>
          <RefreshCw className="h-4 w-4" />
        </ToolbarButton>
      </div>
    </div>
  );
}

/* eslint-enable jsx-a11y/no-noninteractive-element-interactions, jsx-a11y/no-noninteractive-tabindex */

function ToolbarButton({
  label,
  active,
  onClick,
  children,
}: {
  label: string;
  active?: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <Button
      type="button"
      variant="ghost"
      size="sm"
      aria-label={label}
      title={label}
      aria-pressed={active}
      onClick={onClick}
      className={cn('h-8 w-8 p-0', active && 'bg-accent text-foreground')}
    >
      {children}
    </Button>
  );
}

function Divider() {
  return <span className="mx-0.5 h-5 w-px bg-border" aria-hidden="true" />;
}

function Slider({
  label,
  value,
  onChange,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
}) {
  const id = `img-adjust-${label.toLowerCase()}`;
  return (
    <div className="text-xs text-muted-foreground">
      <label htmlFor={id} className="flex justify-between">
        <span>{label}</span>
        <span className="tabular-nums">{value}%</span>
      </label>
      <input
        id={id}
        type="range"
        min={0}
        max={200}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="mt-1 h-1.5 w-full cursor-pointer accent-primary"
      />
    </div>
  );
}
