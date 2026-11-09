/* Praise Kier */
import { useRef, useState, type FormEvent } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import type { Credentials } from '../types/auth';
import { validate, fieldErrors } from '../utils/validation';
export function AuthPage({ register = false, submit, notice }: { register?: boolean; submit: (values: Credentials, register: boolean) => Promise<void>; notice?: string }) {
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const busy = useRef(false);
  const navigate = useNavigate(); const location = useLocation();
  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); if (busy.current) return;
    const data = new FormData(event.currentTarget);
    const values: Credentials = { email: String(data.get('email')).trim(), password: String(data.get('password')), ...(register ? { teamName: String(data.get('teamName')).trim() } : {}) };
    const invalid = validate(values, register); setErrors(invalid); setError('');
    if (Object.keys(invalid).length) return;
    busy.current = true; setLoading(true);
    try { await submit(values, register); const from: unknown = location.state?.from; navigate(typeof from === 'string' && from.startsWith('/') && !from.startsWith('//') ? from : '/', { replace: true }); }
    catch (e) { setErrors(fieldErrors(e)); setError(e instanceof Error ? e.message : 'No se pudo iniciar sesión.'); }
    finally { busy.current = false; setLoading(false); }
  }
  return <div className="grid min-h-screen lg:grid-cols-2"><aside className="flex flex-col justify-between bg-lumon p-10 text-white lg:p-20"><Link to="/" className="text-3xl font-semibold tracking-widest">LUMON<span className="block text-xs font-normal tracking-[.4em]">INDUSTRIES</span></Link><div className="my-16"><p className="mb-4 text-xs uppercase tracking-[.3em] text-teal-200">Departamento de Macrodatos</p><h1 className="max-w-md text-5xl font-light leading-tight">Cada jornada empieza con un propósito.</h1><p className="mt-6 max-w-sm text-teal-100">Bienvenido al piso. Tu cuadrilla y tu espacio de trabajo te esperan.</p></div><p className="text-xs tracking-widest text-teal-200">ORIENTACIÓN · CP1</p></aside><section className="flex items-center justify-center p-6 lg:p-16"><div className="w-full max-w-md"><p className="text-xs uppercase tracking-widest">Acceso al piso</p><h2 className="mb-2 mt-3 text-3xl font-semibold">{register ? 'Registra tu cuadrilla' : 'Bienvenido de nuevo'}</h2><p className="mb-8 text-slate-500">{register ? 'Crea el equipo y comienza tu orientación.' : 'Ingresa con tu cuenta de Lumon.'}</p>{notice && <p role="status" className="notice">{notice}</p>}<form noValidate onSubmit={handleSubmit} className="space-y-5">{(register ? ['teamName', 'email', 'password'] : ['email', 'password']).map(name => <div key={name}><label htmlFor={name} className="mb-2 block text-sm font-medium">{{teamName:'Nombre de cuadrilla',email:'Correo electrónico',password:'Contraseña'}[name]}</label><input id={name} name={name} type={name === 'password' ? 'password' : name === 'email' ? 'email' : 'text'} required autoComplete={name === 'password' ? register ? 'new-password' : 'current-password' : name === 'email' ? 'username' : 'organization'} aria-invalid={!!errors[name]} aria-describedby={errors[name] ? `${name}-error` : undefined} disabled={loading} className="w-full rounded-lg border border-slate-300 bg-white p-3"/>{errors[name] && <p id={`${name}-error`} className="mt-1 text-sm text-red-700">{errors[name]}</p>}</div>)}{register && <p className="text-xs text-slate-500">Contraseña de 8 a 72 caracteres.</p>}{error && <p role="alert" className="text-sm text-red-700">{error}</p>}<button disabled={loading} className="w-full rounded-lg bg-lumon p-3 font-semibold text-white">{loading ? 'Verificando…' : register ? 'Crear cuadrilla' : 'Iniciar sesión'}</button></form><p className="mt-8 text-sm">{register ? '¿Ya tienes cuenta?' : '¿Primera jornada?'} <Link className="font-semibold underline" to={register ? '/login' : '/register'} state={location.state}>{register ? 'Inicia sesión' : 'Registra tu cuadrilla'}</Link></p></div></section></div>;
}
