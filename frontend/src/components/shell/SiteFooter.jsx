import { Link } from "react-router-dom";

const footerLinks = [
  ["Productos", "/productos"],
  ["Seguimiento", "/seguimiento-pedido"],
  ["Aviso legal", "/aviso-legal"],
  ["Términos", "/terminos-condiciones"],
  ["Privacidad", "/politica-privacidad"],
  ["Contacto", "/contacto-legal"],
];

export function SiteFooter() {
  return (
    <footer className="border-t bg-muted/25">
      <div className="mx-auto flex w-full max-w-[1440px] flex-col gap-3 px-4 py-4 text-xs text-muted-foreground sm:flex-row sm:items-center sm:justify-between sm:px-6 lg:px-8">
        <span className="font-medium text-foreground/75">© {new Date().getFullYear()} MiLuGui</span>
        <nav aria-label="Navegación del pie" className="flex flex-wrap gap-x-4 gap-y-2">
          {footerLinks.map(([label, to]) => (
            <Link key={to} to={to} className="rounded-sm underline-offset-4 transition-colors hover:text-foreground hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
              {label}
            </Link>
          ))}
        </nav>
      </div>
    </footer>
  );
}
