class Connect4 {
    constructor(rows = 6, cols = 7) {
      this.rows = rows;
      this.cols = cols;
      this.board = Array.from({ length: rows }, () => Array(cols).fill(null));
    }
  
    dropPiece(col, player) {
      for (let row = this.rows - 1; row >= 0; row--) {
        if (this.board[row][col] === null) {
          this.board[row][col] = player;
          return row;
        }
      }
      return -1; // column full
    }
  
    checkWin(row, col, player) {
      if (row < 0 || col < 0) return false;
      const directions = [
        [0, 1],   // → Horizontal
        [1, 0],   // ↓ Vertical
        [1, 1],   // ↘ Diagonal
        [1, -1],  // ↙ Diagonal
      ];
  
      const inBounds = (r, c) => r >= 0 && r < this.rows && c >= 0 && c < this.cols;
  
      for (const [dr, dc] of directions) {
        let count = 1;
  
        // forward direction
        let r = row + dr;
        let c = col + dc;
        while (inBounds(r, c) && this.board[r][c] === player) {
          count++;
          r += dr;
          c += dc;
        }
  
        // backward direction
        r = row - dr;
        c = col - dc;
        while (inBounds(r, c) && this.board[r][c] === player) {
          count++;
          r -= dr;
          c -= dc;
        }
  
        if (count >= 4) return true;
      }
  
      return false;
    }
  
    checkDraw() {
      return this.board.every(row => row.every(cell => cell !== null));
    }
  }
  
  module.exports = Connect4;
  