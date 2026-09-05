import { lstat, readFile, readdir } from "node:fs/promises";
import path from "node:path";

export const ID_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
export const RESERVED_IDS = new Set(["assets", "canvas"]);
export const classifySize = (bytes) => bytes >= 90_000_000 ? "error" : bytes >= 40_000_000 ? "warning" : "pass";

export async function discoverBoards(directory = "canvas", { parse = true } = {}) {
  const entries = await readdir(directory, { withFileTypes: true });
  const boards = [];
  for (const entry of entries) {
    const fullPath = path.join(directory, entry.name);
    const stats = await lstat(fullPath);
    if (stats.isSymbolicLink()) throw new Error(`Symlinks are not allowed: ${fullPath}`);
    if (entry.isDirectory()) {
      const nested = await findNestedBoard(fullPath);
      if (nested) throw new Error(`Boards must live directly in canvas/: ${nested}`);
      continue;
    }
    if (!entry.name.endsWith(".excalidraw")) continue;
    const id = entry.name.slice(0, -".excalidraw".length);
    if (!ID_PATTERN.test(id)) throw new Error(`Invalid board filename: ${entry.name}`);
    if (RESERVED_IDS.has(id)) throw new Error(`Reserved board ID: ${id}`);
    if (parse) validateBoardJson(JSON.parse(await readFile(fullPath, "utf8")), fullPath);
    boards.push({ id, title: id, file: entry.name, path: fullPath, bytes: stats.size });
  }
  boards.sort((a, b) => a.id < b.id ? -1 : a.id > b.id ? 1 : 0);
  const ids = new Set(); const files = new Set();
  for (const board of boards) {
    if (ids.has(board.id) || files.has(board.file)) throw new Error(`Duplicate board: ${board.file}`);
    ids.add(board.id); files.add(board.file);
  }
  return boards;
}

async function findNestedBoard(directory) {
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const target = path.join(directory, entry.name);
    const stats = await lstat(target);
    if (stats.isSymbolicLink()) throw new Error(`Symlinks are not allowed: ${target}`);
    if (entry.isFile() && entry.name.endsWith(".excalidraw")) return target;
    if (entry.isDirectory()) { const nested = await findNestedBoard(target); if (nested) return nested; }
  }
  return null;
}

export function validateBoardJson(board, label = "board") {
  if (!board || board.type !== "excalidraw" || !Array.isArray(board.elements) || !board.files || typeof board.files !== "object" || Array.isArray(board.files))
    throw new Error(`${label}: invalid Excalidraw document shape`);
  for (const element of board.elements) {
    if (!element || element.isDeleted) continue;
    if (element.type === "embeddable") throw new Error(`${label}: embedded web frames are not supported`);
    if (element.type === "image") {
      const file = board.files[element.fileId];
      if (!file || typeof file.dataURL !== "string" || !/^data:image\/(?:png|jpeg|webp|gif);base64,/i.test(file.dataURL))
        throw new Error(`${label}: image ${element.id || "(unknown)"} is missing supported embedded data`);
    }
  }
}

export const catalogFor = (boards) => boards.map(({ id, title, file }) => ({ id, title, file }));
