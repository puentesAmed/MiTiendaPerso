import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";

export function ProtectedRoute({ roles, children }) {
  const { user, isAuthenticated } = useAuth();

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (roles && !roles.includes(user.role)) {
    return <Navigate to="/" replace />;
  }

  // Si se usa como wrapper de rutas hijas (createBrowserRouter children pattern)
  // children será undefined y debemos renderizar Outlet
  // Si se usa como wrapper de componente (<ProtectedRoute><Comp /></ProtectedRoute>)
  // children será el componente y lo renderizamos
  return children ?? <Outlet />;
}
