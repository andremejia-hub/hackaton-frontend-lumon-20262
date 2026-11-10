import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { resolveBuildCommit } from "./build/commit";
export default defineConfig(({ command }) => {
  const commit =
    command === "serve"
      ? "dev"
      : resolveBuildCommit(process.env.VERCEL_GIT_COMMIT_SHA);
  return {
    plugins: [
      react(),
      tailwindcss(),
      {
        name: "build-metadata",
        generateBundle() {
          this.emitFile({
            type: "asset",
            fileName: "build.json",
            source: JSON.stringify({ commit }),
          });
        },
      },
    ],
    define: {
      __BUILD__: JSON.stringify(commit),
    },
  };
});
