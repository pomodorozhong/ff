#!/usr/bin/env node
import { classifySize, discoverBoards } from "./board-tools.mjs";

export async function checkBoardSizes(directory = "canvas") {
  const boards = await discoverBoards(directory, { parse: false });
  let total = 0; let failed = false;
  for (const board of boards) {
    total += board.bytes;
    const result = classifySize(board.bytes);
    const mb = (board.bytes / 1_000_000).toFixed(2);
    if (result === "warning") console.warn(`WARNING ${board.path}: ${mb} MB (warning threshold: 40.00 MB)`);
    if (result === "error") { console.error(`ERROR ${board.path}: ${mb} MB (maximum: below 90.00 MB)`); failed = true; }
  }
  console.log(`Total: ${(total / 1_000_000).toFixed(2)} MB across ${boards.length} board(s)`);
  return !failed;
}

if (process.argv[1] && import.meta.url === new URL(`file://${process.argv[1]}`).href) {
  checkBoardSizes().then((valid) => { if (!valid) process.exitCode = 1; }).catch((error) => { console.error(error.message); process.exitCode = 1; });
}
