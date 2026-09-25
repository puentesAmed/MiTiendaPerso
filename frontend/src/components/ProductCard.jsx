import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ShoppingCart, SlidersHorizontal, Sparkles } from "lucide-react";
import { useCart } from "../hooks/useCart";
import { Badge } from "./ui/badge";
import { Button } from "./ui/button";
import { Card } from "./ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "./ui/dialog";
import { Price } from "./ui/Price";
import { ProductImage } from "./ui/ProductImage";
import { ShineBorder } from "./ui/shine-border";

const PRODUCTS_SCROLL_KEY = "products_scroll_y";

export function ProductCard({ product }) {
  const { addItem, items } = useCart();
  const [isOpen, setIsOpen] = useState(false);
  const navigate = useNavigate();
  const productId = product?.id || product?._id;
  const name = product?.name || product?.title || "Producto";
  const description = product?.description || "";
  const category = product?.category;
  const mainImage = product?.image || (Array.isArray(product?.images) && product.images.length > 0 ? product.images[0] : null);
  const isCustomizable = !!product?.customizable;
  const hasNewVariantsArray = Array.isArray(product?.variants);
  const hasOldSizeVariants = product?.variants?.sizes?.length > 0;
  const hasOldColorVariants = product?.variants?.colors?.length > 0;
  const hasVariants = hasNewVariantsArray ? product.variants.length > 0 : hasOldSizeVariants || hasOldColorVariants;
  const availableVariantsCount = hasNewVariantsArray ? product.variants.filter((variant) => variant?.available !== false).length : null;
  const isAvailable = hasNewVariantsArray ? availableVariantsCount > 0 : (typeof product?.stock === "number" ? product.stock > 0 : true);
  const availabilityLabel = hasNewVariantsArray
    ? isAvailable ? `Disponibles: ${availableVariantsCount}` : "Sin stock"
    : typeof product?.stock === "number" && product.stock > 0 ? `Stock: ${product.stock}` : "Sin stock";

  const rememberProductsScroll = () => sessionStorage.setItem(PRODUCTS_SCROLL_KEY, String(window.scrollY || 0));
  const getProductsReturnState = () => ({ fromProducts: true, scrollY: window.scrollY || 0, productId });

  const handleAddToCart = () => {
    if (hasVariants) {
      rememberProductsScroll();
      navigate(`/productos/${productId}`, { state: getProductsReturnState() });
      return;
    }
    const isFirstItem = items.length === 0;
    addItem({ product, quantity: 1, variant: null, customization: null });
    if (isFirstItem) setIsOpen(true);
  };

  return (
    <>
      <Card data-product-id={productId} className="group relative flex h-full min-w-0 flex-col overflow-hidden transition duration-200 hover:-translate-y-0.5 hover:border-primary/35 hover:shadow-lg">
        <ShineBorder />
        <Link to={`/productos/${productId}`} state={getProductsReturnState()} onClick={rememberProductsScroll} className="block focus-visible:ring-inset">
          <ProductImage src={mainImage} alt={name} className="transition-transform duration-300 group-hover:scale-[1.015]" />
        </Link>
        <div className="flex flex-1 flex-col gap-3 p-3.5">
          <div className="flex min-w-0 flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
            <Link to={`/productos/${productId}`} state={getProductsReturnState()} onClick={rememberProductsScroll} className="min-w-0 hover:text-primary">
              <h3 className="text-[15px] font-semibold leading-snug [overflow-wrap:anywhere]">{name}</h3>
            </Link>
            <div className="flex shrink-0 flex-wrap gap-1 sm:justify-end">
              {category && <Badge>{category}</Badge>}
              {isCustomizable && <Badge variant="outline"><Sparkles /> Personalizable</Badge>}
              {hasNewVariantsArray && <Badge variant="outline"><SlidersHorizontal /> Variantes</Badge>}
            </div>
          </div>
          {description && <p className="line-clamp-2 text-sm leading-relaxed text-muted-foreground">{description}</p>}
          <div className="mt-auto flex flex-wrap items-center justify-between gap-2 pt-1">
            <Price value={product?.price} />
            <Badge variant={isAvailable ? "success" : "destructive"}>{availabilityLabel}</Badge>
          </div>
          <div className="grid gap-2 sm:grid-cols-2">
            <Button className={isCustomizable ? "w-full" : "w-full sm:col-span-2"} onClick={handleAddToCart} disabled={!isAvailable}>
              <ShoppingCart /> {hasVariants ? "Elegir opciones" : "Añadir"}
            </Button>
            {isCustomizable && <Button as={Link} to={hasVariants ? `/productos/${productId}` : `/personalizar/${productId}`} variant="outline" className="w-full"><Sparkles /> Personalizar</Button>}
          </div>
        </div>
      </Card>

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Producto añadido</DialogTitle><DialogDescription>El producto <strong>{name}</strong> se ha añadido al carrito.</DialogDescription></DialogHeader>
          <DialogFooter><Button variant="ghost" onClick={() => setIsOpen(false)}>Seguir comprando</Button><Button onClick={() => { setIsOpen(false); navigate("/carrito"); }}>Ir al carrito</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
