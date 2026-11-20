import { Heart } from "lucide-react";
import { useFavourites } from "../context/FavouritesContext";
import type { Product } from "../types/product";

interface FavouriteButtonProps {
  product: Pick<Product, "id" | "name">;
  className?: string;
}

/** The heart on a product: saves it to the shopper's favourites (no sign-in needed). */
export function FavouriteButton({ product, className = "heart-button" }: FavouriteButtonProps) {
  const { isFavourite, toggle } = useFavourites();
  const liked = isFavourite(product.id);

  return (
    <button
      type="button"
      className={`${className} ${liked ? "is-liked" : ""}`}
      aria-pressed={liked}
      aria-label={liked ? `Remove ${product.name} from favourites` : `Add ${product.name} to favourites`}
      onClick={(event) => {
        event.stopPropagation();
        toggle(product.id, product.name);
      }}
    >
      <Heart size={17} fill={liked ? "currentColor" : "none"} />
    </button>
  );
}
