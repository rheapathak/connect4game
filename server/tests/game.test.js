const Game = require('../lib/game');

describe('Connect4 core logic', () => {
  test('horizontal win detection', () => {
    const g = new Game(6,7);
    // simulate player 0 placing at bottom row columns 0..3
    g.board[5][0] = 0;
    g.board[5][1] = 0;
    g.board[5][2] = 0;
    expect(g.checkWin(5,2,0)).toBe(true);
  });

  test('vertical win detection', () => {
    const g = new Game(6,7);
    g.board[5][0] = 1;
    g.board[4][0] = 1;
    g.board[3][0] = 1;
    g.board[2][0] = 1;
    expect(g.checkWin(2,0,1)).toBe(true);
  });

  test('diagonal win detection', () => {
    const g = new Game(6,7);
    // diagonal down-right
    g.board[2][0] = 0;
    g.board[3][1] = 0;
    g.board[4][2] = 0;
    g.board[5][3] = 0;
    expect(g.checkWin(5,3,0)).toBe(true);
  });

  test('draw detection', () => {
    const g = new Game(2,2); // small board for test
    // fill board with alternating no wins
    g.play(0, 0);
    g.play(1, 0);
    g.play(0, 1);
    const res = g.play(1, 1);
    expect(res.ok).toBe(true);
    expect(g.status).toBe('finished');
    expect(g.winner).toBe(null);
  });
});
