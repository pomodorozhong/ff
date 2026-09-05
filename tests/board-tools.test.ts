import { mkdtemp, mkdir, symlink, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { catalogFor, classifySize, discoverBoards, validateBoardJson } from "../scripts/board-tools.mjs";

const scene = JSON.stringify({ type: "excalidraw", elements: [], files: {} });
describe("board tooling", () => {
  it("classifies exact size boundaries", () => { expect(classifySize(39_999_999)).toBe("pass"); expect(classifySize(40_000_000)).toBe("warning"); expect(classifySize(89_999_999)).toBe("warning"); expect(classifySize(90_000_000)).toBe("error"); });
  it("sorts discovered filenames and derives catalog fields", async () => { const dir = await mkdtemp(path.join(tmpdir(), "boards-")); await writeFile(path.join(dir, "z-board.excalidraw"), scene); await writeFile(path.join(dir, "a-board.excalidraw"), scene); expect(catalogFor(await discoverBoards(dir))).toEqual([{ id: "a-board", title: "a-board", file: "a-board.excalidraw" }, { id: "z-board", title: "z-board", file: "z-board.excalidraw" }]); });
  it("supports an empty board directory", async () => { const dir = await mkdtemp(path.join(tmpdir(), "boards-")); expect(await discoverBoards(dir)).toEqual([]); });
  it("rejects reserved, nested, and symlinked boards", async () => { const reserved = await mkdtemp(path.join(tmpdir(), "boards-")); await writeFile(path.join(reserved, "canvas.excalidraw"), scene); await expect(discoverBoards(reserved)).rejects.toThrow("Reserved"); const nested = await mkdtemp(path.join(tmpdir(), "boards-")); await mkdir(path.join(nested, "deep")); await writeFile(path.join(nested, "deep", "ok.excalidraw"), scene); await expect(discoverBoards(nested)).rejects.toThrow("directly"); const linked = await mkdtemp(path.join(tmpdir(), "boards-")); await symlink(path.join(reserved, "canvas.excalidraw"), path.join(linked, "linked.excalidraw")); await expect(discoverBoards(linked)).rejects.toThrow("Symlinks"); });
  it("rejects missing and remote image data", () => { expect(() => validateBoardJson({ type: "excalidraw", elements: [{ type: "image", id: "x", fileId: "missing" }], files: {} })).toThrow("missing"); expect(() => validateBoardJson({ type: "excalidraw", elements: [{ type: "image", id: "x", fileId: "x" }], files: { x: { dataURL: "https://example.com/a.png" } } })).toThrow("missing"); });
});
