import type { BoardEntry } from "../lib/boards";

export function BoardList({ boards, navigate }: { boards: BoardEntry[]; navigate: (path: string) => void }) {
  if (!boards.length) return <div className="notice"><h2>No boards yet</h2><p>Add an Excalidraw file to the canvas folder to publish it.</p></div>;
  return <ul className="board-grid">{boards.map((board) => <li key={board.id}>
    <a className="board-card" href={`${import.meta.env.BASE_URL}${board.id}/`} onClick={(event) => { event.preventDefault(); navigate(board.id); }}>
      <span className="board-mark" aria-hidden="true">↗</span><strong>{board.title}</strong><span>{board.file}</span>
    </a>
  </li>)}</ul>;
}
