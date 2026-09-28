import { Link, useLocation } from "react-router-dom";
import { Button } from "../../components/ui/button";
import { PageContainer } from "../../components/ui/PageContainer";

export function NotFound() {
  const location = useLocation();

  return (
    <PageContainer className="grid min-h-[55vh] place-items-center py-10">
      <section className="w-full max-w-xl rounded-xl border bg-card p-6 text-center shadow-sm">
        <p className="text-sm font-semibold text-primary">Error 404</p>
        <h1 className="mt-1 text-2xl font-bold tracking-tight">Ruta no encontrada</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          No existe contenido en <span className="break-all font-medium text-foreground">{location.pathname}</span>.
        </p>
        <div className="mt-5 flex flex-wrap justify-center gap-2">
          <Button as={Link} to="/">Volver al inicio</Button>
          <Button as={Link} to="/productos" variant="outline">Ver productos</Button>
        </div>
      </section>
    </PageContainer>
  );
}
