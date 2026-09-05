import { lazy, Suspense, useEffect, useRef, useState } from "react";
import type { ExcalidrawImperativeAPI } from "@excalidraw/excalidraw/types";
import type { BoardEntry, LoadedBoard } from "../lib/boards";
import { fetchBoard, InvalidBoardError } from "../lib/boards";
import { ErrorBoundary } from "./ErrorBoundary";

const Excalidraw = lazy(async () => {
  const module = await import("@excalidraw/excalidraw");
  await import("@excalidraw/excalidraw/index.css");
  return { default: module.Excalidraw };
});

export function BoardViewer({ board, goBack }: { board: BoardEntry; goBack: () => void }) {
  const [attempt, setAttempt] = useState(0);
  const [loaded, setLoaded] = useState<LoadedBoard | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [invalid, setInvalid] = useState(false);
  const api = useRef<ExcalidrawImperativeAPI | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    setLoaded(null); setError(null); setInvalid(false);
    fetchBoard(board, controller.signal).then(setLoaded).catch((reason: unknown) => {
      if (!(reason instanceof DOMException && reason.name === "AbortError"))
        { setInvalid(reason instanceof InvalidBoardError); setError(reason instanceof Error ? reason.message : "The board could not be loaded."); }
    });
    return () => controller.abort();
  }, [board, attempt]);

  const download = () => {
    if (!loaded) return;
    const url = URL.createObjectURL(loaded.blob);
    const anchor = document.createElement("a"); anchor.href = url; anchor.download = board.file; anchor.click();
    setTimeout(() => URL.revokeObjectURL(url), 0);
  };

  return <main className="viewer-page">
    <header className="viewer-header">
      <button className="text-button" onClick={goBack}>← Gallery</button><h1>{board.title}</h1>
      <div className="viewer-actions"><button disabled={!loaded} onClick={() => api.current?.scrollToContent(undefined, { fitToContent: true })}>Fit to content</button><button disabled={!loaded} onClick={download}>Download original</button></div>
    </header>
    {error ? <div className="notice error" role="alert"><h2>{invalid ? "Invalid board file" : "Unable to load board"}</h2><p>{error}</p><button onClick={() => setAttempt((value) => value + 1)}>Retry</button></div> :
      !loaded ? <div className="notice" role="status"><h2>Loading board…</h2><p>Fetching only the selected canvas.</p></div> :
      <div className="canvas-shell">
        <ErrorBoundary resetKey={`${board.id}-${attempt}`}><Suspense fallback={<div className="notice">Loading viewer…</div>}>
          <Excalidraw key={board.id} excalidrawAPI={(value) => { api.current = value; }} viewModeEnabled zenModeEnabled gridModeEnabled={false}
            initialData={{ elements: loaded.scene.elements, files: loaded.scene.files, appState: { ...loaded.scene.appState, viewModeEnabled: true } }}
            UIOptions={{ canvasActions: { loadScene: false, saveToActiveFile: false, export: false, toggleTheme: false } }}
            onLinkOpen={(element, event) => {
              event.preventDefault();
              if (!element.link) return;
              try { const url = new URL(element.link); if (url.protocol === "http:" || url.protocol === "https:") window.open(url, "_blank", "noopener,noreferrer"); } catch { /* Block malformed links. */ }
            }} />
        </Suspense></ErrorBoundary>
      </div>}
  </main>;
}
