# CP1 — Orientación

Implementación limitada a autenticación, orientación, permisos y disponibilidad. No incluye grilla, expedientes, eventos del piso ni funcionalidades de CP2–CP5.

## Ejecutar en IntelliJ IDEA

1. Configura Node.js 24 en Settings → Languages & Frameworks → Node.js.
2. Abre la terminal en la raíz y ejecuta `npm ci`.
3. Copia `.env.example` a `.env` si aún no existe. Los valores de ejemplo son las URLs públicas de la API; no requieren secretos.
4. Ejecuta `npm run dev` y abre la URL localhost que indica Vite (normalmente http://localhost:5173).
5. También puedes ejecutar el script `dev` desde el panel npm de IntelliJ.

Variables: `VITE_API_BASE_URL` para Fetch; `VITE_WS_BASE_URL` queda preparada para futuros checkpoints. No hay conexión WebSocket en CP1. Vite lee las variables al arrancar; reinicia el servidor al cambiarlas.

## Mapa del código

| Parte | Archivo | Responsabilidad |
| --- | --- | --- |
| Login `/login` y registro `/register` | `src/pages/AuthPage.tsx` | Formulario compartido, estados de envío, errores por campo y navegación al destino original. |
| Validaciones | `src/utils/validation.ts` | Límites de Swagger: nombre 3–40, correo hasta 120 y contraseña de registro 8–72 caracteres. El login no impone los límites del registro. |
| Contexto | `src/contexts/AuthContext.tsx` | Perfil, comprobación inicial, aviso de sesión y control de respuestas obsoletas. |
| Hooks | `src/hooks/useAuth.ts` | `useAuth` y `usePermission`, basados en `permissions`. |
| Cliente HTTP | `src/api/http.ts` | Fetch, JSON, `ApiError`, Bearer, cabecera de build, timeout y señal de cancelación. |
| Tokens y refresh | `src/services/auth.ts` | Access token en memoria, `expiresIn`, rotación, una promesa de refresh por pestaña, reintento máximo de una request y logout. |
| Comunicación entre pestañas | `src/services/crossTab.ts` | BroadcastChannel del mismo origen, petición de token en memoria y eventos de logout. |
| Protección | `src/routes/ProtectedRoute.tsx` | Conserva pathname, query y hash; comprueba permisos; muestra “Sin permiso”. |
| Rutas y panel | `src/App.tsx` | Panel `/`, acceso de administración `/team`, formularios y 404. `/team` comprueba `team:manage`; no implementa administración de integrantes. |
| Panel de orientación | `src/pages/DashboardPage.tsx` | Perfil, TEAM_CODE, permisos y enlace de administración condicionado por `team:manage`. |
| Disponibilidad | `src/components/ConnectionGate.tsx` | Health al inicio y cada 30 s; backoff de 1, 2, 4, 8, 16 y 30 s; botón de reintento y cancelación al desmontar. |
| Errores de React | `src/components/ErrorBoundary.tsx` | Pantalla de recuperación ante error de render. |
| Build | `vite.config.ts` | `dev` en desarrollo y SHA real obtenido por Git durante la compilación. |

## Cómo se evita REFRESH_REUSED

- El access token nunca se persiste. BroadcastChannel lo comparte únicamente con pestañas del mismo origen, conservándolo en memoria.
- Solo el refresh token vigente se conserva en `localStorage`, bajo `lumon.refresh`.
- Web Locks (`lumon.session`) serializa login, registro, refresh y revocación entre pestañas. Se comprueba otra vez el estado después de adquirir el bloqueo.
- Si otra pestaña ya rotó el refresh, se solicita su access token por BroadcastChannel antes de renovar. Sin respuesta de una pestaña activa, se rota el refresh vigente bajo el bloqueo.
- `lumon.refresh.retired` marca el token antes de enviarlo. Si la pestaña muere o la red falla después de que el servidor lo consumió, ese token no se vuelve a enviar. El marcador se elimina al guardar la nueva pareja o al limpiar la sesión.
- Un fallo ambiguo de refresh exige iniciar sesión de nuevo. No se reenvía un refresh de un solo uso.
- `TOKEN_EXPIRED` permite un refresh y un único reintento de la petición. `TOKEN_INVALID`, `SESSION_REVOKED` y `REFRESH_REUSED` limpian la sesión sin iniciar un refresh.
- La renovación preventiva usa `expiresIn`, sin una duración fija.
- Logout elimina inmediatamente el estado local y notifica a otras pestañas mediante un evento `storage`. Si no se confirma la revocación remota, el login muestra un aviso explícito.

Se requiere localhost o HTTPS y un navegador moderno con Web Locks, BroadcastChannel y AbortSignal.timeout/any (Chrome/Edge recientes, Firefox o Safari actualizados). Sin Web Locks se muestra un error y no se envía ningún refresh. Sin BroadcastChannel, el bloqueo sigue evitando reutilizaciones, aunque cada pestaña puede tener que rotar por separado.

El refresh persistido sigue siendo accesible a JavaScript del mismo origen: mantener el sitio libre de XSS es esencial. No se registra ningún token en consola ni se incluye en URLs.

## Validación automatizada

```sh
npm run typecheck
npm run build
npm test
npm run test:e2e
npm run format:check
```

Las pruebas E2E usan Microsoft Edge instalado y un servidor Vite dedicado. Si Edge no está instalado, instala Edge o cambia `channel` en `playwright.config.ts` por un Chromium instalado con Playwright. Las dependencias de pruebas no forman parte del bundle de la aplicación.

`tests/auth.spec.ts` intercepta Fetch para reproducir el contrato sin crear cuentas. Prueba registro, errores duplicados, login, restauración, rutas con query/hash, permisos personalizados, 404, ocho requests simultáneas, dos pestañas, revocación, logout antes de 2 s, caída de red, límite de reintentos, recarga simultánea, vista móvil, `expiresIn`, ausencia de Web Locks y token retirado tras cerrar una pestaña. No constituye una verificación de credenciales reales del backend.

Resultado de validación: 19 pruebas de navegador y 2 unitarias aprobadas; TypeScript estricto (incluye tests), build de producción y comprobación de formato aprobados. También se comprueban el backoff automático, permisos de administración con rol personalizado y el aviso de logout sin confirmación remota. Bundle inicial de JavaScript: aproximadamente 89 KB gzip.

Archivos originales modificados: `.gitignore` (conserva las exclusiones originales y agrega IDE, pruebas y artefactos de TypeScript) y `README.md` (enlace a esta guía). Se conservaron los demás archivos originales. Archivos nuevos: `package.json`, `package-lock.json`, `tsconfig.json`, `vite.config.ts`, `playwright.config.ts`, `index.html`, `.env.example`, esta guía, `tests/auth.spec.ts` y todo el árbol `src/` descrito arriba, incluidos `main.tsx`, `types/auth.ts`, `styles/index.css`, `utils/parseMe.ts`, `utils/validation.test.ts` y `vite-env.d.ts`. `.env` contiene solo las URLs públicas y está excluido de Git.

## Prueba manual con backend real

Contrato consultado: https://lumon-api.vercel.app/docs y su `/openapi.json`. El health real respondió 200 durante la implementación. No se crearon cuentas ni se enviaron credenciales de prueba a la API real.

1. Con autorización del equipo, registra una única cuadrilla desde `/register`. Verifica errores de datos inválidos y, en intentos posteriores autorizados, duplicados de correo/nombre. Confirma TEAM_CODE y acceso automático al panel.
2. Cierra sesión; inicia sesión con esa cuenta desde `/team?view=details#access`. Confirma que conserva exactamente la URL. Una cuenta sin `team:manage` debe ver “Sin permiso”; no cambies el rol en frontend para simular permisos.
3. Recarga el panel. En Network debe aparecer refresh y luego `/auth/me`; no debe mostrarse el login durante la comprobación. En Application no debe existir ningún access token persistido.
4. Abre una segunda pestaña y espera el vencimiento real. Usa el panel y recarga ambas pestañas. Inspecciona Network: los refresh deben consumir tokens distintos, sin `REFRESH_REUSED`. No copies tokens a reportes ni capturas.
5. Cierra sesión en una pestaña. Confirma revocación 204, ambas pestañas en login y ausencia del perfil anterior antes de 2 s.
6. En DevTools activa Offline, espera la pantalla de conexión, vuelve a Online y comprueba recuperación. Repite con el backend inaccesible; el health debe respetar el backoff.
7. Abre una URL inexistente para comprobar 404. Comprueba formularios en móvil y navegación por teclado.

La validación real de login, registro, logout y revocación requiere una cuenta autorizada. No se ha desplegado ni hecho push. En producción se requiere configurar el fallback de SPA para rutas profundas y verificar el origen según el contrato del curso. Ejecuta el build después del commit que se desplegará para que la cabecera coincida con su SHA.
