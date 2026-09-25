import { useEffect, useMemo, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import {
  ChevronDown,
  LogIn,
  LogOut,
  Menu,
  PackageSearch,
  Search,
  ShieldCheck,
  ShoppingBag,
  UserRound,
  X,
} from "lucide-react";
import { useAuth } from "../../hooks/useAuth";
import { useCart } from "../../hooks/useCart";
import { Logo } from "../common/Logo/Logo";
import { Badge } from "../ui/badge";
import { Button } from "../ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "../ui/dropdown-menu";
import { Input } from "../ui/input";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "../ui/sheet";
import { ThemeToggle } from "./ThemeToggle";

const primaryNav = [
  ["Inicio", "/"],
  ["Productos", "/productos"],
];

function getCatalogQuery(search) {
  return new URLSearchParams(search).get("q") || "";
}

function isRouteActive(pathname, to) {
  return to === "/" ? pathname === "/" || pathname === "/Inicio" : pathname === to || pathname.startsWith(`${to}/`);
}

function NavLink({ label, to, pathname, mobile = false }) {
  const active = isRouteActive(pathname, to);

  return (
    <Link
      to={to}
      aria-current={active ? "page" : undefined}
      className={mobile
        ? `flex min-h-11 items-center rounded-lg px-3 text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${active ? "bg-accent text-accent-foreground" : "hover:bg-accent/65"}`
        : `relative flex h-10 items-center rounded-lg px-3 text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${active ? "bg-accent/70 text-foreground after:absolute after:inset-x-3 after:bottom-1 after:h-0.5 after:rounded-full after:bg-primary" : "text-muted-foreground hover:bg-accent/45 hover:text-foreground"}`}
    >
      {label}
    </Link>
  );
}

function SearchForm({ value, onChange, onSubmit, compact = false }) {
  return (
    <form role="search" onSubmit={onSubmit} className="relative w-full">
      <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
      <Input
        type="search"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder="Buscar productos"
        aria-label="Buscar productos"
        className={`${compact ? "h-10" : "h-9"} border-border/80 bg-muted/45 pl-9 pr-16 focus:bg-background`}
      />
      <Button type="submit" size="sm" className="absolute right-1 top-1/2 h-7 -translate-y-1/2 px-2.5" aria-label="Buscar">
        Buscar
      </Button>
    </form>
  );
}

export function SiteHeader() {
  const { user, logout } = useAuth();
  const { items } = useCart();
  const location = useLocation();
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [mobileSearchOpen, setMobileSearchOpen] = useState(false);
  const [search, setSearch] = useState(() => getCatalogQuery(location.search));
  const [scrolled, setScrolled] = useState(false);

  const cartCount = useMemo(
    () => items?.reduce((total, item) => total + (Number(item.quantity) || 0), 0) ?? 0,
    [items],
  );

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 6);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    const syncRoute = setTimeout(() => {
      setMobileOpen(false);
      setMobileSearchOpen(false);
      setSearch(getCatalogQuery(location.search));
    }, 0);
    return () => clearTimeout(syncRoute);
  }, [location.pathname, location.search]);

  const submitSearch = (event) => {
    event.preventDefault();
    const query = search.trim();
    navigate(query ? `/productos?q=${encodeURIComponent(query)}` : "/productos");
  };

  const handleLogout = () => {
    logout();
    navigate("/login", { replace: true });
  };

  const accountLabel = user?.name || user?.email || "Mi cuenta";

  return (
    <header className={`sticky top-0 z-40 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/85 ${scrolled ? "shadow-sm" : ""}`}>
      <div className="mx-auto flex h-[58px] w-full max-w-[1440px] items-center gap-1.5 px-2.5 sm:px-4 lg:px-8">
        <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
          <SheetTrigger render={<Button type="button" variant="ghost" size="icon" className="size-11 md:hidden" aria-label="Abrir menú" />}>
            <Menu aria-hidden="true" />
          </SheetTrigger>
          <SheetContent side="left" className="flex flex-col p-4">
            <SheetHeader className="border-b pb-4 pr-10">
              <SheetTitle><Logo /></SheetTitle>
              <SheetDescription>Crea · Personaliza · Sorprende</SheetDescription>
            </SheetHeader>

            <nav aria-label="Navegación móvil" className="grid gap-1">
              {primaryNav.map(([label, to]) => <NavLink key={to} label={label} to={to} pathname={location.pathname} mobile />)}
              {user && <NavLink label="Mis pedidos" to="/mis-pedidos" pathname={location.pathname} mobile />}
              {user?.role === "admin" && <NavLink label="Administración" to="/admin" pathname={location.pathname} mobile />}
            </nav>

            <div className="mt-auto grid gap-2 border-t pt-4">
              <ThemeToggle showLabel />
              {user ? (
                <>
                  <div className="truncate px-3 text-xs text-muted-foreground">{accountLabel}</div>
                  <Button type="button" variant="outline" className="justify-start" onClick={handleLogout}><LogOut /> Cerrar sesión</Button>
                </>
              ) : (
                <div className="grid grid-cols-2 gap-2">
                  <Button as={Link} to="/login" variant="outline"><LogIn /> Entrar</Button>
                  <Button as={Link} to="/register">Crear cuenta</Button>
                </div>
              )}
            </div>
          </SheetContent>
        </Sheet>

        <Link to="/" className="shrink-0 rounded-md px-1 py-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" aria-label="MiTiendaPerso, inicio">
          <Logo className="text-base sm:text-lg" />
        </Link>

        <nav aria-label="Navegación principal" className="ml-3 hidden items-center gap-0.5 md:flex">
          {primaryNav.map(([label, to]) => <NavLink key={to} label={label} to={to} pathname={location.pathname} />)}
          {user && <NavLink label="Mis pedidos" to="/mis-pedidos" pathname={location.pathname} />}
          {user?.role === "admin" && <NavLink label="Admin" to="/admin" pathname={location.pathname} />}
        </nav>

        <div className="mx-auto hidden w-full max-w-md px-3 lg:block">
          <SearchForm value={search} onChange={setSearch} onSubmit={submitSearch} />
        </div>

        <div className="ml-auto flex items-center gap-0.5">
          <Button
            type="button"
            variant={mobileSearchOpen ? "secondary" : "ghost"}
            size="icon"
            className="size-11 lg:hidden"
            onClick={() => setMobileSearchOpen((open) => !open)}
            aria-label={mobileSearchOpen ? "Cerrar búsqueda" : "Abrir búsqueda"}
            aria-expanded={mobileSearchOpen}
          >
            {mobileSearchOpen ? <X aria-hidden="true" /> : <Search aria-hidden="true" />}
          </Button>

          <div className="hidden md:block"><ThemeToggle /></div>

          {user ? (
            <DropdownMenu>
              <DropdownMenuTrigger render={<Button type="button" variant="ghost" size="sm" className="hidden max-w-40 md:flex" aria-label={`Cuenta: ${accountLabel}`} />}>
                <UserRound aria-hidden="true" />
                <span className="truncate">{accountLabel}</span>
                <ChevronDown aria-hidden="true" />
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => navigate("/mis-pedidos")}><PackageSearch /> Mis pedidos</DropdownMenuItem>
                {user.role === "admin" && <DropdownMenuItem onClick={() => navigate("/admin")}><ShieldCheck /> Administración</DropdownMenuItem>}
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleLogout} className="text-destructive"><LogOut /> Cerrar sesión</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <Button as={Link} to="/login" variant="ghost" size="sm" className="hidden md:flex"><LogIn /> Entrar</Button>
          )}

          <Button as={Link} to="/carrito" variant="ghost" size="icon" className="relative size-11" aria-label={`Carrito${cartCount ? `, ${cartCount} unidades` : " vacío"}`}>
            <ShoppingBag aria-hidden="true" />
            {cartCount > 0 && <Badge variant="default" className="absolute -right-0.5 top-0 min-w-4 justify-center rounded-full px-1 text-[9px] leading-4">{cartCount > 99 ? "99+" : cartCount}</Badge>}
          </Button>
        </div>
      </div>

      {mobileSearchOpen && (
        <div className="border-t px-3 py-2 lg:hidden">
          <div className="mx-auto max-w-2xl">
            <SearchForm value={search} onChange={setSearch} onSubmit={submitSearch} compact />
          </div>
        </div>
      )}
    </header>
  );
}
