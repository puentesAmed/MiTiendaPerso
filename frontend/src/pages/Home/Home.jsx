import { createElement, useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  ArrowRight,
  Boxes,
  Check,
  PackageSearch,
  Palette,
  ShoppingBag,
  Sparkles,
} from "lucide-react";
import { ProductCard } from "../../components/ProductCard";
import { Badge } from "../../components/ui/badge";
import { Button } from "../../components/ui/button";
import { EmptyState } from "../../components/ui/EmptyState";
import { ErrorState } from "../../components/ui/ErrorState";
import { LoadingState } from "../../components/ui/LoadingState";
import { PageContainer } from "../../components/ui/PageContainer";
import { Price } from "../../components/ui/Price";
import { ProductImage } from "../../components/ui/ProductImage";
import { SectionHeader } from "../../components/ui/SectionHeader";
import { ShineBorder } from "../../components/ui/shine-border";
import { apiGetProducts } from "../../services/products.service";

const FEATURED_PRODUCT_LIMIT = 4;
const FEATURED_CATEGORY_LIMIT = 3;

function productIdentity(product) {
  return {
    id: product?.id || product?._id,
    name: product?.name || product?.title || "Producto",
    image: product?.image || (Array.isArray(product?.images) ? product.images[0] : null),
  };
}

function hasVariants(product) {
  if (Array.isArray(product?.variants)) return product.variants.length > 0;
  return Boolean(product?.variants?.sizes?.length || product?.variants?.colors?.length);
}

function personalizationPath(product) {
  const id = product?.id || product?._id;
  if (!id || !product?.customizable) return "/productos";
  return hasVariants(product) ? `/productos/${id}` : `/personalizar/${id}`;
}

function categoryLabel(value) {
  if (!value) return "Categoría";
  return value.charAt(0).toLocaleUpperCase() + value.slice(1);
}

function HomeHero({ products }) {
  const heroProduct = products.find((product) => product?.customizable) || products[0] || null;
  const heroIdentity = productIdentity(heroProduct);
  const supportingProducts = products.filter((product) => product !== heroProduct).slice(0, 2);

  return (
    <section className="relative overflow-hidden border-b bg-muted/20">
      <PageContainer size="wide" className="grid min-h-[420px] items-center gap-8 py-8 md:grid-cols-[minmax(0,1fr)_minmax(320px,0.88fr)] md:py-10 lg:min-h-[460px] lg:gap-12 lg:py-14">
        <div className="max-w-2xl">
          <Badge variant="outline" className="mb-4"><Sparkles /> Productos personalizables</Badge>
          <h1 className="max-w-2xl text-4xl font-extrabold leading-[1.05] tracking-tight sm:text-5xl lg:text-6xl">
            Hazlo tuyo, desde el primer detalle.
          </h1>
          <p className="mt-4 max-w-xl text-base leading-relaxed text-muted-foreground sm:text-lg">
            Explora productos, elige tus opciones y crea una pieza personalizada desde la propia tienda.
          </p>
          <div className="mt-6 flex flex-wrap gap-2.5">
            <Button as={Link} to="/productos" size="lg">Ver productos <ArrowRight /></Button>
            <Button as={Link} to={heroProduct?.customizable ? personalizationPath(heroProduct) : "/#personalizacion"} variant="outline" size="lg">
              {heroProduct?.customizable ? "Personalizar" : "Cómo funciona"}
              {heroProduct?.customizable ? <Palette /> : <ArrowRight />}
            </Button>
          </div>
        </div>

        <div className="relative mx-auto w-full max-w-xl" aria-label="Selección de productos de la tienda">
          <div className="group relative overflow-hidden rounded-2xl border bg-card p-3 shadow-lg motion-reduce:transition-none md:p-4">
            <ShineBorder />
            {heroProduct ? (
              <Link to={`/productos/${heroIdentity.id}`} className="grid min-h-64 grid-cols-[minmax(0,1fr)_7rem] gap-3 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring sm:grid-cols-[minmax(0,1fr)_9rem]">
                <ProductImage src={heroIdentity.image} alt={heroIdentity.name} ratio="4 / 3" className="rounded-xl" imageProps={{ loading: "eager" }} />
                <span className="flex min-w-0 flex-col justify-between py-1">
                  <span>
                    {heroProduct.category && <Badge variant="secondary">{categoryLabel(heroProduct.category)}</Badge>}
                    <strong className="mt-3 block text-lg leading-snug [overflow-wrap:anywhere]">{heroIdentity.name}</strong>
                  </span>
                  <Price value={heroProduct.price} className="text-base" />
                </span>
              </Link>
            ) : (
              <div className="flex min-h-64 flex-col items-center justify-center rounded-xl bg-muted/45 p-6 text-center">
                <Palette className="mb-3 size-10 text-primary" aria-hidden="true" />
                <strong>Tu diseño empieza aquí</strong>
                <span className="mt-1 text-sm text-muted-foreground">Elige un producto para comenzar.</span>
              </div>
            )}
          </div>

          {supportingProducts.length > 0 && (
            <div className="absolute -bottom-5 right-4 hidden gap-2 sm:flex">
              {supportingProducts.map((product) => {
                const identity = productIdentity(product);
                return (
                  <Link key={identity.id} to={`/productos/${identity.id}`} className="rounded-xl border bg-background p-1.5 shadow-md transition-transform hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring motion-reduce:transform-none motion-reduce:transition-none">
                    <ProductImage src={identity.image} alt={identity.name} ratio="1 / 1" className="size-20 rounded-lg" />
                  </Link>
                );
              })}
            </div>
          )}
        </div>
      </PageContainer>
    </section>
  );
}

