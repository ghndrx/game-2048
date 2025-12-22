import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { RefreshCw, Undo } from 'lucide-react';

type Grid = number[][];
type Direction = 'UP' | 'DOWN' | 'LEFT' | 'RIGHT';

const GRID_SIZE = 4;

const App: React.FC = () => {
  const [grid, setGrid] = useState<Grid>([]);
  const [score, setScore] = useState(0);
  const [bestScore, setBestScore] = useState(0);
  const [gameOver, setGameOver] = useState(false);
  const [history, setHistory] = useState<Grid[]>([]);
  const [touchStart, setTouchStart] = useState<{ x: number; y: number } | null>(null);

  const initializeGrid = useCallback(() => {
    const newGrid = Array(GRID_SIZE).fill(0).map(() => Array(GRID_SIZE).fill(0));
    addRandomTile(newGrid);
    addRandomTile(newGrid);
    setGrid(newGrid);
    setScore(0);
    setGameOver(false);
    setHistory([]);
  }, []);

  useEffect(() => {
    initializeGrid();
    const savedBest = localStorage.getItem('2048-best-score');
    if (savedBest) setBestScore(parseInt(savedBest));
  }, [initializeGrid]);

  useEffect(() => {
    if (score > bestScore) {
      setBestScore(score);
      localStorage.setItem('2048-best-score', score.toString());
    }
  }, [score, bestScore]);

  const addRandomTile = (currentGrid: Grid) => {
    const emptyCells = [];
    for (let i = 0; i < GRID_SIZE; i++) {
      for (let j = 0; j < GRID_SIZE; j++) {
        if (currentGrid[i][j] === 0) emptyCells.push({ x: i, y: j });
      }
    }
    if (emptyCells.length > 0) {
      const { x, y } = emptyCells[Math.floor(Math.random() * emptyCells.length)];
      currentGrid[x][y] = Math.random() < 0.9 ? 2 : 4;
    }
  };

  const move = useCallback((direction: Direction) => {
    if (gameOver) return;

    const newGrid = JSON.parse(JSON.stringify(grid));
    let moved = false;
    let newScore = score;

    const rotate = (matrix: Grid) => matrix[0].map((_, i) => matrix.map(row => row[i]).reverse());

    let workingGrid = [...newGrid];

    if (direction === 'LEFT') workingGrid = rotate(rotate(workingGrid)); // 180
    if (direction === 'UP') workingGrid = rotate(rotate(rotate(workingGrid))); // 270
    if (direction === 'DOWN') workingGrid = rotate(workingGrid); // 90

    // Real implementation of slide and merge:
    for (let i = 0; i < GRID_SIZE; i++) {
      let row = workingGrid[i].filter((val: number) => val !== 0);
      for (let j = 0; j < row.length - 1; j++) {
        if (row[j] === row[j + 1]) {
          row[j] *= 2;
          newScore += row[j];
          row.splice(j + 1, 1);
        }
      }
      while (row.length < GRID_SIZE) row.push(0);
      if (JSON.stringify(workingGrid[i]) !== JSON.stringify(row)) moved = true;
      workingGrid[i] = row;
    }

    // Rotate back
    if (direction === 'LEFT') workingGrid = rotate(rotate(workingGrid));
    if (direction === 'UP') workingGrid = rotate(workingGrid);
    if (direction === 'DOWN') workingGrid = rotate(rotate(rotate(workingGrid)));

    if (moved) {
      setHistory(prev => [...prev, grid]);
      addRandomTile(workingGrid);
      setGrid(workingGrid);
      setScore(newScore);
      
      // Check game over logic could be added here
    }
  }, [grid, gameOver, score]);

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    switch (e.key) {
      case 'ArrowUp': move('UP'); break;
      case 'ArrowDown': move('DOWN'); break;
      case 'ArrowLeft': move('LEFT'); break;
      case 'ArrowRight': move('RIGHT'); break;
    }
  }, [move]);

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  const handleTouchStart = (e: React.TouchEvent) => {
    setTouchStart({ x: e.touches[0].clientX, y: e.touches[0].clientY });
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (!touchStart) return;

    const touchEndX = e.changedTouches[0].clientX;
    const touchEndY = e.changedTouches[0].clientY;

    const diffX = touchStart.x - touchEndX;
    const diffY = touchStart.y - touchEndY;

    if (Math.abs(diffX) > Math.abs(diffY)) {
      // Horizontal swipe
      if (Math.abs(diffX) > 30) { // Threshold
        if (diffX > 0) move('LEFT');
        else move('RIGHT');
      }
    } else {
      // Vertical swipe
      if (Math.abs(diffY) > 30) { // Threshold
        if (diffY > 0) move('UP');
        else move('DOWN');
      }
    }
    setTouchStart(null);
  };

  const getTileColor = (value: number) => {
    const colors: Record<number, string> = {
      2: 'bg-gray-200 text-gray-800',
      4: 'bg-orange-100 text-gray-800',
      8: 'bg-orange-300 text-white',
      16: 'bg-orange-400 text-white',
      32: 'bg-orange-500 text-white',
      64: 'bg-orange-600 text-white',
      128: 'bg-yellow-400 text-white',
      256: 'bg-yellow-500 text-white',
      512: 'bg-yellow-600 text-white',
      1024: 'bg-yellow-700 text-white',
      2048: 'bg-yellow-800 text-white',
    };
    return colors[value] || 'bg-black text-white';
  };

  return (
    <div className="min-h-screen bg-[#faf8ef] flex flex-col items-center justify-center p-4 font-sans">
      <div className="w-full max-w-md">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-6xl font-bold text-[#776e65]">2048</h1>
            <p className="text-[#776e65] text-lg">Join the numbers!</p>
          </div>
          <div className="flex gap-2">
            <div className="bg-[#bbada0] p-2 rounded-md text-white text-center min-w-[80px]">
              <div className="text-xs font-bold uppercase">Score</div>
              <div className="text-xl font-bold">{score}</div>
            </div>
            <div className="bg-[#bbada0] p-2 rounded-md text-white text-center min-w-[80px]">
              <div className="text-xs font-bold uppercase">Best</div>
              <div className="text-xl font-bold">{bestScore}</div>
            </div>
          </div>
        </div>

        <div className="flex justify-between mb-8">
          <button onClick={initializeGrid} className="bg-[#8f7a66] text-white px-4 py-2 rounded font-bold flex items-center gap-2 hover:bg-[#7f6a56] transition-colors">
            <RefreshCw size={20} /> New Game
          </button>
          <button onClick={() => {
            if (history.length > 0) {
              setGrid(history[history.length - 1]);
              setHistory(prev => prev.slice(0, -1));
            }
          }} className="bg-[#8f7a66] text-white px-4 py-2 rounded font-bold flex items-center gap-2 hover:bg-[#7f6a56] transition-colors disabled:opacity-50" disabled={history.length === 0}>
            <Undo size={20} /> Undo
          </button>
        </div>

        <div 
          className="bg-[#bbada0] p-4 rounded-lg relative touch-none"
          onTouchStart={handleTouchStart}
          onTouchEnd={handleTouchEnd}
        >
          <div className="grid grid-cols-4 gap-4">
            {grid.map((row, i) => (
              row.map((cell, j) => (
                <div key={`${i}-${j}`} className="w-full pt-[100%] relative bg-[#cdc1b4] rounded-md">
                  <AnimatePresence mode='popLayout'>
                    {cell !== 0 && (
                      <motion.div
                        key={`${i}-${j}-${cell}`} // Unique key for animation
                        initial={{ scale: 0, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        exit={{ scale: 0, opacity: 0 }}
                        transition={{ type: "spring", stiffness: 200, damping: 20 }}
                        className={`absolute inset-0 flex items-center justify-center text-3xl font-bold rounded-md ${getTileColor(cell)}`}
                      >
                        {cell}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              ))
            ))}
          </div>
          
          {gameOver && (
            <div className="absolute inset-0 bg-white/70 flex flex-col items-center justify-center rounded-lg z-10">
              <h2 className="text-4xl font-bold text-[#776e65] mb-4">Game Over!</h2>
              <button onClick={initializeGrid} className="bg-[#8f7a66] text-white px-6 py-3 rounded font-bold text-xl hover:bg-[#7f6a56] transition-colors">
                Try Again
              </button>
            </div>
          )}
        </div>
        
        <p className="mt-8 text-[#776e65] text-center">
          Use <strong>arrow keys</strong> or <strong>swipe</strong> to move tiles.
        </p>
      </div>
    </div>
  );
};

export default App;
