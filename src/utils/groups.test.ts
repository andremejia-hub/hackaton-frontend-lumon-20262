/* Praise Kier */
import { describe, expect, it } from "vitest";
import {
  emptyGrid,
  applyTile,
  findGroup,
  index,
  inBounds,
  decodeBase64Bytes,
} from "./grid";
import { groupDigitSum, binForGroup, isNoise } from "./refinementRules";
import type { Tile } from "../types/files";

function makeGrid(
  rows: number,
  cols: number,
  tremor: number[],
  values: string,
) {
  const g = emptyGrid(rows, cols);
  for (let r = 0; r < rows; r++)
    for (let c = 0; c < cols; c++) {
      const i = r * cols + c;
      g.tremor[i] = tremor[i] ?? 0;
      g.values[i] = values[i] ?? "0";
    }
  return g;
}

describe("findGroup", () => {
  it("grupo de 4 conectividad horizontal/vertical", () => {
    const tremor = [80, 80, 0, 0, 80, 80, 0, 0, 0, 0, 0, 0];
    const values = "112233445566";
    const g = makeGrid(3, 4, tremor, values);
    const group = findGroup(g, 0, 0, 4);
    expect(group).toHaveLength(4);
  });
  it("conectividad 8 incluye diagonales", () => {
    const tremor = [80, 0, 0, 0, 0, 80, 0, 0, 0, 0, 0, 0];
    const values = "123456789012";
    const g = makeGrid(3, 4, tremor, values);
    const group4 = findGroup(g, 0, 0, 4);
    expect(group4).toHaveLength(1);
    const group8 = findGroup(g, 0, 0, 8);
    expect(group8).toHaveLength(2);
  });
  it("no incluye celdas que no dan miedo", () => {
    const tremor = [80, 50, 80];
    const values = "123";
    const g = makeGrid(1, 3, tremor, values);
    const group = findGroup(g, 0, 0, 4);
    expect(group).toHaveLength(1);
  });
  it("celda no scary devuelve vacío", () => {
    const tremor = [50];
    const values = "5";
    const g = makeGrid(1, 1, tremor, values);
    expect(findGroup(g, 0, 0, 8)).toHaveLength(0);
  });
});

describe("binning", () => {
  it("DIGIT_SUM_MOD: suma % 4 → orden WO,FC,DR,MA", () => {
    expect(binForGroup(0)).toBe("WO");
    expect(binForGroup(1)).toBe("FC");
    expect(binForGroup(2)).toBe("DR");
    expect(binForGroup(3)).toBe("MA");
    expect(binForGroup(4)).toBe("WO");
  });
  it("groupDigitSum suma dígitos", () => {
    expect(groupDigitSum(["1", "2", "3"])).toBe(6);
    expect(groupDigitSum(["9", "9"])).toBe(18);
  });
});

describe("isNoise", () => {
  it("fuera de rango es ruido", () => {
    expect(isNoise(2, 3, 40)).toBe(true);
    expect(isNoise(41, 3, 40)).toBe(true);
    expect(isNoise(5, 3, 40)).toBe(false);
  });
});

describe("base64 y applyTile", () => {
  it("decodeBase64Bytes decodifica", () => {
    const bytes = decodeBase64Bytes(btoa("ABC"));
    expect(Array.from(bytes)).toEqual([65, 66, 67]);
  });
  it("applyTile asigna valores/tremor/bins por origin", () => {
    const g = emptyGrid(4, 4);
    const tile: Tile = {
      tileRow: 1,
      tileCol: 1,
      originRow: 1,
      originCol: 1,
      rows: 2,
      cols: 2,
      values: "1234",
      tremor: btoa(String.fromCharCode(10, 20, 30, 40)),
      bins: ".W.F",
      version: 1,
    };
    applyTile(g, tile);
    expect(g.values[index(g, 1, 1)]).toBe("1");
    expect(g.tremor[index(g, 1, 1)]).toBe(10);
    expect(g.bins[index(g, 1, 1)]).toBe(".");
    expect(g.bins[index(g, 1, 2)]).toBe("W");
    expect(g.values[index(g, 2, 2)]).toBe("4");
    expect(g.tremor[index(g, 2, 2)]).toBe(40);
  });
});

describe("inBounds", () => {
  it("valida límites", () => {
    const g = emptyGrid(2, 3);
    expect(inBounds(g, 0, 0)).toBe(true);
    expect(inBounds(g, 1, 2)).toBe(true);
    expect(inBounds(g, 2, 0)).toBe(false);
    expect(inBounds(g, 0, 3)).toBe(false);
  });
});
