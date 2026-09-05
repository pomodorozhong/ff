#!/usr/bin/env node
import { copyFile, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { catalogFor, discoverBoards } from "./board-tools.mjs";

const boards = await discoverBoards();
const entry = await readFile("dist/index.html");
await rm("dist/canvas", { recursive: true, force: true });
await mkdir("dist/canvas", { recursive: true });
for (const board of boards) {
  await copyFile(board.path, path.join("dist/canvas", board.file));
  await mkdir(path.join("dist", board.id), { recursive: true });
  await writeFile(path.join("dist", board.id, "index.html"), entry);
}
await writeFile("dist/canvas/index.json", `${JSON.stringify(catalogFor(boards), null, 2)}\n`);
await writeFile("dist/404.html", entry);
console.log(`Published ${boards.length} board(s) and static entry pages.`);
