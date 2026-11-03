import { useEffect, useRef, useState } from "react";

export interface Spin360ViewerProps {
  /** Ordered image URLs, one per rotation step. */
  frames: string[];
  alt: string;
  /** CSS colour/var for the backdrop, e.g. var(--theme-blush). */
  background?: string;
}

/**
 * Lightweight 360° viewer for image sequences: drag/swipe, arrow keys, or the slider.
 * No dependencies and no animation loop — it only updates when the person interacts.
 */
export function Spin360Viewer({ frames, alt, background }: Spin360ViewerProps) {
  const [index, setIndex] = useState(0);
  const [loaded, setLoaded] = useState(0);
  const [failed, setFailed] = useState(0);
  const [touched, setTouched] = useState(false);
  const drag = useRef<{ x: number; start: number } | null>(null);
  const stage = useRef<HTMLDivElement>(null);
  const total = frames.length;

  useEffect(() => {
    setIndex(0);
    setLoaded(0);
    setFailed(0);
    let cancelled = false;
    frames.forEach((src) => {
      const img = new Image();
      img.onload = () => !cancelled && setLoaded((n) => n + 1);
      img.onerror = () => !cancelled && setFailed((n) => n + 1);
      img.src = src;
    });
    return () => {
      cancelled = true;
    };
  }, [frames]);

  const wrap = (i: number) => ((i % total) + total) % total;

  function onPointerDown(e: React.PointerEvent) {
    drag.current = { x: e.clientX, start: index };
    stage.current?.setPointerCapture(e.pointerId);
    setTouched(true);
  }
  function onPointerMove(e: React.PointerEvent) {
    if (!drag.current || !stage.current) return;
    const width = stage.current.clientWidth || 300;
    const pxPerFrame = Math.max(5, width / total);
    const steps = Math.round((e.clientX - drag.current.x) / pxPerFrame);
    setIndex(wrap(drag.current.start - steps));
  }
  function onPointerUp(e: React.PointerEvent) {
    drag.current = null;
    stage.current?.releasePointerCapture?.(e.pointerId);
  }
  function onKeyDown(e: React.KeyboardEvent) {
    if (e.key === "ArrowLeft") {
      e.preventDefault();
      setIndex((i) => wrap(i - 1));
      setTouched(true);
    } else if (e.key === "ArrowRight") {
      e.preventDefault();
      setIndex((i) => wrap(i + 1));
      setTouched(true);
    }
  }

  if (total === 0) return null;
  const ready = loaded + failed >= total;

  return (
    <div className="le-spin" style={background ? ({ "--spin-bg": background } as React.CSSProperties) : undefined}>
      <div
        ref={stage}
        className="le-spin-stage"
        tabIndex={0}
        role="group"
        aria-roledescription="360 degree product viewer"
        aria-label={`${alt}. Use the left and right arrow keys or the slider to rotate.`}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        onKeyDown={onKeyDown}
      >
        <img src={frames[index]} alt={`${alt}, view ${index + 1} of ${total}`} draggable={false} />
        {!ready && (
          <div className="le-spin-loading" role="status">
            Loading 360° view… {loaded}/{total}
          </div>
        )}
        {ready && !touched && <span className="le-spin-hint">Drag to rotate</span>}
      </div>
      {failed > 0 && (
        <div className="le-spin-warn" role="status">
          {failed} of {total} frames couldn’t be loaded, so the rotation may skip.
        </div>
      )}
      <div className="le-spin-slider">
        <label className="sr-only" htmlFor="le-spin-range">
          Rotate product
        </label>
        <input
          id="le-spin-range"
          type="range"
          min={0}
          max={total - 1}
          value={index}
          onChange={(e) => {
            setIndex(Number(e.target.value));
            setTouched(true);
          }}
        />
      </div>
    </div>
  );
}
