import { useEffect, useRef, useState, type CSSProperties } from "react";

const SPEED_PX_PER_SECOND = 55;

/**
 * Scrolling announcement banner (right → left).
 * Pure CSS animation; JavaScript only measures once (and on resize) to decide how many copies of
 * the text are needed so that one half of the track is always wider than the screen — which is
 * what makes the loop seamless with no visible jump.
 */
export function AnnouncementMarquee({ text }: { text: string }) {
  const rootRef = useRef<HTMLDivElement>(null);
  const itemRef = useRef<HTMLSpanElement>(null);
  const [copies, setCopies] = useState(4);
  const [duration, setDuration] = useState(30);

  useEffect(() => {
    const root = rootRef.current;
    const item = itemRef.current;
    if (!root || !item) return;

    const measure = () => {
      const itemWidth = item.getBoundingClientRect().width;
      const rootWidth = root.getBoundingClientRect().width;
      if (!itemWidth || !rootWidth) return;
      const needed = Math.max(2, Math.ceil(rootWidth / itemWidth) + 1);
      setCopies(needed);
      setDuration(Math.max(12, Math.round((needed * itemWidth) / SPEED_PX_PER_SECOND)));
    };

    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(root);
    return () => observer.disconnect();
  }, [text]);

  return (
    <div className="announcement-marquee" role="region" aria-label="Announcement" ref={rootRef}>
      {/* Screen readers get the message once; the visual repeats are hidden from them. */}
      <p className="sr-only">{text}</p>
      <div
        className="marquee-track"
        aria-hidden="true"
        style={{ "--marquee-duration": `${duration}s` } as CSSProperties}
      >
        {[0, 1].map((group) => (
          <div className="marquee-group" key={group}>
            {Array.from({ length: copies }, (_, i) => (
              <span className="marquee-item" key={i} ref={group === 0 && i === 0 ? itemRef : undefined}>
                {text}
                <span className="marquee-sep">✳</span>
              </span>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