function FeaturedCategories({ categories }) {
  if (categories.length === 0) return null;

  return (
    <section aria-labelledby="featured-categories-title">
      <SectionHeader title="Categorías destacadas" titleId="featured-categories-title" description="Explora algunas de las categorías disponibles en el catálogo." />
      <div className="grid gap-3 sm:grid-cols-3">
        {categories.map(({ category, product }) => {
          const identity = productIdentity(product);
          return (
            <Link key={category} to="/productos" className="group relative min-h-36 overflow-hidden rounded-xl border bg-card focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
              <ProductImage src={identity.image} alt="" ratio="16 / 7" className="h-full transition-transform duration-300 group-hover:scale-[1.02] motion-reduce:transform-none motion-reduce:transition-none" />
              <span className="absolute inset-x-0 bottom-0 flex items-center justify-between bg-background/92 px-4 py-3 backdrop-blur-sm">
                <strong>{categoryLabel(category)}</strong>
                <ArrowRight className="size-4 text-muted-foreground transition-transform group-hover:translate-x-0.5 motion-reduce:transform-none motion-reduce:transition-none" aria-hidden="true" />
              </span>
            </Link>
          );
        })}
      </div>
    </section>
  );
}

function FeaturedProducts({ products, loading, error, onRetry }) {
  return (
    <section aria-labelledby="featured-products-title">
      <SectionHeader
        title="Productos destacados"
        titleId="featured-products-title"
        description="Una selección breve del catálogo actual."
        actions={<Button as={Link} to="/productos" variant="outline" size="sm">Ver catálogo <ArrowRight /></Button>}
      />
      {loading && <LoadingState message="Cargando productos destacados…" />}
      {!loading && error && <ErrorState description={error} onRetry={onRetry} />}
      {!loading && !error && products.length === 0 && <EmptyState title="No hay productos destacados" description="El catálogo no tiene productos disponibles en este momento." action={<Button as={Link} to="/productos" variant="outline">Ver catálogo</Button>} />}
      {!loading && !error && products.length > 0 && (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {products.map((product) => <ProductCard key={product.id || product._id} product={product} />)}
        </div>
      )}
    </section>
  );
}

