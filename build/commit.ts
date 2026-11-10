import { execFileSync } from "node:child_process";

export function resolveBuildCommit(
  environmentSha?: string,
  readGit = () =>
    execFileSync(
      "git",
      [
        "-c",
        "safe.directory=" + process.cwd().replaceAll("\\", "/"),
        "rev-parse",
        "HEAD",
      ],
      { encoding: "utf8" },
    ).trim(),
): string {
  const sha = environmentSha?.trim() || readGit();
  if (!/^[0-9a-f]{40}$/i.test(sha))
    throw new Error(
      "No se pudo obtener el SHA real del commit para producción.",
    );
  return sha.slice(0, 7).toLowerCase();
}
