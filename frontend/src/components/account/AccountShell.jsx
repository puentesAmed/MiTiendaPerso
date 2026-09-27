import { NavLink } from "react-router-dom";
import { PackageSearch } from "lucide-react";
import { useAuth } from "../../hooks/useAuth";
import { PageContainer } from "../ui/PageContainer";

export function AccountShell({ children }) {
  const { user } = useAuth();

  return (
    <PageContainer>
      <header className="mb-4">
        <p className="text-sm font-medium text-primary">Cuenta</p>
        <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Mi cuenta</h1>
        {user?.email && <p className="mt-1 break-all text-sm text-muted-foreground">{user.email}</p>}
      </header>
      <nav aria-label="Navegación de cuenta" className="mb-5 flex border-b">
        <NavLink
          to="/mis-pedidos"
          className={({ isActive }) => `inline-flex items-center gap-2 border-b-2 px-1 py-2.5 text-sm font-semibold ${isActive ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"}`}
        >
          <PackageSearch className="size-4" aria-hidden="true" /> Mis pedidos
        </NavLink>
      </nav>
      {children}
    </PageContainer>
  );
}
