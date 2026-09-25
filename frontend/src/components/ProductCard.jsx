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

const PRODUCTS_SCROLL_KEY = "products_scroll_y";

export function ProductCard({ product }) {
  const { addItem, items } = useCart();
  const [isOpen, setIsOpen] = useState(false);
  const navigate = useNavigate();
  const productId = product?.id || product?._id;
  const name = product?.name || product?.title || "Producto";
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
      <Card data-product-id={productId} className="group relative flex h-full min-w-0 flex-col overflow-hidden transition duration-200 hover:-translate-y-0.5 hover:border-primary/35 hover:shadow-lg motion-reduce:transform-none motion-reduce:transition-none">
        <Link to={`/productos/${productId}`} state={getProductsReturnState()} onClick={rememberProductsScroll} className="block focus-visible:ring-inset">
          <ProductImage src={mainImage} alt={name} className="transition-transform duration-300 group-hover:scale-[1.015] motion-reduce:transform-none motion-reduce:transition-none" />
        </Link>
        <div className="flex flex-1 flex-col gap-2.5 p-2.5 sm:p-3">
          <div className="flex min-h-5 flex-wrap gap-1">
            {isCustomizable && <Badge variant="outline" className="gap-1 px-1.5"><Sparkles /> Personalizable</Badge>}
            {hasNewVariantsArray && <Badge variant="outline" className="gap-1 px-1.5"><SlidersHorizontal /> Variantes</Badge>}
          </div>
          <div className="min-w-0">
            <Link to={`/productos/${productId}`} state={getProductsReturnState()} onClick={rememberProductsScroll} className="hover:text-primary">
              <h3 className="line-clamp-2 min-h-10 text-sm font-semibold leading-5 [overflow-wrap:anywhere] sm:text-[15px]">{name}</h3>
            </Link>
          </div>
          <div className="mt-auto flex flex-wrap items-center justify-between gap-1.5 pt-0.5">
            <Price value={product?.price} className="text-base sm:text-lg" />
            <Badge variant={isAvailable ? "success" : "destructive"} className="px-1.5">{availabilityLabel}</Badge>
          </div>
          <div className="grid gap-1.5 sm:grid-cols-2">
            <Button size="sm" className={isCustomizable ? "w-full" : "w-full sm:col-span-2"} onClick={handleAddToCart} disabled={!isAvailable}>
              <ShoppingCart /> {hasVariants ? "Elegir opciones" : "Añadir"}
            </Button>
            {isCustomizable && <Button as={Link} to={hasVariants ? `/productos/${productId}` : `/personalizar/${productId}`} variant="outline" size="sm" className="w-full"><Sparkles /> Personalizar</Button>}
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
