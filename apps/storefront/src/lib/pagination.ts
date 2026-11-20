/** How many products the shop shows at a time before "Load more". */
export const PAGE_SIZE = 12;

/** What to show now and what the next click adds. `visible` is how many the shopper has asked for so far. */
export function pageWindow(total: number, visible: number, pageSize: number = PAGE_SIZE) {
  const shown = Math.max(0, Math.min(total, visible));
  const remaining = total - shown;
  return {
    shown,
    total,
    remaining,
    hasMore: remaining > 0,
    /** What the next click adds (the last page can be smaller). */
    added: Math.min(remaining, pageSize),
    nextVisible: shown + pageSize
  };
}
