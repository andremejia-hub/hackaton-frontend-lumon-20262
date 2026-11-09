import { describe, it, expect } from "vitest";
import { validate, fieldErrors } from "./validation";
import { ApiError } from "../api/http";
describe("contrato de formularios", () => {
  it("valida límites de registro sin imponerlos al login", () => {
    expect(
      validate({ teamName: "ab", email: "invalid", password: "short" }, true),
    ).toHaveProperty("teamName");
    expect(
      validate(
        { teamName: "Lumon", email: "user@example.test", password: "12345678" },
        true,
      ),
    ).toEqual({});
    expect(
      validate({ email: "user@example.test", password: "short" }, false),
    ).toEqual({});
    expect(
      validate(
        {
          teamName: "a".repeat(41),
          email: "user@example.test",
          password: "x".repeat(73),
        },
        true,
      ),
    ).toHaveProperty("password");
  });
  it("mapea errores duplicados y details.fields", () => {
    expect(fieldErrors(new ApiError(409, "EMAIL_TAKEN", "Duplicado"))).toEqual({
      email: "Duplicado",
    });
    expect(
      fieldErrors(new ApiError(409, "TEAM_NAME_TAKEN", "Duplicado")),
    ).toEqual({ teamName: "Duplicado" });
    expect(
      fieldErrors(
        new ApiError(400, "VALIDATION_ERROR", "Inválido", {
          fields: { email: "Error", password: 3 },
        }),
      ),
    ).toEqual({ email: "Error" });
  });
});
