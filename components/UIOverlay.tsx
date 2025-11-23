import React, { useState } from 'react';
import { ELEMENTS, ElementType } from '../types';
import { Sparkles, Eraser, Hand, Paintbrush, ZoomIn, ZoomOut, X, Droplets, Box, Flame, Hexagon, Play, Gamepad2, Pencil, ArrowLeft, ArrowRight, ArrowUp } from 'lucide-react';

export type ToolType = 'brush' | 'eraser' | 'hand';
export type GameMode = 'edit' | 'play';

interface UIOverlayProps {
  selectedElement: ElementType;
  onSelectElement: (element: ElementType) => void;
  onGenerate: (prompt: string) => void;
  isGenerating: boolean;
  particleCount: number;
  isAiModalOpen: boolean;
  setIsAiModalOpen: (isOpen: boolean) => void;
  currentTool: ToolType;
  setTool: (tool: ToolType) => void;
  onZoom: (delta: number) => void;
  onReset: () => void;
  gameMode: GameMode;
  setGameMode: (mode: GameMode) => void;
  inputRef: React.MutableRefObject<{ left: boolean; right: boolean; jump: boolean }>;
}

const ElementIcon = ({ type }: { type: ElementType }) => {
  switch(type) {
    case 'WATER': return <Droplets size={18} />;
    case 'SAND': return <Hexagon size={18} className="rotate-90" />;
    case 'FIRE': return <Flame size={18} />;
    case 'STONE': return <Box size={18} />;
    case 'WOOD': return <div className="w-4 h-4 rounded-sm border-2 border-current" />;
    default: return <div className="w-4 h-4 rounded-full bg-current" />;
  }
};

