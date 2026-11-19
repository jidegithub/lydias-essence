import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import {
  FAVOURITES_KEY,
  MAX_FAVOURITES,
  loadFavourites,
  parseFavourites,
  pruneFavourites,
  saveFavourites,
  toggleFavourite,
  type FavouritesState,
  type StorageLike
} from "../lib/favourites";

export interface Favourites {
  /** Saved product ids, most recent first. */
  ids: readonly string[];
  idSet: ReadonlySet<string>;
  count: number;
  /** Random ID for this browser; no sign-in involved. */
  visitorId: string;
  isFavourite: (productId: string) => boolean;
  toggle: (productId: string, productName: string) => void;
  /** Forget products that no longer exist in the shop. */
  prune: (validIds: ReadonlySet<string>) => void;
}

const FavouritesContext = createContext<Favourites | null>(null);

function getStorage(): StorageLike | null {
  try {
    return window.localStorage;
  } catch {
    return null; // blocked (some private modes): favourites still work for this visit
  }
}

export function FavouritesProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<FavouritesState>(() => loadFavourites(getStorage()));
  const [message, setMessage] = useState("");
  const latest = useRef(state);
  latest.current = state;

  useEffect(() => {
    saveFavourites(state, getStorage());
  }, [state]);

  // The list was changed in another tab of the same browser: follow it.
  useEffect(() => {
    const onStorage = (event: StorageEvent) => {
      if (event.key !== FAVOURITES_KEY) return;
      const next = parseFavourites(event.newValue);
      if (next) setState(next);
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  const toggle = useCallback((productId: string, productName: string) => {
    const result = toggleFavourite(latest.current, productId);
    if (result.limited) {
      setMessage(`You can save up to ${MAX_FAVOURITES} favourites. Remove one to add another.`);
      return;
    }
    latest.current = result.state;
    setState(result.state);
    setMessage(result.added ? `Added ${productName} to favourites.` : `Removed ${productName} from favourites.`);
  }, []);

  const prune = useCallback((validIds: ReadonlySet<string>) => {
    setState((previous) => pruneFavourites(previous, validIds));
  }, []);

  const value = useMemo<Favourites>(() => {
    const idSet = new Set(state.ids);
    return {
      ids: state.ids,
      idSet,
      count: state.ids.length,
      visitorId: state.visitorId,
      isFavourite: (id) => idSet.has(id),
      toggle,
      prune
    };
  }, [state, toggle, prune]);

  return (
    <FavouritesContext.Provider value={value}>
      {children}
      {/* Tells screen-reader users what a heart tap did. */}
      <div className="sr-only" role="status" aria-live="polite">
        {message}
      </div>
    </FavouritesContext.Provider>
  );
}

export function useFavourites(): Favourites {
  const value = useContext(FavouritesContext);
  if (!value) throw new Error("useFavourites must be used inside <FavouritesProvider>");
  return value;
}
