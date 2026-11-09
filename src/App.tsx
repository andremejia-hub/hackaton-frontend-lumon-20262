/* Praise Kier */
import { Link, Navigate, Route, Routes, useLocation } from "react-router-dom";
import { DashboardPage } from "./pages/DashboardPage";
import { AuthPage } from "./pages/AuthPage";
import { ProtectedRoute } from "./routes/ProtectedRoute";
import { useAuth } from "./hooks/useAuth";
export function App() {
  const { user, signIn, notice } = useAuth();
  const location = useLocation();
  const from: unknown = location.state?.from;
  const destination =
    typeof from === "string" && from.startsWith("/") && !from.startsWith("//")
      ? from
      : "/";
  return (
    <Routes>
      <Route
        path="/login"
        element={
          user ? (
            <Navigate to={destination} replace />
          ) : (
            <AuthPage submit={signIn} notice={notice} />
          )
        }
      />
      <Route
        path="/register"
        element={
          user ? (
            <Navigate to={destination} replace />
          ) : (
            <AuthPage register submit={signIn} notice={notice} />
          )
        }
      />
      <Route element={<ProtectedRoute />}>
        <Route path="/" element={<DashboardPage />} />
      </Route>
      <Route element={<ProtectedRoute permission="team:manage" />}>
        <Route
          path="/team"
          element={
            <main>
              <h1>Acceso de administración autorizado</h1>
              <p>Tu cuenta tiene el permiso team:manage.</p>
              <Link to="/">Volver</Link>
            </main>
          }
        />
      </Route>
      <Route
        path="*"
        element={
          <main>
            <h1 className="text-4xl">404</h1>
            <p>No encontramos esta página.</p>
            <Link to="/">Volver al panel</Link>
          </main>
        }
      />
    </Routes>
  );
}
