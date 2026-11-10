# Auditoría CP1 y despliegue

## Estado comprobado

- Equipo: **TEAM-028 · Codigo200caleta**. No se crearon cuentas ni cuadrillas adicionales.
- Proyecto Vercel: `andredx/hackaton-frontend-lumon-20262`.
- Origen público: **https://hackaton-frontend-lumon-20262-beige.vercel.app**.
- Primer despliegue auditado: `0daf224` en `main`, estado `READY`. `/build.json`, metadatos Vercel y cabecera enviada por Edge coincidieron. Los despliegues posteriores se comprueban con el mismo procedimiento; `/build.json` identifica el commit vigente sin hardcodearlo en esta guía.
- Build remoto con Node 24, `npm ci` y `npm run build`: aprobado. Salida `dist`; JavaScript inicial alrededor de 89 KB gzip.
- Local: TypeScript estricto, 22 pruebas Edge, 5 unitarias y formato aprobados. Las pruebas usan un backend interceptado conforme al contrato, sin crear usuarios reales.
- HTTPS, `/`, `/login`, `/register`, `/team`, ruta SPA inexistente y assets JS/CSS: HTTP 200. La respuesta de hosting 200 permite que React resuelva rutas privadas y 404.
- CSP restringe scripts a `self`, no permite `unsafe-eval` ni conexiones `*`; `X-Content-Type-Options: nosniff` y `Referrer-Policy: strict-origin-when-cross-origin` comprobados.
- El archivo de verificación aún no existe: devuelve 404 de texto, no `index.html`. No se publicó ningún token inventado.
- API real `/meta/health`: 200. Desde el origen Vercel, el GET y el preflight OPTIONS **no incluyen `Access-Control-Allow-Origin`**. Edge muestra la pantalla de conexión. La publicación HTTPS está lista, pero el CP1 todavía no es utilizable desde producción hasta verificar el origen.
- `/integrations/status` sin credenciales: **401**. No se conoce su estado autenticado de TEAM-028. No se afirma que el dominio esté verificado.

## Errores corregidos

La línea base tenía 19 pruebas E2E y 2 unitarias aprobadas. Tres pruebas nuevas reprodujeron fallos reales antes de corregirlos:

1. Una respuesta tardía `SESSION_REVOKED` eliminaba una sesión nueva. Cada login ahora crea una época de sesión compartida; requests y refresh verifican la época antes de guardar o invalidar resultados.
2. Una pestaña en login no reconocía la sesión iniciada en otra. BroadcastChannel y los eventos de cambio de sesión ahora restauran su perfil y limpian el perfil anterior mientras se comprueba el nuevo.
3. Cada health periódico disparaba otra restauración y podía invalidar un login en curso. Ahora solo se anuncia reconexión al recuperarse de una indisponibilidad real.

También se validan tokens vacíos/duración entera, se mantienen timeouts con señales de cancelación externas y se informa cuando un logout concurrente con refresh no pudo confirmar aún la revocación remota. Las respuestas obsoletas no eliminan sesiones posteriores. El access token sigue exclusivamente en memoria.

`npm ci` inicialmente encontró un módulo nativo bloqueado por el Vite local; se detuvo únicamente el proceso de este proyecto y se reinstaló correctamente. No se desactivó TLS, TypeScript estricto ni verificaciones.

## Configuración Vercel

Raíz del repositorio; framework Vite; Node 24.x; instalación `npm ci`; build `npm run build`; salida `dist`. Los parámetros están en `vercel.json` y en el proyecto remoto. Variables públicas de producción, preview y desarrollo:

```txt
VITE_API_BASE_URL=https://lumon-api.vercel.app/api/v1
VITE_WS_BASE_URL=wss://lumon-api.vercel.app/api/v1
```

`.gitignore` y `.vercelignore` excluyen `.env`, `.env.local`, directorios privados y artefactos. Vercel puede generar credenciales locales en `.env.local`: no copiarlo al repositorio ni compartirlo. Solo las variables `VITE_` públicas llegan al cliente.

Los rewrites excluyen `/.well-known/` y `/assets/`. Los archivos existentes se sirven como estáticos. `/.well-known/lumon-verification.txt` tiene `Content-Type: text/plain` y `Cache-Control: no-store`.

`build/commit.ts` usa `VERCEL_GIT_COMMIT_SHA`, valida el SHA completo y genera los primeros siete caracteres; si no existe, consulta Git. Sin una fuente válida falla la compilación. `dev` solo se utiliza con el servidor de desarrollo. `dist/build.json` y `X-Lumon-Build` comparten el mismo valor, incluyendo requests de autenticación.