export const UIOverlay: React.FC<UIOverlayProps> = ({
  selectedElement,
  onSelectElement,
  onGenerate,
  isGenerating,
  particleCount,
  isAiModalOpen,
  setIsAiModalOpen,
  currentTool,
  setTool,
  onZoom,
  onReset,
  gameMode,
  setGameMode,
  inputRef
}) => {
  const [prompt, setPrompt] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (prompt.trim()) {
      onGenerate(prompt);
      setPrompt('');
      setIsAiModalOpen(false);
    }
  };

  // Touch handlers for controls
  const handleInput = (key: 'left' | 'right' | 'jump', active: boolean) => {
      inputRef.current[key] = active;
  };

  return (
    <div className="absolute inset-0 pointer-events-none flex flex-col z-10 select-none">
      
      {/* Top Bar - With Safe Area Padding */}
      <div className="flex justify-between items-start p-4 pt-[max(1rem,env(safe-area-inset-top))] pointer-events-auto">
        <div className="bg-black/40 backdrop-blur-md p-3 rounded-xl border border-white/10 shadow-lg flex flex-col">
           <h1 className="font-bold text-lg bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-cyan-300 leading-none">
            Pixel Fluid
          </h1>
          <div className="flex items-center gap-2 mt-1">
            <p className="text-[10px] text-gray-400 font-mono">{particleCount} Particles</p>
            {gameMode === 'play' && <span className="text-[10px] text-green-400 font-bold px-1 border border-green-500/30 rounded">PLAY</span>}
          </div>
        </div>

        <div className="flex gap-2">
            {/* Game Mode Toggle */}
            <button
                onClick={() => setGameMode(gameMode === 'edit' ? 'play' : 'edit')}
                className={`p-3 rounded-xl backdrop-blur-md border border-white/10 shadow-lg transition-all ${
                    gameMode === 'play' 
                    ? 'bg-green-600 text-white shadow-green-500/20' 
                    : 'bg-gray-800/80 text-white active:bg-gray-700'
                }`}
                title={gameMode === 'edit' ? "Switch to Play Mode" : "Switch to Edit Mode"}
            >
                {gameMode === 'edit' ? <Gamepad2 size={20} /> : <Pencil size={20} />}
            </button>

            {gameMode === 'edit' && (
                <>
                <button
                    onClick={onReset}
                    className="bg-gray-800/80 active:bg-gray-700 text-white p-3 rounded-xl backdrop-blur-md border border-white/10 shadow-lg"
                    title="Clear All"
                >
                    <Eraser size={20} />
                </button>
                <button
                    onClick={() => onZoom(-1)}
                    className="bg-gray-800/80 active:bg-gray-700 text-white p-3 rounded-xl backdrop-blur-md border border-white/10 shadow-lg hidden sm:flex"
                >
                    <ZoomOut size={20} />
                </button>
                <button
                    onClick={() => onZoom(1)}
                    className="bg-gray-800/80 active:bg-gray-700 text-white p-3 rounded-xl backdrop-blur-md border border-white/10 shadow-lg hidden sm:flex"
                >
                    <ZoomIn size={20} />
                </button>
                <button
                    onClick={() => setIsAiModalOpen(true)}
                    className="bg-gradient-to-br from-blue-600 to-cyan-600 text-white p-3 rounded-xl shadow-lg shadow-blue-500/20 border border-white/10 animate-pulse-slow"
                >
                    <Sparkles size={20} />
                </button>
                </>
            )}
        </div>
      </div>

      {/* Center Area - Loading State */}
      {isGenerating && (
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-black/80 text-white px-6 py-3 rounded-full backdrop-blur-xl flex items-center gap-3 border border-blue-500/30 z-50">
          <div className="animate-spin h-5 w-5 border-2 border-blue-500 border-t-transparent rounded-full"></div>
          <span className="font-medium animate-pulse">Simulating...</span>
        </div>
      )}

      <div className="flex-1"></div>

      {/* Play Mode Controls - With Safe Area Padding */}
      {gameMode === 'play' && (
          <div className="pointer-events-auto p-6 pb-[max(2rem,env(safe-area-inset-bottom))] flex justify-between items-end">
              {/* D-Pad */}
              <div className="flex gap-4">
                  <button
                    className="w-16 h-16 bg-gray-800/50 backdrop-blur-md border border-white/10 rounded-full flex items-center justify-center active:bg-white/20 active:scale-95 transition-all"
                    onPointerDown={(e) => { e.stopPropagation(); handleInput('left', true); }}
                    onPointerUp={(e) => { e.stopPropagation(); handleInput('left', false); }}
                    onPointerLeave={(e) => { e.stopPropagation(); handleInput('left', false); }}
                  >
                      <ArrowLeft size={32} className="text-white" />
                  </button>
                  <button
                    className="w-16 h-16 bg-gray-800/50 backdrop-blur-md border border-white/10 rounded-full flex items-center justify-center active:bg-white/20 active:scale-95 transition-all"
                    onPointerDown={(e) => { e.stopPropagation(); handleInput('right', true); }}
                    onPointerUp={(e) => { e.stopPropagation(); handleInput('right', false); }}
                    onPointerLeave={(e) => { e.stopPropagation(); handleInput('right', false); }}
                  >
                      <ArrowRight size={32} className="text-white" />
                  </button>
              </div>

              {/* Jump Button */}
              <button
                className="w-20 h-20 bg-blue-600/80 backdrop-blur-md border border-blue-400/30 rounded-full flex items-center justify-center active:bg-blue-500 active:scale-95 transition-all shadow-lg shadow-blue-500/30"
                onPointerDown={(e) => { e.stopPropagation(); handleInput('jump', true); }}
                onPointerUp={(e) => { e.stopPropagation(); handleInput('jump', false); }}
                onPointerLeave={(e) => { e.stopPropagation(); handleInput('jump', false); }}
              >
                  <ArrowUp size={40} className="text-white" />
              </button>
          </div>
      )}

      {/* Edit Mode Controls - With Safe Area Padding */}
      {gameMode === 'edit' && (
        <div className="pointer-events-auto flex flex-col gap-3 p-4 pb-[max(1rem,env(safe-area-inset-bottom))] bg-gradient-to-t from-black/90 via-black/50 to-transparent">
            
            {/* Elements Palette */}
            <div className="self-center w-full max-w-md">
                <div className="flex gap-2 overflow-x-auto pb-2 custom-scrollbar justify-start sm:justify-center px-2">
                {ELEMENTS.map((el) => (
                    <button
                    key={el.id}
                    onClick={() => {
                        onSelectElement(el.id);
                        if (currentTool !== 'brush') setTool('brush');
                    }}
                    className={`flex-shrink-0 flex items-center gap-2 px-4 py-2 rounded-xl border transition-all shadow-sm ${
                        selectedElement === el.id && currentTool === 'brush'
                        ? 'bg-white text-black border-white scale-105 font-bold' 
                        : 'bg-gray-800/80 text-gray-300 border-gray-700 hover:bg-gray-700'
                    }`}
                    >
                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: el.color }} />
                    <span className="text-xs whitespace-nowrap">{el.name}</span>
                    </button>
                ))}
                </div>
            </div>

            {/* Tools Toolbar */}
            <div className="self-center bg-gray-900/90 backdrop-blur-xl p-1.5 rounded-2xl border border-white/10 shadow-2xl flex gap-1 sm:gap-2">
                <button
                    onClick={() => setTool('hand')}
                    className={`p-4 rounded-xl flex flex-col items-center gap-1 min-w-[4.5rem] transition-all ${
                        currentTool === 'hand' 
                        ? 'bg-gray-700 text-white shadow-inner' 
                        : 'text-gray-400 hover:text-white hover:bg-gray-800'
                    }`}
                >
                    <Hand size={24} />
                    <span className="text-[10px] font-medium">Move</span>
                </button>
                
                <button
                    onClick={() => setTool('brush')}
                    className={`p-4 rounded-xl flex flex-col items-center gap-1 min-w-[4.5rem] transition-all ${
                        currentTool === 'brush' 
                        ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/20' 
                        : 'text-gray-400 hover:text-white hover:bg-gray-800'
                    }`}
                >
                    <Paintbrush size={24} />
                    <span className="text-[10px] font-medium">Draw</span>
                </button>

                <button
                    onClick={() => setTool('eraser')}
                    className={`p-4 rounded-xl flex flex-col items-center gap-1 min-w-[4.5rem] transition-all ${
                        currentTool === 'eraser' 
                        ? 'bg-gray-700 text-red-400 shadow-inner' 
                        : 'text-gray-400 hover:text-white hover:bg-gray-800'
                    }`}
                >
                    <Eraser size={24} />
                    <span className="text-[10px] font-medium">Erase</span>
                </button>
            </div>
        </div>
      )}

      {/* AI Modal */}
      {isAiModalOpen && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center pointer-events-auto z-50 p-4">
          <div className="bg-gray-900 border border-gray-700 rounded-3xl p-6 w-full max-w-md shadow-2xl transform transition-all animate-in fade-in zoom-in duration-200">
            <div className="flex justify-between items-center mb-4">
              <div className="flex items-center gap-2 text-blue-400">
                <Sparkles size={24} />
                <h2 className="text-xl font-bold text-white">AI Simulation</h2>
              </div>
              <button
                onClick={() => setIsAiModalOpen(false)}
                className="text-gray-400 hover:text-white p-2 rounded-full hover:bg-gray-800"
              >
                <X size={24} />
              </button>
            </div>
            
            <form onSubmit={handleSubmit}>
              <p className="text-gray-400 mb-4 text-sm">
                Describe a scene to simulate:
              </p>
              
              <input
                type="text"
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder="e.g., A platformer level with lava pits"
                className="w-full bg-gray-950 border border-gray-700 text-white px-4 py-4 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none mb-6 text-lg"
                autoFocus
              />

              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setIsAiModalOpen(false)}
                  className="flex-1 py-3 text-gray-300 hover:bg-gray-800 rounded-xl font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!prompt.trim()}
                  className="flex-1 py-3 bg-gradient-to-r from-blue-600 to-cyan-600 text-white font-bold rounded-xl shadow-lg disabled:opacity-50"
                >
                  Generate
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};