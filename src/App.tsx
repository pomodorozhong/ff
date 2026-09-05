import { useCallback, useEffect, useState } from "react";
import { BoardList } from "./components/BoardList";
import { BoardViewer } from "./components/BoardViewer";
import { fetchCatalog, routeFromPath, type BoardEntry } from "./lib/boards";

export default function App() {
  const [path, setPath] = useState(location.pathname);
  const [catalog, setCatalog] = useState<BoardEntry[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);
  useEffect(() => { const update = () => setPath(location.pathname); addEventListener("popstate", update); return () => removeEventListener("popstate", update); }, []);
  useEffect(() => { const controller = new AbortController(); setError(null); fetchCatalog(controller.signal).then(setCatalog).catch((reason: unknown) => { if (!(reason instanceof DOMException && reason.name === "AbortError")) setError(reason instanceof Error ? reason.message : "Could not load the gallery."); }); return () => controller.abort(); }, [attempt]);
  const navigate = useCallback((id?: string) => { const next = id ? `${import.meta.env.BASE_URL}${id}/` : import.meta.env.BASE_URL; history.pushState(null, "", next); setPath(location.pathname); }, []);
  const route = routeFromPath(path, import.meta.env.BASE_URL);
  const board = typeof route === "string" ? catalog?.find((entry) => entry.id === route) : undefined;

  if (error) return <main className="page"><div className="notice error" role="alert"><h1>Gallery unavailable</h1><p>{error}</p><button onClick={() => setAttempt((value) => value + 1)}>Retry</button></div></main>;
  if (!catalog) return <main className="page"><div className="notice" role="status"><h1>Freeform Moodboards</h1><p>Loading gallery…</p></div></main>;
  if (route === null) return <main className="page"><header className="hero"><p className="eyebrow">Freeform collection</p><h1>Moodboards for ideas in progress.</h1><p>Explore visual notes, references, and sketches on an infinite canvas.</p></header><BoardList boards={catalog} navigate={navigate} /></main>;
  if (board) return <BoardViewer board={board} goBack={() => navigate()} />;
  return <main className="page"><div className="notice"><p className="eyebrow">404</p><h1>Board not found</h1><p>This link does not match a published moodboard.</p><button onClick={() => navigate()}>Return to gallery</button></div></main>;
}
