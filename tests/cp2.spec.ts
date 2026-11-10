import { test, expect, type BrowserContext, type Page } from "@playwright/test";

const me = {
  id: 1,
  email: "user@example.test",
  displayName: "Cuadrilla Test",
  team: { code: "TEAM-TEST", name: "Cuadrilla Test" },
  role: { code: "SUPERVISOR", name: "Supervisión" },
  permissions: ["files:read", "files:refine"],
  clearance: { granted: false, grantedAt: null },
};

function b64(s: string) {
  return Buffer.from(s, "binary").toString("base64");
}

const ROWS = 4;
const COLS = 4;
const TILE = 2;

function tilePayload(tr: number, tc: number) {
  const originRow = (tr - 1) * TILE;
  const originCol = (tc - 1) * TILE;
  const rows = Math.min(TILE, ROWS - originRow);
  const cols = Math.min(TILE, COLS - originCol);
  let values = "";
  let tremorBytes = "";
  let bins = "";
  for (let dr = 0; dr < rows; dr++) {
    for (let dc = 0; dc < cols; dc++) {
      const r = originRow + dr;
      const c = originCol + dc;
      const scary = r < 2 && c < 2;
      values += "1";
      tremorBytes += String.fromCharCode(scary ? 80 : 10);
      bins += ".";
    }
  }
  return {
    tileRow: tr,
    tileCol: tc,
    originRow,
    originCol,
    rows,
    cols,
    values,
    tremor: b64(tremorBytes),
    bins,
    version: 1,
  };
}

async function backend(context: BrowserContext) {
  await context.route("**/api/v1/**", async (route) => {
    const req = route.request();
    const url = new URL(req.url());
    const path = url.pathname;
    const json = (value: unknown, status = 200) =>
      route.fulfill({ status, json: value });

    if (path.endsWith("/meta/health")) return json({ status: "ok" });
    if (path.endsWith("/auth/login")) {
      return json({
        accessToken: "at_0",
        refreshToken: "rt_0",
        expiresIn: 180,
        user: me,
      });
    }
    if (path.endsWith("/auth/refresh"))
      return json({
        accessToken: "at_0",
        refreshToken: "rt_0",
        expiresIn: 180,
      });
    if (path.endsWith("/auth/me")) return json(me);

    if (path === "/api/v1/files") {
      const page = Number(url.searchParams.get("page") || "1");
      const pageSize = Number(url.searchParams.get("pageSize") || "20");
      return json({
        items: [
          {
            id: 1,
            name: "Archivo A",
            status: "pending",
            rows: ROWS,
            cols: COLS,
            tileSize: TILE,
            progress: 0,
            mistakes: 0,
          },
        ],
        total: 1,
        page,
        pageSize,
      });
    }
    if (path === "/api/v1/files/1") {
      return json({
        id: 1,
        name: "Archivo A",
        status: "pending",
        rows: ROWS,
        cols: COLS,
        tileSize: TILE,
        progress: 0,
        mistakes: 0,
        minGroupSize: 1,
        maxGroupSize: 40,
      });
    }
    const tileMatch = path.match(/\/files\/1\/tiles\/(\d+)\/(\d+)/);
    if (tileMatch) {
      const tr = Number(tileMatch[1]);
      const tc = Number(tileMatch[2]);
      return json(tilePayload(tr, tc));
    }
    if (path === "/api/v1/files/1/refinements" && req.method() === "POST") {
      const body = req.postDataJSON() as {
        bin: string;
        cells: { r: number; c: number }[];
      };
      const progress = {
        total: 4,
        refined: body.cells.length,
        percent: body.cells.length >= 4 ? 1 : body.cells.length / 4,
        bins: { WO: 0, FC: 0, DR: 0, MA: 0 },
      };
      progress.bins[body.bin.slice(0, 2) as "WO" | "FC" | "DR" | "MA"] =
        body.cells.length;
      return json({ progress }, 200);
    }
    return json({ error: "NOT_FOUND" }, 404);
  });
}

async function login(page: Page) {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/login");
  await page.getByLabel("Correo electrónico").fill("user@example.test");
  await page.getByLabel("Contraseña", { exact: true }).fill("password123");
  await page.getByRole("button", { name: "Iniciar sesión" }).click();
  await expect(page.getByText("TEAM-TEST", { exact: true })).toBeVisible();
}

test("listado conserva paginación en la URL", async ({ page, context }) => {
  await backend(context);
  await login(page);
  await page.goto("/files?page=1&pageSize=20");
  await expect(page.getByText("Archivo A")).toBeVisible();
  await page.reload();
  await expect(page).toHaveURL(/page=1/);
});

test("abrir refine por URL va a la posición indicada", async ({
  page,
  context,
}) => {
  await backend(context);
  await login(page);
  await page.goto("/files/1/refine?r=1&c=1");
  await expect(page.getByText(/tiles 0\/4|tiles 4\/4/)).toBeVisible({
    timeout: 10000,
  });
});

test("seleccionar y refinar un grupo", async ({ page, context }) => {
  await backend(context);
  await login(page);
  await page.goto("/files/1/refine");
  // wait for tiles
  await expect(page.getByText(/tiles 4\/4/)).toBeVisible({ timeout: 10000 });
  // click top-left scary cell
  const cell = page.locator(
    '[role="gridcell"][aria-rowindex="1"][aria-colindex="1"]',
  );
  await cell.click({ force: true });
  await expect(page.getByText(/Seleccionado: 4 celdas/)).toBeVisible();
  await page.getByRole("button", { name: "WOE" }).click();
  await expect(page.getByText("Archivo completado")).toBeVisible();
});

test("caja incorrecta muestra mensaje", async ({ page, context }) => {
  await backend(context);
  // override refinements to return WRONG_BIN
  await context.route("**/api/v1/files/1/refinements", (route) =>
    route.fulfill({
      status: 422,
      json: { error: "WRONG_BIN", message: "Caja incorrecta" },
    }),
  );
  await login(page);
  await page.goto("/files/1/refine");
  await expect(page.getByText(/tiles 4\/4/)).toBeVisible({ timeout: 10000 });
  const cell = page.locator(
    '[role="gridcell"][aria-rowindex="1"][aria-colindex="1"]',
  );
  await cell.click({ force: true });
  await page.getByRole("button", { name: "FROLIC" }).click();
  await expect(page.getByText(/Caja incorrecta|WRONG_BIN/)).toBeVisible();
});