function PersonalizationSteps() {
  const steps = [
    { icon: Boxes, title: "Elige producto", text: "Abre un producto del catálogo y revisa sus opciones." },
    { icon: Palette, title: "Personalízalo", text: "Añade tu diseño cuando el producto permita personalización." },
    { icon: ShoppingBag, title: "Añádelo al pedido", text: "Confirma las opciones y continúa desde el carrito." },
  ];

  return (
    <section id="personalizacion" aria-labelledby="personalization-title" className="rounded-2xl border bg-muted/30 p-5 sm:p-6">
      <SectionHeader title="Personaliza en tres pasos" titleId="personalization-title" description="Un flujo directo dentro de la tienda." actions={<Button as={Link} to="/productos" size="sm">Elegir producto <ArrowRight /></Button>} />
      <ol className="grid gap-4 md:grid-cols-3">
        {steps.map(({ icon, title, text }, index) => (
          <li key={title} className="flex gap-3 border-t pt-4 md:border-l md:border-t-0 md:pl-4 md:pt-0">
            <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-primary/10 text-primary">{createElement(icon, { className: "size-4", "aria-hidden": true })}</span>
            <span><small className="text-xs font-semibold text-muted-foreground">0{index + 1}</small><strong className="block text-sm">{title}</strong><span className="mt-1 block text-sm leading-relaxed text-muted-foreground">{text}</span></span>
          </li>
        ))}
      </ol>
    </section>
  );
}

function HomeBenefits() {
  const benefits = [
    { icon: Sparkles, title: "Productos personalizables", text: "Identificados directamente en el catálogo." },
    { icon: Boxes, title: "Opciones y variantes", text: "Selección desde el detalle cuando el producto las incluye." },
    { icon: PackageSearch, title: "Seguimiento de pedidos", text: "Consulta el estado desde la herramienta de seguimiento." },
  ];

  return (
    <section aria-labelledby="home-benefits-title">
      <h2 id="home-benefits-title" className="sr-only">Servicios disponibles</h2>
      <ul className="grid gap-3 sm:grid-cols-3">
        {benefits.map(({ icon, title, text }) => (
          <li key={title} className="flex gap-3 rounded-xl border p-4">
            {createElement(icon, { className: "mt-0.5 size-5 shrink-0 text-primary", "aria-hidden": true })}
            <span><strong className="block text-sm">{title}</strong><span className="mt-1 block text-xs leading-relaxed text-muted-foreground">{text}</span></span>
          </li>
        ))}
      </ul>
    </section>
  );
}

export function Home() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadProducts = useCallback(async () => {
    try {
      setLoading(true);
      setError("");
      setProducts(await apiGetProducts());
    } catch (requestError) {
      console.error(requestError);
      setProducts([]);
      setError("No pudimos cargar los productos destacados.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadProducts();
  }, [loadProducts]);

  const featuredProducts = products.slice(0, FEATURED_PRODUCT_LIMIT);
  const categories = useMemo(() => {
    const byCategory = new Map();
    products.forEach((product) => {
      if (product?.category && !byCategory.has(product.category)) byCategory.set(product.category, product);
    });
    return [...byCategory.entries()].slice(0, FEATURED_CATEGORY_LIMIT).map(([category, product]) => ({ category, product }));
  }, [products]);

  return (
    <div className="min-w-0 bg-background">
      <HomeHero products={featuredProducts} />
      <PageContainer size="wide" className="space-y-10 py-8 sm:space-y-12 sm:py-10 lg:space-y-14 lg:py-12">
        <FeaturedCategories categories={categories} />
        <FeaturedProducts products={featuredProducts} loading={loading} error={error} onRetry={loadProducts} />
        <PersonalizationSteps />
        <HomeBenefits />

        <section className="flex flex-col gap-4 rounded-2xl border bg-primary px-5 py-6 text-primary-foreground sm:flex-row sm:items-center sm:justify-between sm:px-7">
          <div>
            <span className="mb-1 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider opacity-80"><Check className="size-4" /> Catálogo y personalización</span>
            <h2 className="text-xl font-bold sm:text-2xl">Elige el producto que quieres hacer tuyo.</h2>
          </div>
          <div className="flex shrink-0 flex-wrap gap-2">
            <Button as={Link} to="/productos" variant="secondary">Ver productos <ArrowRight /></Button>
            <Button as={Link} to="/seguimiento-pedido" variant="outline" className="border-primary-foreground/35 bg-transparent text-primary-foreground hover:bg-primary-foreground/10 hover:text-primary-foreground">Seguir un pedido</Button>
          </div>
        </section>
      </PageContainer>
    </div>
  );
}
