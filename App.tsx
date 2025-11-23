import React, { useState } from 'react';
import { VoxelGame } from './components/VoxelGame';
import { Droplets, Hand, Zap, Gamepad2 } from 'lucide-react';

const App: React.FC = () => {
  const [isStarted, setIsStarted] = useState(false);

  const handleStart = async () => {
    setIsStarted(true);
    
    // Request Fullscreen for immersive experience
    try {
      if (document.documentElement.requestFullscreen) {
        await document.documentElement.requestFullscreen();
      } else if ((document.documentElement as any).webkitRequestFullscreen) {
        await (document.documentElement as any).webkitRequestFullscreen();
      }
      
      // Attempt to lock orientation to landscape (Android only)
      if (screen.orientation && (screen.orientation as any).lock) {
        try {
          await (screen.orientation as any).lock('landscape');
        } catch (e) {
          // Orientation lock might fail on some browsers/devices, ignore
        }
      }
    } catch (e) {
      console.log("Fullscreen request failed", e);
    }
  };

  if (!isStarted) {
    return (
      <div className="w-full h-screen bg-gray-950 flex items-center justify-center text-white p-4 relative overflow-hidden">
        {/* Background Effect */}
        <div className="absolute inset-0 z-0 opacity-20 pointer-events-none">
            <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(circle_at_50%_50%,rgba(59,130,246,0.2),transparent_70%)]"></div>
        </div>
        
        <div className="max-w-md w-full bg-gray-900/90 backdrop-blur-xl border border-gray-800 rounded-3xl p-8 shadow-2xl z-10 text-center flex flex-col items-center">
          <div className="w-20 h-20 bg-gradient-to-br from-blue-600 to-cyan-500 rounded-2xl mb-6 flex items-center justify-center shadow-lg shadow-blue-500/30 animate-float">
            <Droplets size={40} className="text-white" />
          </div>
          
          <h1 className="text-3xl font-bold mb-3 bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-cyan-300">
            Pixel Fluid
          </h1>
          
          <p className="text-gray-400 mb-8 text-base leading-relaxed">
            Create physics sandboxes and turn them into playable levels. Draw worlds, add water & fire, then jump in and play!
          </p>
          
          <div className="w-full space-y-3 mb-8 text-left">
             <div className="flex items-center gap-4 bg-gray-800/50 p-3 rounded-xl border border-gray-700/50">
                <div className="bg-gray-700 p-2 rounded-lg"><Hand size={18} /></div>
                <div className="flex-1">
                    <p className="text-sm font-semibold text-gray-200">Touch Controls</p>
                    <p className="text-xs text-gray-400">One finger to paint. Two fingers to zoom.</p>
                </div>
             </div>
             <div className="flex items-center gap-4 bg-gray-800/50 p-3 rounded-xl border border-gray-700/50">
                <div className="bg-blue-900/50 border border-blue-500/30 p-2 rounded-lg"><Zap size={18} className="text-blue-400"/></div>
                 <div className="flex-1">
                    <p className="text-sm font-semibold text-gray-200">Physics Engine</p>
                    <p className="text-xs text-gray-400">Real-time falling sand and fluid simulation.</p>
                </div>
             </div>
             <div className="flex items-center gap-4 bg-gray-800/50 p-3 rounded-xl border border-gray-700/50">
                <div className="bg-green-900/50 border border-green-500/30 p-2 rounded-lg"><Gamepad2 size={18} className="text-green-400"/></div>
                 <div className="flex-1">
                    <p className="text-sm font-semibold text-gray-200">Play Mode</p>
                    <p className="text-xs text-gray-400">Switch to play mode to run and jump in your creation.</p>
                </div>
             </div>
          </div>

          <button
            onClick={handleStart}
            className="w-full py-4 bg-white text-gray-950 font-bold rounded-2xl shadow-xl hover:bg-gray-100 transition-all transform active:scale-[0.98] text-lg"
          >
            Start Creating
          </button>
        </div>
      </div>
    );
  }

  return <VoxelGame />;
};

export default App;