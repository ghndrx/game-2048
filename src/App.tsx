import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { RefreshCw, Undo } from 'lucide-react';

type Grid = number[][];
type Direction = 'UP' | 'DOWN' | 'LEFT' | 'RIGHT';

interface Tile {
  id: string;
  value: number;
  row: number;
  col: number;
  isNew?: boolean;
  mergedFrom?: string[];
}

const GRID_SIZE = 4;

const App: React.FC = () => {
  const [grid, setGrid] = useState<Grid>([]);
  const [tiles, setTiles] = useState<Tile[]>([]);
  const [score, setScore] = useState(0);
  const [bestScore, setBestScore] = useState(0);
  const [gameOver, setGameOver] = useState(false);
  const [history, setHistory] = useState<Grid[]>([]);
  const [touchStart, setTouchStart] = useState<{ x: number; y: number } | null>(null);
  const [tileIdCounter, setTileIdCounter] = useState(0);

  const initializeGrid = useCallback(() => {
    const newGrid = Array(GRID_SIZE).fill(0).map(() => Array(GRID_SIZE).fill(0));
    const newTiles: Tile[] = [];
    let counter = 0;
    
    // Add two random tiles
    for (let i = 0; i < 2; i++) {
      const emptyCells = [];
      for (let r = 0; r < GRID_SIZE; r++) {
        for (let c = 0; c < GRID_SIZE; c++) {
          if (newGrid[r][c] === 0) emptyCells.push({ r, c });
        }
      }
      if (emptyCells.length > 0) {
        const { r, c } = emptyCells[Math.floor(Math.random() * emptyCells.length)];
        const value = Math.random() < 0.9 ? 2 : 4;
        newGrid[r][c] = value;
        newTiles.push({ id: `tile-${counter++}`, value, row: r, col: c, isNew: true });
      }
    }
    
    setGrid(newGrid);
    setTiles(newTiles);
    setTileIdCounter(counter);
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

  const move = useCallback((direction: Direction) => {
    if (gameOver) return;

    let newGrid = JSON.parse(JSON.stringify(grid)) as Grid;
    let moved = false;
    let newScore = score;

    // Slide and merge logic for a single row/column
    const slideLine = (line: number[]): { line: number[], moved: boolean, score: number } => {
      // Remove zeros
      let filtered = line.filter(x => x !== 0);
      let newLine: number[] = [];
      let lineScore = 0;
      let lineMoved = false;
      
      // Merge adjacent equal tiles
      for (let i = 0; i < filtered.length; i++) {
        if (i < filtered.length - 1 && filtered[i] === filtered[i + 1]) {
          newLine.push(filtered[i] * 2);
          lineScore += filtered[i] * 2;
          i++; // Skip next element
        } else {
          newLine.push(filtered[i]);
        }
      }
      
      // Pad with zeros
      while (newLine.length < GRID_SIZE) {
        newLine.push(0);
      }
      
      // Check if anything moved
      for (let i = 0; i < GRID_SIZE; i++) {
        if (line[i] !== newLine[i]) {
          lineMoved = true;
          break;
        }
      }
      
      return { line: newLine, moved: lineMoved, score: lineScore };
    };

    // Process grid based on direction
    if (direction === 'LEFT') {
      for (let row = 0; row < GRID_SIZE; row++) {
        const result = slideLine(newGrid[row]);
        newGrid[row] = result.line;
        if (result.moved) moved = true;
        newScore += result.score;
      }
    } else if (direction === 'RIGHT') {
      for (let row = 0; row < GRID_SIZE; row++) {
        const reversed = [...newGrid[row]].reverse();
        const result = slideLine(reversed);
        newGrid[row] = result.line.reverse();
        if (result.moved) moved = true;
        newScore += result.score;
      }
    } else if (direction === 'UP') {
      for (let col = 0; col < GRID_SIZE; col++) {
        const column = newGrid.map(row => row[col]);
        const result = slideLine(column);
        for (let row = 0; row < GRID_SIZE; row++) {
          newGrid[row][col] = result.line[row];
        }
        if (result.moved) moved = true;
        newScore += result.score;
      }
    } else if (direction === 'DOWN') {
      for (let col = 0; col < GRID_SIZE; col++) {
        const column = newGrid.map(row => row[col]).reverse();
        const result = slideLine(column);
        const finalColumn = result.line.reverse();
        for (let row = 0; row < GRID_SIZE; row++) {
          newGrid[row][col] = finalColumn[row];
        }
        if (result.moved) moved = true;
        newScore += result.score;
      }
    }

    if (moved) {
      // Add random tile
      const emptyCells = [];
      for (let r = 0; r < GRID_SIZE; r++) {
        for (let c = 0; c < GRID_SIZE; c++) {
          if (newGrid[r][c] === 0) emptyCells.push({ r, c });
        }
      }
      
      if (emptyCells.length > 0) {
        const { r, c } = emptyCells[Math.floor(Math.random() * emptyCells.length)];
        const value = Math.random() < 0.9 ? 2 : 4;
        newGrid[r][c] = value;
      }

      // Update tiles array from grid
      const newTiles: Tile[] = [];
      let counter = tileIdCounter;
      for (let r = 0; r < GRID_SIZE; r++) {
        for (let c = 0; c < GRID_SIZE; c++) {
          if (newGrid[r][c] !== 0) {
            // Try to find existing tile at this position with same value
            const existingTile = tiles.find(t => t.row === r && t.col === c && t.value === newGrid[r][c]);
            if (existingTile) {
              newTiles.push({ ...existingTile, row: r, col: c });
            } else {
              // New tile or moved tile
              const movedTile = tiles.find(t => t.value === newGrid[r][c] && !newTiles.some(nt => nt.id === t.id));
              if (movedTile) {
                newTiles.push({ ...movedTile, row: r, col: c });
              } else {
                newTiles.push({ 
                  id: `tile-${counter++}`, 
                  value: newGrid[r][c], 
                  row: r, 
                  col: c,
                  isNew: true 
                });
              }
            }
          }
        }
      }

      setHistory(prev => [...prev, grid]);
      setGrid(newGrid);
      setTiles(newTiles);
      setTileIdCounter(counter);
      setScore(newScore);
    }
  }, [grid, tiles, gameOver, score, tileIdCounter]);

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
        if (diffX > 0) move('LEFT'); // Swiped left (finger moved left, touchStart.x > touchEnd.x)
        else move('RIGHT'); // Swiped right (finger moved right, touchStart.x < touchEnd.x)
      }
    } else {
      // Vertical swipe
      if (Math.abs(diffY) > 30) { // Threshold
        if (diffY > 0) move('UP'); // Swiped up (finger moved up, touchStart.y > touchEnd.y)
        else move('DOWN'); // Swiped down (finger moved down, touchStart.y < touchEnd.y)
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
          {/* Container for both grid and tiles */}
          <div className="relative" style={{ width: '100%', paddingBottom: '100%' }}>
            {/* Background grid cells */}
            <div className="absolute inset-0 grid grid-cols-4 gap-4">
              {Array(GRID_SIZE * GRID_SIZE).fill(0).map((_, idx) => (
                <div key={`bg-${idx}`} className="bg-[#cdc1b4] rounded-md" />
              ))}
            </div>
            
            {/* Animated tiles */}
            <div className="absolute inset-0 pointer-events-none">
              <AnimatePresence>
                {tiles.map((tile) => {
                  // Grid has 4 columns with gap-4 (16px)
                  // Total width = 4 cells + 3 gaps
                  // Each cell width = (100% - 3*16px) / 4
                  const gap = 16;
                  const cellWidth = `calc((100% - ${3 * gap}px) / 4)`;
                  const xPos = `calc((${cellWidth} + ${gap}px) * ${tile.col})`;
                  const yPos = `calc((${cellWidth} + ${gap}px) * ${tile.row})`;
                  
                  return (
                    <motion.div
                      key={tile.id}
                      initial={tile.isNew ? { 
                        scale: 0, 
                        opacity: 0,
                      } : false}
                      animate={{ 
                        scale: 1, 
                        opacity: 1,
                      }}
                      exit={{ scale: 0, opacity: 0 }}
                      transition={{ 
                        type: "spring", 
                        stiffness: 260, 
                        damping: 26,
                      }}
                      className={`absolute flex items-center justify-center text-3xl font-bold rounded-md ${getTileColor(tile.value)}`}
                      style={{
                        left: xPos,
                        top: yPos,
                        width: cellWidth,
                        height: cellWidth,
                      }}
                    >
                      {tile.value}
                    </motion.div>
                  );
                })}
              </AnimatePresence>
            </div>
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
