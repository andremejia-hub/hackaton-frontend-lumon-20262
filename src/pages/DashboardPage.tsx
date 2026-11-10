/* Praise Kier */
import { Link } from "react-router-dom";
import { LogoutButton } from "../components/LogoutButton";
import { useAuth, usePermission } from "../hooks/useAuth";

export function DashboardPage() {
  const { user } = useAuth();
  const canManage = usePermission("team:manage");
  return (
    <main>
      <header className="flex flex-wrap items-center justify-between gap-4">
        <p className="text-xs tracking-widest">
          LUMON INDUSTRIES / ORIENTACIÓN
        </p>
        <LogoutButton />
      </header>
      <h1 className="my-6 text-4xl">Bienvenido, {user?.displayName}</h1>
      <section className="rounded-xl bg-white p-8 shadow-sm">
        <h2 className="text-xl">Tu cuadrilla</h2>
        <p className="my-3 break-words text-3xl">{user?.team.name}</p>
        <p>{user?.team.code}</p>
        <p className="mt-4 break-words">
          {user?.email} · {user?.role.name}
        </p>
        <h2 className="mt-6 font-semibold">Permisos de acceso</h2>
        <ul className="mt-2 flex flex-wrap gap-2">
          {user?.permissions.map((permission) => (
            <li className="rounded bg-teal-50 p-2 text-sm" key={permission}>
              {permission}
            </li>
          ))}
        </ul>
      </section>
      <Link className="mt-4 inline-block underline" to="/files">
        Abrir archivos de datos
      </Link>
      <Link className="mt-4 ml-4 inline-block underline" to="/refiners">
        Expedientes
      </Link>
      <Link className="mt-4 ml-4 inline-block underline" to="/incidents">
        Incidencias
      </Link>
      <Link className="mt-4 ml-4 inline-block underline" to="/estado">
        Estado del sistema
      </Link>
      {canManage ? (
        <Link className="mt-6 inline-block underline" to="/team">
          Consultar acceso de administración
        </Link>
      ) : (
        <p className="mt-6 text-sm text-slate-600">
          Tu cuenta no tiene acceso a la administración de la cuadrilla.
        </p>
      )}
    </main>
  );
}
