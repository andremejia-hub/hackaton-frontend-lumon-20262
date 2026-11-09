/* Praise Kier */
import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";
export function ProtectedRoute({ permission }: { permission?: string }) {
  const { user, loading } = useAuth();
  const location = useLocation();
  if (loading) return <main role="status">Verificando tu sesión…</main>;
  if (!user)
    return (
      <Navigate
        to="/login"
        replace
        state={{ from: location.pathname + location.search + location.hash }}
      />
    );
  if (permission && !user.permissions.includes(permission))
    return (
      <main>
        <h1 className="text-3xl">Sin permiso</h1>
        <p>Tu cuenta no tiene autorización para acceder a esta sección.</p>
        <a href="/">Volver al panel</a>
      </main>
    );
  return <Outlet />;
}
