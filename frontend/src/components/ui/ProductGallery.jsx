import { useMemo, useRef, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { ProductImage } from "./ProductImage";

const SWIPE_THRESHOLD_PX = 44;

export function ProductGallery({ images = [], productName = "Producto", className }) {
  const normalizedImages = useMemo(
    () => [...new Set(images.filter((image) => typeof image === "string" && image.trim()))],
    [images],
  );
  const [selectedImage, setSelectedImage] = useState(null);
  const pointerStartXRef = useRef(null);
  const hasMultipleImages = normalizedImages.length > 1;
  const selectedIndex = normalizedImages.indexOf(selectedImage);
  const activeIndex = selectedIndex >= 0 ? selectedIndex : 0;
  const activeImage = normalizedImages[activeIndex] || null;

  const showPrevious = () => {
    const previousIndex = (activeIndex - 1 + normalizedImages.length) % normalizedImages.length;
    setSelectedImage(normalizedImages[previousIndex]);
  };

  const showNext = () => {
    const nextIndex = (activeIndex + 1) % normalizedImages.length;
    setSelectedImage(normalizedImages[nextIndex]);
  };

  const handlePointerDown = (event) => {
    pointerStartXRef.current = event.clientX;
  };

  const handlePointerUp = (event) => {
    if (pointerStartXRef.current == null || !hasMultipleImages) return;
    const deltaX = event.clientX - pointerStartXRef.current;
    pointerStartXRef.current = null;
    if (Math.abs(deltaX) < SWIPE_THRESHOLD_PX) return;
    if (deltaX < 0) showNext();
    else showPrevious();
  };

  return (
    <section className={cn("min-w-0", className)} aria-label={`Galería de ${productName}`}>
      <div
        className="group relative touch-pan-y overflow-hidden rounded-xl border bg-card shadow-card"
        onPointerDown={handlePointerDown}
        onPointerUp={handlePointerUp}
        onPointerCancel={() => { pointerStartXRef.current = null; }}
      >
        <ProductImage
          src={activeImage}
          alt={activeImage ? `${productName}, imagen ${activeIndex + 1} de ${normalizedImages.length}` : productName}
          ratio="1 / 1"
          loading="eager"
          className="max-h-[42rem] w-full"
          imageProps={{ draggable: false }}
        />

        {hasMultipleImages && (
          <>
            <button
              type="button"
              onClick={showPrevious}
              aria-label="Mostrar imagen anterior"
              className="absolute left-2 top-1/2 inline-flex size-10 -translate-y-1/2 items-center justify-center rounded-lg border bg-background/90 text-foreground shadow-sm transition-colors hover:bg-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring motion-reduce:transition-none"
            >
              <ChevronLeft className="size-5" aria-hidden="true" />
            </button>
            <button
              type="button"
              onClick={showNext}
              aria-label="Mostrar imagen siguiente"
              className="absolute right-2 top-1/2 inline-flex size-10 -translate-y-1/2 items-center justify-center rounded-lg border bg-background/90 text-foreground shadow-sm transition-colors hover:bg-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring motion-reduce:transition-none"
            >
              <ChevronRight className="size-5" aria-hidden="true" />
            </button>
          </>
        )}
      </div>

      {hasMultipleImages && (
        <div className="mt-2 flex gap-2 overflow-x-auto pb-1" aria-label="Miniaturas del producto">
          {normalizedImages.map((image, index) => (
            <button
              key={image}
              type="button"
              onClick={() => setSelectedImage(image)}
              aria-label={`Mostrar imagen ${index + 1}`}
              aria-pressed={activeIndex === index}
              className={cn(
                "w-16 shrink-0 overflow-hidden rounded-lg border-2 bg-card transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring motion-reduce:transition-none sm:w-[4.5rem]",
                activeIndex === index ? "border-primary" : "border-transparent hover:border-border",
              )}
            >
              <ProductImage src={image} alt="" ratio="1 / 1" className="rounded-md" />
            </button>
          ))}
        </div>
      )}

      {normalizedImages.length > 0 && (
        <p className="sr-only" aria-live="polite">Imagen {activeIndex + 1} de {normalizedImages.length}</p>
      )}
    </section>
  );
}
