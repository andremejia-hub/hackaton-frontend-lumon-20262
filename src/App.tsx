/* Praise Kier */
import { Link, Navigate, Route, Routes } from 'react-router-dom';
import { AuthPage } from './pages/AuthPage';
import { ProtectedRoute } from './routes/ProtectedRoute';
import { useAuth } from './hooks/useAuth';
export function App() {
  const {user, signIn, notice} = useAuth();
  return <Routes><Route path="/login" element={user ? <Navigate to="/" replace/> : <AuthPage submit={signIn} notice={notice}/>}/><Route path="/register" element={user ? <Navigate to="/" replace/> : <AuthPage register submit={signIn} notice={notice}/>}/><Route element={<ProtectedRoute/>}><Route path="/" element={<main><p className="text-xs tracking-widest">LUMON INDUSTRIES / ORIENTACIÓN</p><h1 className="my-6 text-4xl">Bienvenido, {user?.displayName}</h1><section className="rounded-xl bg-white p-8 shadow-sm"><h2 className="text-xl">Tu cuadrilla</h2><p className="my-3 text-3xl">{user?.team.name}</p><p>{user?.team.code}</p><p className="mt-4">{user?.email} · {user?.role.name}</p><h2 className="mt-6 font-semibold">Permisos de acceso</h2><ul className="mt-2 flex flex-wrap gap-2">{user?.permissions.map(p => <li className="rounded bg-teal-50 p-2 text-sm" key={p}>{p}</li>)}</ul></section><Link className="mt-6 inline-block underline" to="/team">Consultar acceso de administración</Link></main>}/></Route><Route element={<ProtectedRoute permission="team:manage"/>}><Route path="/team" element={<main><h1>Acceso de administración autorizado</h1><p>Tu cuenta tiene el permiso team:manage.</p><Link to="/">Volver</Link></main>}/></Route><Route path="*" element={<main><h1 className="text-4xl">404</h1><p>No encontramos esta página.</p><Link to="/">Volver al panel</Link></main>}/></Routes>;
}
