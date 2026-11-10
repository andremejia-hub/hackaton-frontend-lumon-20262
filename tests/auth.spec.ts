import { test, expect, type BrowserContext, type Page } from "@playwright/test";
const me = {
  id: 1,
  email: "user@example.test",
  displayName: "Cuadrilla Test",
  team: { code: "TEAM-TEST", name: "Cuadrilla Test" },
  role: { code: "CUSTOM", name: "Rol personalizado" },
  permissions: ["files:read"],
  clearance: { granted: false, grantedAt: null },
};
async function backend(context: BrowserContext) {
  const state = {
    refreshes: 0,
    logouts: 0,
    current: "rt_0",
    consumed: new Set<string>(),
    expired: false,
    unavailable: false,
    failure: "",
    duplicate: "",
    reuse: 0,
    headers: [] as string[],
  };
  await context.route("**/api/v1/**", async (route) => {
    const req = route.request();
    const path = new URL(req.url()).pathname;
    state.headers.push(req.headers()["x-lumon-build"]);
    const json = (value: unknown, status = 200) =>
      route.fulfill({ status, json: value });
    if (path.endsWith("/meta/health"))
      return state.unavailable ? route.abort() : json({ status: "ok" });
    if (path.endsWith("/auth/login") || path.endsWith("/auth/register")) {
      if (state.duplicate)
        return json({ error: state.duplicate, message: "Dato duplicado" }, 409);
      state.current = "rt_0";
      return json(
        {
          accessToken: "at_0",
          refreshToken: state.current,
          expiresIn: 180,
          user: me,
          team: me.team,
        },
        path.endsWith("/register") ? 201 : 200,
      );
    }
    if (path.endsWith("/auth/refresh")) {
      state.refreshes++;
      const token = req.postDataJSON().refreshToken as string;
      await new Promise((resolve) => setTimeout(resolve, 150));
      if (state.failure)
        return json({ error: state.failure, message: "Sesión revocada" }, 401);
      if (state.consumed.has(token) || token !== state.current) {
        state.reuse++;
        return json({ error: "REFRESH_REUSED", message: "Reutilizado" }, 401);
      }
      state.consumed.add(token);
      state.current = `rt_${state.refreshes}`;
      state.expired = false;
      return json({
        accessToken: `at_${state.refreshes}`,
        refreshToken: state.current,
        expiresIn: 180,
      });
    }
    if (path.endsWith("/auth/logout")) {
      state.logouts++;
      return route.fulfill({ status: 204 });
    }
    if (path.endsWith("/auth/me")) {
      if (state.failure)
        return json({ error: state.failure, message: "Sesión revocada" }, 401);
      if (
        state.expired ||
        (req.headers().authorization === "Bearer at_0" && state.refreshes > 0)
      )
        return json({ error: "TOKEN_EXPIRED", message: "Vencido" }, 401);
      return json(me);
    }
    return json({ error: "NOT_FOUND" }, 404);
  });
  return state;
}
async function login(page: Page, target = "/") {
  await page.goto(target);
  await page.getByLabel("Correo electrónico").fill("user@example.test");
  await page.getByLabel("Contraseña", { exact: true }).fill("password123");
  await page.getByRole("button", { name: "Iniciar sesión" }).click();
  await expect(page.getByText("TEAM-TEST", { exact: true })).toBeVisible();
}
async function requests(page: Page, count = 4) {
  return page.evaluate(async (count) => {
    const modulePath = "/src/services/auth.ts";
    const { request } = (await import(
      modulePath
    )) as typeof import("../src/services/auth");
    return Promise.allSettled(
      Array.from({ length: count }, () => request("/auth/me")),
    ).then((results) => results.map((r) => r.status));
  }, count);
}

test("login en otra pestaña actualiza una pestaña que estaba sin sesión", async ({
  page,
  context,
}) => {
  await backend(context);
  await page.goto("/login");
  const other = await context.newPage();
  await login(other);
  await expect(page.getByText("TEAM-TEST", { exact: true })).toBeVisible();
});

