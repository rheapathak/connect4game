// server/lib/game.js
class Game {
    constructor(rows = 6, cols = 7) {
      this.rows = rows;
      this.cols = cols;
      this.reset();
    }
  
    reset() {
      // board[row][col] where row 0 is top. We'll place discs from bottom.
      this.board = Array.from({ length: this.rows }, () => Array(this.cols).fill(null));
      this.currentPlayerIndex = 0; // 0 or 1
      this.status = 'playing'; // playing | finished
      this.winner = null; // 0 or 1 or null
      this.moves = 0;
    }
  
    getBoard() {
      return this.board;
    }
  
    // drop a disc for playerIndex into column
    play(playerIndex, column) {
      if (this.status !== 'playing') {
        return { ok: false, message: 'Game already finished' };
      }
      if (playerIndex !== this.currentPlayerIndex) {
        return { ok: false, message: 'Not your turn' };
      }
      if (typeof column !== 'number' || column < 0 || column >= this.cols) {
        return { ok: false, message: 'Invalid column' };
      }
  
      // find lowest empty row in column
      let placedRow = -1;
      for (let r = this.rows - 1; r >= 0; r--) {
        if (this.board[r][column] === null) {
          this.board[r][column] = playerIndex;
          placedRow = r;
          break;
        }
      }
      if (placedRow === -1) {
        return { ok: false, message: 'Column is full' };
      }
  
      this.moves += 1;
  
      // check win
      if (this.checkWin(placedRow, column, playerIndex)) {
        this.status = 'finished';
        this.winner = playerIndex;
        return { ok: true, message: 'win' };
      }
  
      // check draw
      if (this.moves >= this.rows * this.cols) {
        this.status = 'finished';
        this.winner = null;
        return { ok: true, message: 'draw' };
      }
  
      // else change turn
      this.currentPlayerIndex = 1 - this.currentPlayerIndex;
      return { ok: true, message: 'accepted' };
    }
  
    // check 4-in-a-row using deltas
    checkWin(r, c, player) {
      const directions = [
        { dr: 0, dc: 1 },  // horizontal
        { dr: 1, dc: 0 },  // vertical
        { dr: 1, dc: 1 },  // diagonal down-right
        { dr: 1, dc: -1 }  // diagonal down-left
      ];
      for (const dir of directions) {
        let count = 1;
        // forward
        count += this.countDirection(r, c, dir.dr, dir.dc, player);
        // backward
        count += this.countDirection(r, c, -dir.dr, -dir.dc, player);
        if (count >= 4) return true;
      }
      return false;
    }
  
    countDirection(r, c, dr, dc, player) {
      let rr = r + dr;
      let cc = c + dc;
      let cnt = 0;
      while (rr >= 0 && rr < this.rows && cc >= 0 && cc < this.cols) {
        if (this.board[rr][cc] === player) {
          cnt++;
          rr += dr;
          cc += dc;
        } else break;
      }
      return cnt;
    }
  }
  
  module.exports = Game;
  