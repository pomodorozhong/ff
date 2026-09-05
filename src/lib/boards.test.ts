import { describe, expect, it } from "vitest";
import { routeFromPath, validateCatalog, validateScene } from "./boards";

describe("runtime board validation", () => {
  it("validates catalogs", () => { expect(validateCatalog([{ id: "one", title: "one", file: "one.excalidraw" }])).toHaveLength(1); expect(() => validateCatalog([{ id: "../x", title: "../x", file: "../x.excalidraw" }])).toThrow(); });
  it("resolves root, board, trailing slash, and unknown paths", () => { expect(routeFromPath("/ff/", "/ff/")).toBeNull(); expect(routeFromPath("/ff/one", "/ff/")).toBe("one"); expect(routeFromPath("/ff/one/", "/ff/")).toBe("one"); expect(routeFromPath("/ff/a/b", "/ff/")).toBeUndefined(); });
  it("permits empty scenes and rejects corrupt ones", () => { expect(() => validateScene({ type: "excalidraw", elements: [], files: {} })).not.toThrow(); expect(() => validateScene({ type: "excalidraw", elements: "no", files: {} })).toThrow(); });
});