test("una respuesta 401 de la sesión anterior no elimina un login nuevo", async ({
  page,
  context,
}) => {
  await backend(context);
  await login(page);
  let release: () => void = () => {};
  const wait = new Promise<void>((resolve) => {
    release = resolve;
  });
  let held = false;
  await context.route("**/auth/me", async (route) => {
    if (!held) {
      held = true;
      await wait;
      return route.fulfill({
        status: 401,
        json: { error: "SESSION_REVOKED", message: "Sesión anterior revocada" },
      });
    }
    return route.fulfill({ json: me });
  });
  const old = requests(page, 1);
  await expect.poll(() => held).toBe(true);
  await page.evaluate(async () => {
    const path = "/src/services/auth.ts";
    const { auth } = (await import(
      path
    )) as typeof import("../src/services/auth");
    await auth.signIn(
      { email: "user@example.test", password: "password123" },
      false,
    );
  });
  release();
  await old;
  expect(await page.evaluate(() => localStorage.getItem("lumon.refresh"))).toBe(
    "rt_0",
  );
  expect(await requests(page, 1)).toEqual(["fulfilled"]);
});

test("el health periódico no interrumpe un login pendiente", async ({
  page,
  context,
}) => {
  await backend(context);
  let release: () => void = () => {};
  const wait = new Promise<void>((resolve) => {
    release = resolve;
  });
  let held = false;
  await context.route("**/auth/login", async (route) => {
    held = true;
    await wait;
    return route.fulfill({
      json: {
        accessToken: "at_0",
        refreshToken: "rt_0",
        expiresIn: 180,
        user: me,
      },
    });
  });
  await page.clock.install();
  await page.goto("/login");
  await page.clock.fastForward(21000);
  await page.getByLabel("Correo electrónico").fill("user@example.test");
  await page.getByLabel("Contraseña", { exact: true }).fill("password123");
  await page.getByRole("button", { name: "Iniciar sesión" }).click();
  await expect.poll(() => held).toBe(true);
  await page.clock.fastForward(10000);
  release();
  await expect(page.getByText("TEAM-TEST", { exact: true })).toBeVisible();
});
test("login conserva ruta, query y hash; permisos personalizados, 403 y 404", async ({
  page,
  context,
}) => {
  const state = await backend(context);
  await page.goto("/team?view=details#access");
  await expect(page).toHaveURL(/login/);
  await page.getByLabel("Correo electrónico").fill("user@example.test");
  await page.getByLabel("Contraseña", { exact: true }).fill("password123");
  await page.getByRole("button", { name: "Iniciar sesión" }).click();
  await expect(page).toHaveURL(/\/team\?view=details#access$/);
  await expect(
    page.getByRole("heading", { name: "Sin permiso" }),
  ).toBeVisible();
  await page.goto("/unknown");
  await expect(page.getByRole("heading", { name: "404" })).toBeVisible();
  expect(state.headers.every((h) => h === "latest")).toBeTruthy();
});
test("registro valida y muestra duplicados; sesión automática y restauración", async ({
  page,
  context,
}) => {
  const state = await backend(context);
  await page.goto("/register");
  await page.getByRole("button", { name: "Crear cuadrilla" }).click();
  await expect(page.getByText("Usa entre 3 y 40 caracteres.")).toBeVisible();
  await page.getByLabel("Nombre de cuadrilla").fill("Cuadrilla Test");
  await page.getByLabel("Correo electrónico").fill("user@example.test");
  await page.getByLabel("Contraseña", { exact: true }).fill("password123");
  state.duplicate = "EMAIL_TAKEN";
  await page.getByRole("button", { name: "Crear cuadrilla" }).click();
  await expect(page.locator("#email-error")).toHaveText("Dato duplicado");
  state.duplicate = "TEAM_NAME_TAKEN";
  await page.getByRole("button", { name: "Crear cuadrilla" }).click();
  await expect(page.locator("#teamName-error")).toHaveText("Dato duplicado");
  state.duplicate = "";
  await page.getByRole("button", { name: "Crear cuadrilla" }).click();
  await expect(page.getByText("TEAM-TEST", { exact: true })).toBeVisible();
  expect(
    await page.evaluate(() =>
      Object.keys(localStorage).filter((k) => k.includes("access")),
    ),
  ).toEqual([]);
  await page.reload();
  await expect(page.getByText("TEAM-TEST", { exact: true })).toBeVisible();
  expect(state.refreshes).toBe(1);
});
test("401 simultáneos realizan un solo refresh y rotan el token", async ({
  page,
  context,
}) => {
  const state = await backend(context);
  await login(page);
  state.expired = true;
  expect(await requests(page, 8)).toEqual(Array(8).fill("fulfilled"));
  expect(state.refreshes).toBe(1);
  expect(state.reuse).toBe(0);
});
test("dos pestañas renuevan sin reutilización y logout se propaga antes de 2 segundos", async ({
  page,
  context,
}) => {
  const state = await backend(context);
  await login(page);
  const other = await context.newPage();
  await other.goto("/");
  await expect(other.getByText("TEAM-TEST", { exact: true })).toBeVisible();
  const before = state.refreshes;
  state.expired = true;
  await Promise.all([requests(page), requests(other)]);
  expect(state.reuse).toBe(0);
  expect(state.refreshes - before).toBe(1);
  await page.getByRole("button", { name: "Cerrar sesión" }).click();
  await expect(
    other.getByRole("button", { name: "Iniciar sesión" }),
  ).toBeVisible({ timeout: 1900 });
  await expect.poll(() => state.logouts).toBe(1);
  expect(
    await other.evaluate(() => localStorage.getItem("lumon.refresh")),
  ).toBeNull();
});
for (const code of ["TOKEN_INVALID", "SESSION_REVOKED", "REFRESH_REUSED"])
  test(`${code} no provoca refresh y limpia la sesión`, async ({
    page,
    context,
  }) => {
    const state = await backend(context);
    await login(page);
    state.failure = code;
    await requests(page, 1);
    await expect(
      page.getByRole("button", { name: "Iniciar sesión" }),
    ).toBeVisible();
    expect(state.refreshes).toBe(0);
  });
test("fallo de refresh no reenvía el token consumido", async ({
  page,
  context,
}) => {
  const state = await backend(context);
  await login(page);
  state.expired = true;
  await context.route("**/auth/refresh", (route) => {
    state.refreshes++;
    return route.abort();
  });
  await requests(page, 4);
  expect(state.refreshes).toBe(1);
  await expect(
    page.getByRole("button", { name: "Iniciar sesión" }),
  ).toBeVisible();
  await page.reload();
  expect(state.refreshes).toBe(1);
});
test("conexión caída ofrece reintento y recupera la aplicación", async ({
  page,
  context,
}) => {
  const state = await backend(context);
  state.unavailable = true;
  await page.goto("/login");
  await expect(
    page.getByRole("heading", { name: "Conectando con Lumon…" }),
  ).toBeVisible();
  state.unavailable = false;
  await page.getByRole("button", { name: "Reintentar" }).click();
  await expect(
    page.getByRole("button", { name: "Iniciar sesión" }),
  ).toBeVisible();
});

test("el reintento original ocurre una sola vez si el token nuevo también vence", async ({
  page,
  context,
}) => {
  const state = await backend(context);
  await login(page);
  await context.route("**/auth/me", (route) =>
    route.fulfill({
      status: 401,
      json: { error: "TOKEN_EXPIRED", message: "Vencido" },
    }),
  );
  await requests(page, 1);
  expect(state.refreshes).toBe(1);
  await expect(
    page.getByRole("button", { name: "Iniciar sesión" }),
  ).toBeVisible();
});
test("revocación durante el refresh invalida todas las pestañas", async ({
  page,
  context,
}) => {
  const state = await backend(context);
  await login(page);
  const other = await context.newPage();
  await other.goto("/");
  await expect(other.getByText("TEAM-TEST", { exact: true })).toBeVisible();
  state.expired = true;
  await context.route("**/auth/refresh", (route) => {
    state.refreshes++;
    return route.fulfill({
      status: 401,
      json: { error: "REFRESH_REUSED", message: "Sesión revocada" },
    });
  });
  await requests(page, 3);
  await expect(
    other.getByRole("button", { name: "Iniciar sesión" }),
  ).toBeVisible({ timeout: 1900 });
  await expect(
    page.getByRole("button", { name: "Iniciar sesión" }),
  ).toBeVisible();
});
test("recargar dos pestañas a la vez no reutiliza tokens", async ({
  page,
  context,
}) => {
  const state = await backend(context);
  await login(page);
  const other = await context.newPage();
  await other.goto("/");
  await expect(other.getByText("TEAM-TEST", { exact: true })).toBeVisible();
  await Promise.all([page.reload(), other.reload()]);
  await expect(page.getByText("TEAM-TEST", { exact: true })).toBeVisible();
  await expect(other.getByText("TEAM-TEST", { exact: true })).toBeVisible();
  expect(state.reuse).toBe(0);
});
test("login funciona en móvil sin desbordar horizontalmente", async ({
  page,
  context,
}) => {
  await backend(context);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/login");
  await expect(
    page.getByRole("button", { name: "Iniciar sesión" }),
  ).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBeTruthy();
});

test("expiresIn determina cuándo renovar sin esperar un 401", async ({
  page,
  context,
}) => {
  const state = await backend(context);
  await context.route("**/auth/login", (route) =>
    route.fulfill({
      json: {
        accessToken: "at_0",
        refreshToken: "rt_0",
        expiresIn: 1,
        user: me,
      },
    }),
  );
  await page.clock.install();
  await login(page);
  await page.clock.fastForward(1100);
  expect(await requests(page, 3)).toEqual(Array(3).fill("fulfilled"));
  expect(state.refreshes).toBe(1);
});

test("un navegador sin Web Locks muestra un error y no consume tokens", async ({
  page,
  context,
}) => {
  const state = await backend(context);
  await page.addInitScript(() =>
    Object.defineProperty(navigator, "locks", { value: undefined }),
  );
  await page.goto("/login");
  await page.getByLabel("Correo electrónico").fill("user@example.test");
  await page.getByLabel("Contraseña", { exact: true }).fill("password123");
  await page.getByRole("button", { name: "Iniciar sesión" }).click();
  await expect(page.getByRole("alert")).toContainText("no permite coordinar");
  expect(state.refreshes).toBe(0);
});

test("un token retirado antes de cerrar la pestaña nunca se vuelve a enviar", async ({
  page,
  context,
}) => {
  const state = await backend(context);
  await page.goto("/login");
  await page.evaluate(() => {
    localStorage.setItem("lumon.refresh", "rt_0");
    localStorage.setItem("lumon.refresh.retired", "rt_0");
  });
  await page.reload();
  await expect(
    page.getByRole("button", { name: "Iniciar sesión" }),
  ).toBeVisible();
  expect(state.refreshes).toBe(0);
});

test("health reintenta automáticamente con esperas crecientes", async ({
  page,
  context,
}) => {
  await backend(context);
  let calls = 0;
  let available = false;
  await context.route("**/meta/health", (route) => {
    calls++;
    return available
      ? route.fulfill({ json: { status: "ok" } })
      : route.abort();
  });
  await page.clock.install();
  await page.goto("/login");
  await expect(page.getByText("Intento 1.", { exact: false })).toBeVisible();
  const initial = calls;
  await page.clock.fastForward(900);
  expect(calls).toBe(initial);
  await page.clock.fastForward(100);
  await expect(page.getByText("Intento 2.", { exact: false })).toBeVisible();
  const second = calls;
  await page.clock.fastForward(1900);
  expect(calls).toBe(second);
  available = true;
  await page.clock.fastForward(100);
  await expect(
    page.getByRole("button", { name: "Iniciar sesión" }),
  ).toBeVisible();
});

test("un rol personalizado puede administrar si permissions lo permite", async ({
  page,
  context,
}) => {
  await backend(context);
  await context.route("**/auth/me", (route) =>
    route.fulfill({ json: { ...me, permissions: ["team:manage"] } }),
  );
  await login(page);
  await page
    .getByRole("link", { name: "Consultar acceso de administración" })
    .click();
  await expect(
    page.getByRole("heading", { name: "Acceso de administración autorizado" }),
  ).toBeVisible();
});

test("logout limpia la interfaz e informa si no confirmó revocación remota", async ({
  page,
  context,
}) => {
  await backend(context);
  await login(page);
  await context.route("**/auth/logout", (route) => route.abort());
  await page.getByRole("button", { name: "Cerrar sesión" }).click();
  await expect(
    page.getByRole("button", { name: "Iniciar sesión" }),
  ).toBeVisible();
  await expect(page.getByRole("status")).toContainText(
    "No se pudo confirmar la revocación",
  );
  await expect(page.getByText("TEAM-TEST", { exact: true })).toHaveCount(0);
});
