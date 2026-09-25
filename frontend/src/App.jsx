import { useEffect, useState } from "react";
import { Link, Outlet, useLocation, useNavigate } from "react-router-dom";
import { ChevronDown, Menu, Moon, ShoppingBag, Sun } from "lucide-react";
import { useAuth } from "./hooks/useAuth";
import { useCart } from "./hooks/useCart";
import { useTheme } from "./components/theme-provider";
import { Logo } from "./components/common/Logo/Logo";
import { CookieNotice } from "./components/common/CookieNotice";
import { Badge } from "./components/ui/badge";
import { Button } from "./components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "./components/ui/dropdown-menu";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from "./components/ui/sheet";

const navItems = [
  ["Inicio", "/"],
  ["Productos", "/productos"],
  ["Carrito", "/carrito"],
];

export function App() {
  const { user, logout } = useAuth();
  const { items } = useCart();
  const { theme, toggleTheme } = useTheme();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const cartCount = items?.reduce((total, item) => total + (item.quantity || 0), 0) ?? 0;

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 6);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    const closeMenu = setTimeout(() => setMobileOpen(false), 0);
    return () => clearTimeout(closeMenu);
  }, [location.pathname]);

  const handleLogout = () => {
    logout();
    navigate("/login", { replace: true });
  };

  return (
    <div className="flex min-h-screen flex-col bg-background text-foreground">
      <header className={`sticky top-0 z-40 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/82 ${scrolled ? "shadow-sm" : ""}`}>
        <div className="mx-auto flex h-16 w-full max-w-[1440px] items-center gap-2 px-3 sm:px-5 lg:px-8">
          <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
            <SheetTrigger as={Button} variant="ghost" size="icon" className="md:hidden" aria-label="Abrir menú"><Menu /></SheetTrigger>
            <SheetContent side="left">
              <SheetHeader><SheetTitle className="font-semibold">MiTiendaPerso</SheetTitle><SheetDescription className="text-sm text-muted-foreground">Crea · Personaliza · Sorprende</SheetDescription></SheetHeader>
              <nav className="grid gap-1">
                {navItems.map(([label, to]) => <Button key={to} as={Link} to={to} variant="ghost" className="justify-start">{label}{to === "/carrito" && cartCount > 0 && <Badge className="ml-auto">{cartCount}</Badge>}</Button>)}
                {user?.role === "admin" && <Button as={Link} to="/admin" variant="ghost" className="justify-start">Admin</Button>}
              </nav>
            </SheetContent>
          </Sheet>

          <Link to="/" className="flex min-w-0 items-center gap-2 rounded-lg">
            <span className="grid size-10 shrink-0 place-items-center overflow-hidden rounded-xl bg-primary text-primary-foreground shadow-sm"><Logo /></span>
            <span className="hidden min-w-0 leading-tight sm:block"><strong className="block truncate text-sm font-extrabold">MiTiendaPerso</strong><small className="block truncate text-[11px] text-muted-foreground">Crea · Personaliza · Sorprende</small></span>
          </Link>

          <nav className="ml-4 hidden items-center gap-1 md:flex">
            {navItems.map(([label, to]) => <Button key={to} as={Link} to={to} variant={location.pathname === to ? "secondary" : "ghost"} size="sm" className="relative">{label}{to === "/carrito" && cartCount > 0 && <Badge className="ml-1">{cartCount}</Badge>}</Button>)}
            {user?.role === "admin" && <Button as={Link} to="/admin" variant="ghost" size="sm">Admin</Button>}
          </nav>

          <div className="ml-auto flex items-center gap-1.5">
            <Button variant="ghost" size="icon" onClick={toggleTheme} aria-label={theme === "light" ? "Activar modo oscuro" : "Activar modo claro"}>{theme === "light" ? <Moon /> : <Sun />}</Button>
            {user ? (
              <DropdownMenu>
                <DropdownMenuTrigger as={Button} variant="outline" size="sm" className="max-w-44"><span className="truncate">{user.name || user.email}</span><ChevronDown /></DropdownMenuTrigger>
                <DropdownMenuContent>
                  <DropdownMenuItem onClick={() => navigate("/perfil")}>Perfil</DropdownMenuItem>
                  <DropdownMenuItem onClick={() => navigate("/mis-pedidos")}>Mis pedidos</DropdownMenuItem>
                  <DropdownMenuItem onClick={() => navigate("/ayuda")}>Ayuda</DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={handleLogout} className="text-destructive">Cerrar sesión</DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : <Button as={Link} to="/login" size="sm">Entrar</Button>}
          </div>
        </div>
      </header>

      <main className="min-w-0 flex-1"><Outlet /></main>

      <footer className="border-t bg-muted/35">
        <div className="mx-auto flex w-full max-w-7xl flex-col gap-3 px-4 py-5 text-xs text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
          <span>© {new Date().getFullYear()} MiLuGui</span>
          <nav className="flex flex-wrap gap-x-4 gap-y-2"><Link to="/aviso-legal">Aviso Legal</Link><Link to="/terminos-condiciones">Términos y Condiciones</Link><Link to="/politica-privacidad">Privacidad</Link><Link to="/contacto-legal">Contacto legal</Link></nav>
        </div>
      </footer>
      <CookieNotice />
    </div>
  );
}
