import { useCart } from "../hooks/useCart";
import Button from "./ui/Button";

export function ProductCard({ product }) {
  const { addItem } = useCart();

  return (
    <article className="product-card">
      <img src={product.image} alt={product.name} />
      <h3>{product.name}</h3>
      <p>{product.price.toFixed(2)} €</p>
      <Button type="button" onClick={() => addItem(product, 1)}>
        Añadir al carrito
      </Button>
    </article>
  );
}
