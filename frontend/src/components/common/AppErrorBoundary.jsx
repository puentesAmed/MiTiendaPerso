import { Component } from "react";
import { Button } from "../ui/button";

export class AppErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error) {
    if (import.meta.env.DEV) {
      console.error("Error no controlado en la aplicación:", error);
    }
  }

  render() {
    if (!this.state.hasError) return this.props.children;

    return (
      <main className="grid min-h-screen place-items-center bg-background px-4 text-foreground">
        <section className="w-full max-w-lg rounded-xl border bg-card p-6 text-center shadow-sm" role="alert">
          <p className="text-xs font-semibold uppercase tracking-wider text-primary">MiLuGui</p>
          <h1 className="mt-2 text-2xl font-bold tracking-tight">No pudimos mostrar esta página</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Se ha producido un error inesperado. Puedes recargar o volver al inicio.
          </p>
          <div className="mt-5 flex flex-wrap justify-center gap-2">
            <Button type="button" onClick={() => window.location.reload()}>Recargar</Button>
            <Button type="button" variant="outline" onClick={() => window.location.assign("/")}>Ir al inicio</Button>
          </div>
        </section>
      </main>
    );
  }
}
