import React from 'react';
import './Board.css';

export default function Board({ board, onPlay, currentPlayer, yourIndex, winner, status }) {
  // board is rows x cols with null or 0/1
  if (!board) return null;
  const rows = board.length;
  const cols = board[0].length;

  function handleColumnClick(c) {
    // only allow clicking if it's your turn
    if (status !== 'playing') return;
    if (yourIndex !== currentPlayer) {
      // not your turn
      return;
    }
    onPlay(c);
  }

  return (
    <div className="board-root">
      <div className="info">
        <div>Turn: {currentPlayer === 0 ? 'Player 0' : 'Player 1'}</div>
        <div>Your index: {yourIndex}</div>
        <div>Status: {status}{winner !== null ? ` — Winner: ${winner}` : ''}</div>
      </div>
      <div className="board" role="grid" aria-label="Connect 4 board">
        {Array.from({ length: cols }).map((_, c) => (
          <div key={`col-${c}`} className="col-handle" onClick={() => handleColumnClick(c)}>
            ⬇
          </div>
        ))}
        {board.map((row, r) => (
          <div key={`row-${r}`} className="row">
            {row.map((cell, c) => (
              <div key={`cell-${r}-${c}`} className={`cell ${cell === null ? '' : 'filled'}`} data-player={cell}>
                {cell === null ? '' : (cell === 0 ? '●' : '○')}
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
