import { useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Clock3, Search, Trash2 } from "lucide-react";
import { apiGetProducts } from "../../services/products.service";
import { Button } from "../ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "../ui/dialog";
import { Input } from "../ui/input";
import { Price } from "../ui/Price";
import { ProductImage } from "../ui/ProductImage";
import { Skeleton } from "../ui/skeleton";

const RECENT_SEARCHES_KEY = "miTienda_recent_searches_v1";
const MAX_RECENT_SEARCHES = 6;
const MAX_QUICK_RESULTS = 6;
const SEARCH_DEBOUNCE_MS = 300;

function normalizeSearch(value) {
  return value.trim().replace(/\s+/g, " ");
}

function readRecentSearches() {
  try {
    const value = JSON.parse(localStorage.getItem(RECENT_SEARCHES_KEY) || "[]");
    return Array.isArray(value) ? value.filter((item) => typeof item === "string").slice(0, MAX_RECENT_SEARCHES) : [];
  } catch {
    return [];
  }
}

function productIdentity(product) {
  return {
    id: product?.id || product?._id,
    name: product?.name || product?.title || "Producto",
    image: product?.image || (Array.isArray(product?.images) ? product.images[0] : null),
  };
}

export function GlobalSearchDialog() {
  const navigate = useNavigate();
  const inputRef = useRef(null);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [recentSearches, setRecentSearches] = useState(readRecentSearches);
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const normalizedQuery = normalizeSearch(query);

  useEffect(() => {
    if (!open) return undefined;
    const focusInput = setTimeout(() => inputRef.current?.focus(), 0);
    return () => clearTimeout(focusInput);
  }, [open]);

  useEffect(() => {
    if (!open || !normalizedQuery) {
      const resetResults = setTimeout(() => {
        setResults([]);
        setLoading(false);
        setError("");
      }, 0);
      return () => clearTimeout(resetResults);
    }

    let active = true;
    const searchProducts = setTimeout(async () => {
      setLoading(true);
      setError("");
      try {
        const products = await apiGetProducts({ q: normalizedQuery });
        if (active) setResults(products.slice(0, MAX_QUICK_RESULTS));
      } catch (requestError) {
        console.error(requestError);
        if (active) {
          setResults([]);
          setError("No pudimos cargar los resultados rápidos.");
        }
      } finally {
        if (active) setLoading(false);
      }
    }, SEARCH_DEBOUNCE_MS);

    return () => {
      active = false;
      clearTimeout(searchProducts);
    };
  }, [normalizedQuery, open]);

  const persistRecentSearches = (items) => {
    setRecentSearches(items);
    localStorage.setItem(RECENT_SEARCHES_KEY, JSON.stringify(items));
  };

  const rememberSearch = (value) => {
    const normalized = normalizeSearch(value);
    if (!normalized) return;
    const next = [normalized, ...recentSearches.filter((item) => item.toLocaleLowerCase() !== normalized.toLocaleLowerCase())]
      .slice(0, MAX_RECENT_SEARCHES);
    persistRecentSearches(next);
  };

  const openCatalog = (value = normalizedQuery) => {
    const normalized = normalizeSearch(value);
    if (normalized) rememberSearch(normalized);
    setOpen(false);
    navigate(normalized ? `/productos?q=${encodeURIComponent(normalized)}` : "/productos");
  };

  const handleOpenChange = (nextOpen) => {
    setOpen(nextOpen);
    if (nextOpen) {
      setQuery("");
      setResults([]);
      setError("");
    }
  };

  const handleQueryChange = (value) => {
    const hasQuery = Boolean(normalizeSearch(value));
    setQuery(value);
    setResults([]);
    setError("");
    setLoading(hasQuery);
  };

  const removeRecentSearch = (value) => {
    persistRecentSearches(recentSearches.filter((item) => item !== value));
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger render={<Button type="button" variant="ghost" size="sm" className="size-11 px-0 lg:h-9 lg:w-auto lg:px-3" aria-label="Abrir búsqueda global" />}>
        <Search aria-hidden="true" />
        <span className="hidden lg:inline">Buscar</span>
      </DialogTrigger>
      <DialogContent className="max-h-[min(42rem,calc(100vh-2rem))] max-w-xl overflow-hidden p-0">
        <DialogHeader className="border-b px-5 pb-4 pt-5 pr-12">
          <DialogTitle>Buscar productos</DialogTitle>
          <DialogDescription>Encuentra productos desde cualquier parte de la tienda.</DialogDescription>
        </DialogHeader>

        <form onSubmit={(event) => { event.preventDefault(); openCatalog(); }} className="relative px-5 pt-4" role="search">
          <Search className="pointer-events-none absolute left-8 top-[2.1rem] size-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
          <Input
            ref={inputRef}
            type="search"
            value={query}
            onChange={(event) => handleQueryChange(event.target.value)}
            placeholder="Buscar..."
            aria-label="Buscar productos"
            autoComplete="off"
            className="h-11 pl-10"
          />
        </form>

        <div className="min-h-44 overflow-y-auto px-5 pb-5 pt-4" aria-live="polite">
          {!normalizedQuery && (
            <section aria-labelledby="recent-searches-title">
              <div className="mb-2 flex items-center justify-between gap-3">
                <h3 id="recent-searches-title" className="text-sm font-semibold">Búsquedas recientes</h3>
                {recentSearches.length > 0 && <Button type="button" variant="ghost" size="sm" onClick={() => persistRecentSearches([])}>Limpiar historial</Button>}
              </div>
              {recentSearches.length === 0 ? (
                <p className="rounded-lg border border-dashed p-4 text-sm text-muted-foreground">Aún no hay búsquedas recientes.</p>
              ) : (
                <ul className="grid gap-1">
                  {recentSearches.map((recent) => (
                    <li key={recent} className="flex min-w-0 items-center gap-1 rounded-lg hover:bg-accent/55">
                      <button type="button" onClick={() => openCatalog(recent)} className="flex min-h-10 min-w-0 flex-1 items-center gap-2 rounded-lg px-2 text-left text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
                        <Clock3 className="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
                        <span className="truncate">{recent}</span>
                      </button>
                      <Button type="button" variant="ghost" size="icon" className="size-9" onClick={() => removeRecentSearch(recent)} aria-label={`Eliminar búsqueda ${recent}`} title="Eliminar búsqueda"><Trash2 /></Button>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          )}

          {normalizedQuery && loading && (
            <div className="grid gap-2" aria-label="Buscando productos">
              {[0, 1, 2].map((item) => <div key={item} className="flex items-center gap-3 rounded-lg border p-2"><Skeleton className="size-12 shrink-0" /><div className="flex-1 space-y-2"><Skeleton className="h-3 w-2/3" /><Skeleton className="h-3 w-1/3" /></div></div>)}
            </div>
          )}

          {normalizedQuery && !loading && error && (
            <div className="rounded-lg border border-destructive/35 p-4">
              <p className="text-sm text-destructive">{error}</p>
              <Button type="button" variant="outline" size="sm" className="mt-3" onClick={() => openCatalog()}>Ver catálogo</Button>
            </div>
          )}

          {normalizedQuery && !loading && !error && results.length === 0 && (
            <div className="rounded-lg border border-dashed p-4">
              <p className="text-sm">No encontramos productos para “{normalizedQuery}”.</p>
              <Button type="button" variant="outline" size="sm" className="mt-3" onClick={() => openCatalog()}>Ver catálogo</Button>
            </div>
          )}

          {normalizedQuery && !loading && !error && results.length > 0 && (
            <ul className="grid gap-1">
              {results.map((product) => {
                const identity = productIdentity(product);
                return (
                  <li key={identity.id}>
                    <Link
                      to={`/productos/${identity.id}`}
                      onClick={() => { rememberSearch(normalizedQuery); setOpen(false); }}
                      className="flex min-w-0 items-center gap-3 rounded-lg p-2 transition-colors hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    >
                      <ProductImage src={identity.image} alt="" className="size-12 shrink-0 rounded-md" />
                      <span className="min-w-0 flex-1">
                        <strong className="block truncate text-sm">{identity.name}</strong>
                        {product.category && <small className="block truncate text-muted-foreground">{product.category}</small>}
                      </span>
                      <Price value={product.price} className="shrink-0 text-sm" />
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}

          {normalizedQuery && !loading && !error && (
            <Button type="button" variant="ghost" className="mt-3 w-full justify-between" onClick={() => openCatalog()}>
              <span className="truncate">Ver todos los resultados para “{normalizedQuery}”</span>
              <span aria-hidden="true">→</span>
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