## Publicar desde IntelliJ

```powershell
git status
git branch --show-current
git fetch origin
npm run build
npm test
npm run test:e2e
git push origin main
vercel whoami
$lumonCommit = git rev-parse HEAD
vercel deploy --prod --yes --build-env "VERCEL_GIT_COMMIT_SHA=$lumonCommit"
node scripts/verify-production.mjs https://hackaton-frontend-lumon-20262-beige.vercel.app $lumonCommit.Substring(0,7)
```

Solo desplegar un árbol limpio y el commit enviado a `main`. El SHA del comando proviene automáticamente de Git, no se escribe a mano. Si la red institucional requiere la CA de Windows para Node, usar `$env:NODE_USE_SYSTEM_CA='1'`; no desactivar la validación de certificados.

El verificador de producción usa Edge sin sesión y no envía credenciales. Comprueba rutas, assets, seguridad, SHA y navegación. Devuelve código 2 si CORS bloquea el acceso a la API; ese resultado es un pendiente real, no una prueba de autenticación exitosa.

La conexión GitHub→Vercel devolvió: **“You need to add a Login Connection to your GitHub account first”**. El despliegue por CLI sí está publicado y sus metadatos identifican `main`. Para habilitar despliegues automáticos, el propietario debe conectar GitHub `andremejia-hub` en https://vercel.com/account/settings/authentication; luego ejecutar `vercel git connect https://github.com/andremejia-hub/hackaton-frontend-lumon-20262` y confirmar Production Branch `main` en el proyecto. No cambiar la identidad Git institucional ni crear otro proyecto.

## Verificar Lumon con la cuenta existente

No compartir access tokens, refresh tokens ni contraseñas en chat o Git. No registrar otra cuadrilla.

1. Abrir https://lumon-api.vercel.app/docs. Iniciar sesión con la cuenta existente mediante `POST /auth/login` y autorizar **dentro de Swagger**. Comprobar con `GET /auth/me` que corresponde a TEAM-028.
2. Ejecutar `POST /integrations/deploy/challenge` con:

   ```json
   {"origin":"https://hackaton-frontend-lumon-20262-beige.vercel.app"}
   ```

3. La respuesta contiene `origin`, `token`, `wellKnownPath` y `expiresAt`. Este `token` de verificación es público por diseño, **no es un token de sesión**. Expira a los 30 minutos; pedir otro invalida el anterior.
4. Guardar exactamente ese token, UTF-8 sin BOM y sin HTML, en `public/.well-known/lumon-verification.txt`. Crear un commit real, hacer push y volver a desplegar el commit nuevo. No añadir secretos ni una respuesta ficticia.
5. Abrir https://hackaton-frontend-lumon-20262-beige.vercel.app/.well-known/lumon-verification.txt y comprobar contenido exacto, HTTP 200 y `text/plain`.
6. Ejecutar `POST /integrations/deploy/verify` **sin cuerpo**, en Swagger con la misma cuenta. Debe responder exitosamente. `422` requiere corregir el archivo; `410` exige solicitar un challenge nuevo.
7. Ejecutar `GET /integrations/status`. `deploy.origin` debe coincidir exactamente y `deploy.verifiedAt` debe tener fecha. Guardar solo el resultado público de deploy, nunca cabeceras Authorization.
8. Abrir el login de Vercel: el health debe funcionar desde el navegador. Iniciar sesión personalmente, comprobar `/auth/me`, recargar, esperar vencimiento y probar dos pestañas y logout. Repetir el verificador de producción. `deploy.lastBuildSeen` debe reflejar el commit publicado tras requests desde ese origen.

## Pendientes externos

- Respuesta real del challenge de TEAM-028, publicación y verificación oficial del dominio. Hasta completar esto, login y 404 de React no son comprobables en producción porque la pantalla de conexión bloquea la aplicación.
- Login/logout/refresh y permisos contra una cuenta real autorizada. Lo automatizado hasta ahora es contrato interceptado; no sustituye esa prueba.
- Conexión de GitHub en la cuenta Vercel para despliegues automáticos. El push GitHub y el despliegue CLI funcionan.
- Nombres y códigos UTEC reales de los integrantes y proveedor de storage, si ya existe. `hackathon.json` usa `null` y lista vacía en vez de inventarlos.
- No se implementaron CP2, CP4 ni CP5. No se ejecutó ningún endpoint de evasión o revisión automática del piso.
