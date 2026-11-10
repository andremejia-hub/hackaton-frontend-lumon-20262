import { describe, it, expect } from "vitest";
import { resolveBuildCommit } from "./commit";

describe("identidad del build", () => {
  it("usa el commit de Vercel sin necesitar .git en el servidor", () => {
    expect(
      resolveBuildCommit("a123456" + "b".repeat(33), () => {
        throw new Error("No Git");
      }),
    ).toBe("a123456");
  });
  it("obtiene Git cuando el entorno no suministra SHA", () => {
    expect(
      resolveBuildCommit(undefined, () => "c123456" + "d".repeat(33)),
    ).toBe("c123456");
  });
  it("rechaza valores inventados, cortos o inválidos", () => {
    for (const value of ["latest", "dev", "1234567", "x".repeat(40)])
      expect(() => resolveBuildCommit(value)).toThrow();
  });
});
