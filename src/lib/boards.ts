export const MAX_BOARD_BYTES = 90_000_000;
export class InvalidBoardError extends Error { override name = "InvalidBoardError"; }

export interface BoardEntry { id: string; title: string; file: string }
export interface LoadedBoard { scene: Awaited<ReturnType<typeof import("@excalidraw/excalidraw").loadFromBlob>>; blob: Blob }

const ID = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const FILE = /^[a-z0-9]+(?:-[a-z0-9]+)*\.excalidraw$/;

export function validateCatalog(value: unknown): BoardEntry[] {
  if (!Array.isArray(value)) throw new Error("The board catalog is invalid.");
  const ids = new Set<string>();
  const files = new Set<string>();
  return value.map((item) => {
    if (!item || typeof item !== "object") throw new Error("The board catalog is invalid.");
    const { id, title, file } = item as Record<string, unknown>;
    if (typeof id !== "string" || !ID.test(id) || id === "canvas" || id === "assets" ||
        typeof title !== "string" || title !== id || typeof file !== "string" || !FILE.test(file) || file !== `${id}.excalidraw` ||
        ids.has(id) || files.has(file)) throw new Error("The board catalog contains an unsafe or duplicate entry.");
    ids.add(id); files.add(file);
    return { id, title, file };
  });
}

export async function fetchCatalog(signal?: AbortSignal): Promise<BoardEntry[]> {
  const response = await fetch(`${import.meta.env.BASE_URL}canvas/index.json`, { signal });
  if (!response.ok) throw new Error(`Could not load the gallery (${response.status}).`);
  return validateCatalog(await response.json());
}

export async function fetchBoard(entry: BoardEntry, signal?: AbortSignal): Promise<LoadedBoard> {
  const response = await fetch(`${import.meta.env.BASE_URL}canvas/${encodeURIComponent(entry.file)}`, { signal });
  if (!response.ok) throw new Error(`Could not load this board (${response.status}).`);
  const declared = Number(response.headers.get("content-length"));
  if (declared >= MAX_BOARD_BYTES) throw new Error("This board exceeds the 90 MB viewing limit.");
  const blob = await response.blob();
  if (blob.size >= MAX_BOARD_BYTES) throw new Error("This board exceeds the 90 MB viewing limit.");
  if (signal?.aborted) throw new DOMException("Aborted", "AbortError");
  let raw: Record<string, unknown>;
  try { raw = JSON.parse(await blob.text()) as Record<string, unknown>; }
  catch { throw new InvalidBoardError("This file contains malformed JSON."); }
  validateScene(raw);
  const { loadFromBlob } = await import("@excalidraw/excalidraw");
  let scene: Awaited<ReturnType<typeof loadFromBlob>>;
  try { scene = await loadFromBlob(blob, null, null); }
  catch { throw new InvalidBoardError("Excalidraw could not restore this board."); }
  if (signal?.aborted) throw new DOMException("Aborted", "AbortError");
  return { scene, blob };
}

export function validateScene(raw: Record<string, unknown>): void {
  if (raw.type !== "excalidraw" || !Array.isArray(raw.elements) || !raw.files || typeof raw.files !== "object" || Array.isArray(raw.files))
    throw new InvalidBoardError("This file is not a valid Excalidraw board.");
  const files = raw.files as Record<string, unknown>;
  for (const element of raw.elements as Array<Record<string, unknown>>) {
    if (element?.isDeleted) continue;
    if (element?.type === "embeddable") throw new InvalidBoardError("Embedded web frames are not supported.");
    if (element?.type === "image") {
      const file = typeof element.fileId === "string" ? files[element.fileId] as Record<string, unknown> | undefined : undefined;
      if (!file || typeof file.dataURL !== "string" || !/^data:image\/(?:png|jpeg|webp|gif);base64,/i.test(file.dataURL))
        throw new InvalidBoardError("This board has missing or unsupported embedded image data.");
    }
  }
}

export function routeFromPath(pathname: string, base: string): string | null | undefined {
  const prefix = base.endsWith("/") ? base : `${base}/`;
  if (pathname === prefix.slice(0, -1) || pathname === prefix) return null;
  if (!pathname.startsWith(prefix)) return undefined;
  const part = pathname.slice(prefix.length).replace(/\/$/, "");
  return ID.test(part) && !part.includes("/") ? part : undefined;
}
