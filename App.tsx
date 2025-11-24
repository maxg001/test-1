import React, { useEffect } from 'react';
import { VoxelGame } from './components/VoxelGame';

const App: React.FC = () => {
  useEffect(() => {
    // Attempt to lock orientation to landscape on mobile (silently fail if not supported/allowed)
    const lockOrientation = async () => {
      if (typeof screen !== 'undefined' && screen.orientation && (screen.orientation as any).lock) {
        try {
          await (screen.orientation as any).lock('landscape');
        } catch (e) {
          // Orientation lock requires user interaction or PWA standalone mode
        }
      }
    };
    lockOrientation();
  }, []);

  return <VoxelGame />;
};

export default App;