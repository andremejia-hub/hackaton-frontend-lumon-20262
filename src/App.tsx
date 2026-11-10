/* Praise Kier */
import { lazy, Suspense } from "react";
import { Link, Navigate, Route, Routes, useLocation } from "react-router-dom";
import { DashboardPage } from "./pages/DashboardPage";
import { AuthPage } from "./pages/AuthPage";
const FilesPage = lazy(() => import("./pages/FilesPage"));
const RefinePage = lazy(() => import("./pages/RefinePage"));
const StatusPage = lazy(() => import("./pages/StatusPage"));
const RefinersPage = lazy(() => import("./pages/RefinersPage"));
const BadgePage = lazy(() => import("./pages/BadgePage"));
const RefinerEditPage = lazy(() => import("./pages/RefinerEditPage"));
const IncidentNewPage = lazy(() => import("./pages/IncidentNewPage"));
const IncidentsPage = lazy(() => import("./pages/IncidentsPage"));
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
        <Route
          path="/files"
          element={
            <Suspense fallback={<p>Cargando…</p>}>
              <FilesPage />
            </Suspense>
          }
        />
        <Route
          path="/files/:id/refine"
          element={
            <Suspense fallback={<p>Cargando…</p>}>
              <RefinePage />
            </Suspense>
          }
        />
        <Route
          path="/estado"
          element={
            <Suspense fallback={<p>Cargando…</p>}>
              <StatusPage />
            </Suspense>
          }
        />
        <Route
          path="/refiners"
          element={
            <Suspense fallback={<p>Cargando…</p>}>
              <RefinersPage />
            </Suspense>
          }
        />
        <Route
          path="/refiners/:id/badge"
          element={
            <Suspense fallback={<p>Cargando…</p>}>
              <BadgePage />
            </Suspense>
          }
        />
        <Route
          path="/refiners/:id/edit"
          element={
            <Suspense fallback={<p>Cargando…</p>}>
              <RefinerEditPage />
            </Suspense>
          }
        />
        <Route
          path="/incidents"
          element={
            <Suspense fallback={<p>Cargando…</p>}>
              <IncidentsPage />
            </Suspense>
          }
        />
        <Route
          path="/incidents/new"
          element={
            <Suspense fallback={<p>Cargando…</p>}>
              <IncidentNewPage />
            </Suspense>
          }
        />
      </Route>
      <Route element={<ProtectedRoute permission="team:manage" />}>
        <Route
          path="/team"
          element={
            <main>
              <h1 className="text-4xl">Acceso de administración autorizado</h1>
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