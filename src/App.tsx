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
    let newTiles = [...tiles];
    let newScore = score;
    let moved = false;
    let counter = tileIdCounter;

    // Helper to move tiles in a row (left direction)
    const processRow = (row: Tile[]): { tiles: Tile[]; merged: boolean } => {
      const nonEmpty = row.filter(t => t.value !== 0);
      const result: Tile[] = [];
      let localMerged = false;
      
      for (let i = 0; i < nonEmpty.length; i++) {
        if (i < nonEmpty.length - 1 && nonEmpty[i].value === nonEmpty[i + 1].value) {
          // Merge
          const newValue = nonEmpty[i].value * 2;
          result.push({
            id: `tile-${counter++}`,
            value: newValue,
            row: nonEmpty[i].row,
            col: nonEmpty[i].col,
            mergedFrom: [nonEmpty[i].id, nonEmpty[i + 1].id]
          });
          newScore += newValue;
          localMerged = true;
          i++; // Skip next tile
        } else {
          result.push({ ...nonEmpty[i] });
        }
      }
      
      return { tiles: result, merged: localMerged };
    };

    // Process based on direction
    const processGrid = () => {
      const newTileArray: Tile[] = [];
      
      if (direction === 'LEFT') {
        for (let row = 0; row < GRID_SIZE; row++) {
          const rowTiles = newTiles.filter(t => t.row === row).sort((a, b) => a.col - b.col);
          const { tiles: processed, merged } = processRow(rowTiles);
          processed.forEach((tile, idx) => {
            tile.row = row;
            tile.col = idx;
            if (tile.col !== rowTiles[idx]?.col) moved = true;
            newTileArray.push(tile);
          });
          if (merged) moved = true;
        }
      } else if (direction === 'RIGHT') {
        for (let row = 0; row < GRID_SIZE; row++) {
          const rowTiles = newTiles.filter(t => t.row === row).sort((a, b) => b.col - a.col);
          const { tiles: processed, merged } = processRow(rowTiles);
          processed.forEach((tile, idx) => {
            tile.row = row;
            tile.col = GRID_SIZE - 1 - idx;
            if (tile.col !== rowTiles[idx]?.col) moved = true;
            newTileArray.push(tile);
          });
          if (merged) moved = true;
        }
      } else if (direction === 'UP') {
        for (let col = 0; col < GRID_SIZE; col++) {
          const colTiles = newTiles.filter(t => t.col === col).sort((a, b) => a.row - b.row);
          const { tiles: processed, merged } = processRow(colTiles);
          processed.forEach((tile, idx) => {
            tile.col = col;
            tile.row = idx;
            if (tile.row !== colTiles[idx]?.row) moved = true;
            newTileArray.push(tile);
          });
          if (merged) moved = true;
        }
      } else if (direction === 'DOWN') {
        for (let col = 0; col < GRID_SIZE; col++) {
          const colTiles = newTiles.filter(t => t.col === col).sort((a, b) => b.row - a.row);
          const { tiles: processed, merged } = processRow(colTiles);
          processed.forEach((tile, idx) => {
            tile.col = col;
            tile.row = GRID_SIZE - 1 - idx;
            if (tile.row !== colTiles[idx]?.row) moved = true;
            newTileArray.push(tile);
          });
          if (merged) moved = true;
        }
      }
      
      return newTileArray;
    };

    const processedTiles = processGrid();

    if (moved) {
      // Update grid from tiles
      newGrid = Array(GRID_SIZE).fill(0).map(() => Array(GRID_SIZE).fill(0));
      processedTiles.forEach(tile => {
        newGrid[tile.row][tile.col] = tile.value;
      });

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
        processedTiles.push({ id: `tile-${counter++}`, value, row: r, col: c, isNew: true });
      }

      setHistory(prev => [...prev, grid]);
      setGrid(newGrid);
      setTiles(processedTiles);
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
