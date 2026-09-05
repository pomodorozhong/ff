#!/usr/bin/env node
import { discoverBoards } from "./board-tools.mjs";

discoverBoards().then((boards) => console.log(`Validated ${boards.length} board(s).`)).catch((error) => { console.error(error.message); process.exitCode = 1; });
