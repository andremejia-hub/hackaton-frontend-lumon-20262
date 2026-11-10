import assert from "node:assert/strict";
import { chromium } from "@playwright/test";

const [origin, expectedCommit] = process.argv.slice(2);
assert(
  origin && new URL(origin).protocol === "https:",
  "Indica el origen HTTPS real.",
);
assert(
  /^[0-9a-f]{7}$/.test(expectedCommit || ""),
  "Indica el SHA esperado de 7 caracteres.",
);
const report = {
  origin,
  expectedCommit,
  routes: [],
  assets: [],
  browser: {},
  api: {},
};
for (const path of ["/", "/login", "/register", "/team", "/ruta-inexistente"]) {
  const response = await fetch(new URL(path, origin));
  assert.equal(response.status, 200, path);
  assert.equal(response.headers.get("x-content-type-options"), "nosniff");
  assert.equal(
    response.headers.get("referrer-policy"),
    "strict-origin-when-cross-origin",
  );
  const csp = response.headers.get("content-security-policy");
  assert(
    csp?.includes("script-src 'self'") &&
      !csp.includes("unsafe-eval") &&
      !csp.includes("*"),
  );
  report.routes.push({ path, status: response.status });
  if (path === "/login") {
    const html = await response.text();
    for (const asset of html.matchAll(/(?:src|href)="(\/assets\/[^\"]+)"/g)) {
      const item = await fetch(new URL(asset[1], origin));
      assert.equal(item.status, 200);
      const content = await item.text();
      if (asset[1].endsWith(".js")) {
        assert(content.includes(expectedCommit));
        assert(!content.includes("VERCEL_OIDC_TOKEN"));
        assert(!content.includes("localhost:5173"));
      }
      report.assets.push({
        path: asset[1],
        status: item.status,
        type: item.headers.get("content-type"),
      });
    }
  }
}
const metadata = await fetch(new URL("/build.json", origin));
assert.equal((await metadata.json()).commit, expectedCommit);
const proof = await fetch(
  new URL("/.well-known/lumon-verification.txt", origin),
);
report.verificationFile = {
  status: proof.status,
  type: proof.headers.get("content-type"),
};
if (proof.ok)
  assert(proof.headers.get("content-type")?.startsWith("text/plain"));
else assert.equal(proof.status, 404); // Missing proof must never fall back to index.html.

const browser = await chromium.launch({ channel: "msedge", headless: true });
try {
  const page = await browser.newPage();
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  page.on("request", (req) => {
    if (req.url().endsWith("/meta/health"))
      report.api.buildHeader = req.headers()["x-lumon-build"];
  });
  page.on("response", (response) => {
    if (response.url().endsWith("/meta/health"))
      report.api.status = response.status();
  });
  page.on("requestfailed", (request) => {
    if (request.url().endsWith("/meta/health"))
      report.api.networkError = request.failure()?.errorText;
  });
  await page.goto(new URL("/login", origin).href);
  try {
    await page
      .getByRole("button", { name: "Iniciar sesión" })
      .waitFor({ timeout: 20000 });
    report.browser.login = true;
    await page.reload();
    await page.getByRole("button", { name: "Iniciar sesión" }).waitFor();
    await page.goto(new URL("/register", origin).href);
    await page.getByRole("button", { name: "Crear cuadrilla" }).waitFor();
    report.browser.register = true;
    await page.goto(new URL("/team?audit=production", origin).href);
    await page.waitForURL("**/login");
    report.browser.protectedRoute = true;
    await page.goto(new URL("/ruta-inexistente", origin).href);
    await page.getByRole("heading", { name: "404", exact: true }).waitFor();
    report.browser.notFound = true;
  } catch (error) {
    report.browser.connectionBlocked = await page
      .getByRole("heading", { name: "Conectando con Lumon…" })
      .isVisible();
    if (!report.browser.connectionBlocked) throw error;
  }
  assert.equal(report.api.buildHeader, expectedCommit);
  assert.deepEqual(errors, []);
  report.browser.renderErrors = errors;
} finally {
  await browser.close();
}
console.log(JSON.stringify(report, null, 2));
if (report.browser.connectionBlocked) process.exitCode = 2;
