import React, { useState, useEffect } from 'react';
import { GameCanvas } from './ui/components/GameCanvas';
import { VirtualController } from './ui/components/VirtualController';
import { GameButtons } from './ui/components/GameButtons';

const App: React.FC = () => {
  const [gameScreen, setGameScreen] = useState<string>('title');

  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      setGameScreen(detail);
    };
    window.addEventListener('game-screen', handler);
    return () => window.removeEventListener('game-screen', handler);
  }, []);

  const showControls = gameScreen === 'race';

  return (
    <div className="app-container">
      <GameCanvas />
      <GameButtons screen={gameScreen} />
      {showControls && <VirtualController />}
    </div>
  );
};

export default App;
