import { useEffect, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import {
  ChevronDown,
  LogIn,
  LogOut,
  Menu,
  PackageSearch,
  ShieldCheck,
  ShoppingBag,
  UserRound,
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
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "../ui/sheet";
import { ThemeToggle } from "./ThemeToggle";
import { GlobalSearchDialog } from "./GlobalSearchDialog";

const primaryNav = [
  ["Inicio", "/"],
  ["Productos", "/productos"],
];

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

export function SiteHeader() {
  const { user, logout } = useAuth();
  const { totalItems, cartPulse, cartPulseKey } = useCart();
  const location = useLocation();
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 6);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    const syncRoute = setTimeout(() => {
      setMobileOpen(false);
    }, 0);
    return () => clearTimeout(syncRoute);
  }, [location.pathname]);

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
        </nav>

        <div className="ml-auto flex items-center gap-0.5">
          <GlobalSearchDialog />

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

          <Button as={Link} to="/carrito" variant="ghost" size="icon" data-cart-target className="relative size-11" aria-label={`Carrito${totalItems ? `, ${totalItems} unidades` : " vacío"}`}>
            <span key={cartPulseKey} className={cartPulse ? "animate-bounce motion-reduce:animate-none" : ""}><ShoppingBag aria-hidden="true" /></span>
            {totalItems > 0 && <Badge variant="default" className="absolute -right-0.5 top-0 min-w-4 justify-center rounded-full px-1 text-[9px] leading-4">{totalItems > 99 ? "99+" : totalItems}</Badge>}
          </Button>
        </div>
      </div>

    </header>
  );
}
