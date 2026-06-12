import React, { useCallback } from 'react';

interface GameButtonsProps {
  screen: string;
}

/**
 * HTML overlay buttons for mobile touch support.
 * Phaser's built-in touch on Text/Zone is unreliable on mobile browsers,
 * so critical navigation buttons are rendered as HTML elements above the canvas.
 */
export const GameButtons: React.FC<GameButtonsProps> = ({ screen }) => {

  const emit = useCallback((action: string) => {
    window.dispatchEvent(new CustomEvent('game-button', { detail: action }));
  }, []);

  // Title screen: full screen invisible button for reliable mobile tap
  if (screen === 'title') {
    return (
      <button 
        className="game-overlay-btn game-btn-fullscreen"
        onTouchStart={(e) => { e.preventDefault(); emit('titleStart'); }}
        onMouseDown={() => emit('titleStart')}
      />
    );
  }

  // Character select: 4 card tap areas + NEXT button
  if (screen === 'charSelect') {
    return (
      <>
        {/* Invisible tap zones over the 4 character cards (2x2 grid) */}
        <div className="game-card-grid game-card-grid-char">
          {[0,1,2,3].map(i => (
            <button
              key={i}
              className="game-overlay-btn game-card-tap"
              onTouchStart={(e) => { e.preventDefault(); emit(`selectChar_${i}`); }}
              onMouseDown={() => emit(`selectChar_${i}`)}
            />
          ))}
        </div>
        <button
          className="game-overlay-btn game-btn-next"
          onTouchStart={(e) => { e.preventDefault(); emit('charSelectNext'); }}
          onMouseDown={() => emit('charSelectNext')}
        >NEXT ▶</button>
      </>
    );
  }

  // Course select: 6 card tap areas + BACK + RACE START
  if (screen === 'courseSelect') {
    return (
      <>
        {/* Invisible tap zones over the 6 course cards (2x3 grid) */}
        <div className="game-card-grid game-card-grid-course">
          {[0,1,2,3,4,5].map(i => (
            <button
              key={i}
              className="game-overlay-btn game-card-tap"
              onTouchStart={(e) => { e.preventDefault(); emit(`selectCourse_${i}`); }}
              onMouseDown={() => emit(`selectCourse_${i}`)}
            />
          ))}
        </div>
        <button
          className="game-overlay-btn game-btn-back"
          onTouchStart={(e) => { e.preventDefault(); emit('back'); }}
          onMouseDown={() => emit('back')}
        >◀ BACK</button>
        <button
          className="game-overlay-btn game-btn-start"
          onTouchStart={(e) => { e.preventDefault(); emit('raceStart'); }}
          onMouseDown={() => emit('raceStart')}
        >▶ RACE START</button>
      </>
    );
  }

  // Race: QUIT + SKIP
  if (screen === 'race') {
    return (
      <>
        <button
          className="game-overlay-btn game-btn-quit"
          onTouchStart={(e) => { e.preventDefault(); emit('quit'); }}
          onMouseDown={() => emit('quit')}
        >◀ QUIT</button>
        <button
          className="game-overlay-btn game-btn-skip"
          onTouchStart={(e) => { e.preventDefault(); emit('skip'); }}
          onMouseDown={() => emit('skip')}
        >SKIP ▶</button>
      </>
    );
  }

  // Result: retry, charSelect, title
  if (screen === 'result') {
    return (
      <div className="game-result-buttons">
        <button
          className="game-overlay-btn game-btn-retry"
          onTouchStart={(e) => { e.preventDefault(); emit('retry'); }}
          onMouseDown={() => emit('retry')}
        >もういちど</button>
        <button
          className="game-overlay-btn game-btn-charsel"
          onTouchStart={(e) => { e.preventDefault(); emit('charSelect'); }}
          onMouseDown={() => emit('charSelect')}
        >キャラ選択</button>
        <button
          className="game-overlay-btn game-btn-totitle"
          onTouchStart={(e) => { e.preventDefault(); emit('toTitle'); }}
          onMouseDown={() => emit('toTitle')}
        >タイトルへ</button>
      </div>
    );
  }

  return null;
};
