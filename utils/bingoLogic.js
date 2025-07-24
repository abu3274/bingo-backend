// utils/bingoLogic.js

// Generate a BINGO card (5x5) with appropriate number ranges
function generateCard() {
  const card = [];
  const ranges = {
    B: [1, 15],
    I: [16, 30],
    N: [31, 45],
    G: [46, 60],
    O: [61, 75]
  };

  Object.values(ranges).forEach((range, colIndex) => {
    const [min, max] = range;
    const col = [];
    const used = new Set();
    while (col.length < 5) {
      const num = Math.floor(Math.random() * (max - min + 1)) + min;
      if (!used.has(num)) {
        used.add(num);
        col.push(num);
      }
    }
    card.push(col);
  });

  // Transpose to row-major and set center free space
  const finalCard = Array.from({ length: 5 }, (_, row) =>
    Array.from({ length: 5 }, (_, col) => (row === 2 && col === 2 ? 'F' : card[col][row]))
  );

  return finalCard;
}

// Check if card is winning with given called numbers
function checkWin(card, calledNumbers) {
  const isMarked = (val) => val === 'F' || calledNumbers.has(val);

  const winPatterns = [];

  // Horizontal
  for (let row = 0; row < 5; row++) {
    if (card[row].every(isMarked)) {
      winPatterns.push({ type: 'horizontal', index: row });
    }
  }

  // Vertical
  for (let col = 0; col < 5; col++) {
    if (card.every(row => isMarked(row[col]))) {
      winPatterns.push({ type: 'vertical', index: col });
    }
  }

  // Diagonal TL-BR
  if ([0, 1, 2, 3, 4].every(i => isMarked(card[i][i]))) {
    winPatterns.push({ type: 'diagonal', direction: 'TL-BR' });
  }

  // Diagonal TR-BL
  if ([0, 1, 2, 3, 4].every(i => isMarked(card[i][4 - i]))) {
    winPatterns.push({ type: 'diagonal', direction: 'TR-BL' });
  }

  // Four corners
  if (
    isMarked(card[0][0]) &&
    isMarked(card[0][4]) &&
    isMarked(card[4][0]) &&
    isMarked(card[4][4])
  ) {
    winPatterns.push({ type: 'fourCorners' });
  }

  return winPatterns.length > 0 ? winPatterns : null;
}

module.exports = {
  generateCard,
  checkWin
};
