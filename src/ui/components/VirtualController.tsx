import React, { useCallback, useRef, useEffect } from 'react';

function dispatchInput(state: Record<string, boolean>) {
  window.dispatchEvent(new CustomEvent('vpad-input', { detail: state }));
}

export const VirtualController: React.FC = () => {
  const dpadRef = useRef<HTMLDivElement>(null);
  const dpadState = useRef({ left: false, right: false, up: false, down: false });
  const activeTouchId = useRef<number | null>(null);
  const indicatorRef = useRef<HTMLDivElement>(null);
  const activeButtons = useRef<Set<string>>(new Set());

  const steerRef = useRef({ steerValue: 0, throttle: 0 });

  const emitState = useCallback(() => {
    const state: Record<string, boolean | number> = {
      left: dpadState.current.left,
      right: dpadState.current.right,
      accelerate: dpadState.current.up,
      brake: dpadState.current.down,
      jump: activeButtons.current.has('jump'),
      useItem: activeButtons.current.has('useItem'),
      steerValue: steerRef.current.steerValue,
    };
    dispatchInput(state);
  }, []);

  const updateDpad = useCallback((clientX: number, clientY: number) => {
    const el = dpadRef.current;
    if (!el) return;

    const rect = el.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    const dx = clientX - cx;
    const dy = clientY - cy;
    const dist = Math.sqrt(dx * dx + dy * dy);
    const radius = rect.width / 2;
    const deadzone = radius * 0.12;

    if (dist < deadzone) {
      dpadState.current = { left: false, right: false, up: false, down: false };
      steerRef.current = { steerValue: 0, throttle: 0 };
      if (indicatorRef.current) {
        indicatorRef.current.style.transform = 'translate(-50%, -50%)';
        indicatorRef.current.style.opacity = '0.4';
      }
    } else {
      // Analog: normalize dx/dy by radius, clamp to -1..1
      const magnitude = Math.min(dist / radius, 1.0);
      const normX = (dx / dist) * magnitude;  // -1 (left) to +1 (right)
      const normY = (dy / dist) * magnitude;  // -1 (up) to +1 (down)

      // Analog steer value: full horizontal component
      steerRef.current = { steerValue: normX, throttle: -normY };

      // Boolean fallbacks (for accelerate/brake detection)
      const left  = normX < -0.25;
      const right = normX > 0.25;
      const up    = normY < -0.3;
      const down  = normY > 0.3;

      dpadState.current = { left, right, up, down };

      if (indicatorRef.current) {
        const maxMove = rect.width * 0.32;
        const clampDist = Math.min(dist, maxMove);
        const nx = (dx / dist) * clampDist;
        const ny = (dy / dist) * clampDist;
        indicatorRef.current.style.transform = `translate(calc(-50% + ${nx}px), calc(-50% + ${ny}px))`;
        indicatorRef.current.style.opacity = '1';
      }
    }
    emitState();
  }, [emitState]);

  const resetDpad = useCallback(() => {
    dpadState.current = { left: false, right: false, up: false, down: false };
    steerRef.current = { steerValue: 0, throttle: 0 };
    activeTouchId.current = null;
    if (indicatorRef.current) {
      indicatorRef.current.style.transform = 'translate(-50%, -50%)';
      indicatorRef.current.style.opacity = '0.4';
    }
    emitState();
  }, [emitState]);

  useEffect(() => {
    const el = dpadRef.current;
    if (!el) return;

    const onTouchStart = (e: TouchEvent) => {
      e.preventDefault();
      if (activeTouchId.current !== null) return;
      const touch = e.changedTouches[0];
      activeTouchId.current = touch.identifier;
      updateDpad(touch.clientX, touch.clientY);
    };

    const onTouchMove = (e: TouchEvent) => {
      e.preventDefault();
      for (let i = 0; i < e.changedTouches.length; i++) {
        const touch = e.changedTouches[i];
        if (touch.identifier === activeTouchId.current) {
          updateDpad(touch.clientX, touch.clientY);
          break;
        }
      }
    };

    const onTouchEnd = (e: TouchEvent) => {
      e.preventDefault();
      for (let i = 0; i < e.changedTouches.length; i++) {
        if (e.changedTouches[i].identifier === activeTouchId.current) {
          resetDpad();
          break;
        }
      }
    };

    el.addEventListener('touchstart', onTouchStart, { passive: false });
    el.addEventListener('touchmove', onTouchMove, { passive: false });
    el.addEventListener('touchend', onTouchEnd, { passive: false });
    el.addEventListener('touchcancel', onTouchEnd, { passive: false });

    return () => {
      el.removeEventListener('touchstart', onTouchStart);
      el.removeEventListener('touchmove', onTouchMove);
      el.removeEventListener('touchend', onTouchEnd);
      el.removeEventListener('touchcancel', onTouchEnd);
    };
  }, [updateDpad, resetDpad]);

  // Mouse fallback for desktop testing
  const mouseDown = useRef(false);
  const onMouseDown = useCallback((e: React.MouseEvent) => {
    mouseDown.current = true;
    updateDpad(e.clientX, e.clientY);
  }, [updateDpad]);
  const onMouseMove = useCallback((e: React.MouseEvent) => {
    if (mouseDown.current) updateDpad(e.clientX, e.clientY);
  }, [updateDpad]);
  const onMouseUp = useCallback(() => {
    mouseDown.current = false;
    resetDpad();
  }, [resetDpad]);

  // Button handlers
  const handleBtnDown = useCallback((button: string) => {
    activeButtons.current.add(button);
    emitState();
  }, [emitState]);
  const handleBtnUp = useCallback((button: string) => {
    activeButtons.current.delete(button);
    emitState();
  }, [emitState]);

  const makeBtnHandlers = (button: string) => ({
    onTouchStart: (e: React.TouchEvent) => { e.preventDefault(); handleBtnDown(button); },
    onTouchEnd: (e: React.TouchEvent) => { e.preventDefault(); handleBtnUp(button); },
    onTouchCancel: (e: React.TouchEvent) => { e.preventDefault(); handleBtnUp(button); },
    onMouseDown: () => handleBtnDown(button),
    onMouseUp: () => handleBtnUp(button),
    onMouseLeave: () => handleBtnUp(button),
  });

  useEffect(() => {
    return () => {
      dispatchInput({ left: false, right: false, accelerate: false, brake: false, jump: false, useItem: false });
    };
  }, []);

  return (
    <>
      {/* Top-right action buttons */}
      <div className="vpad-action-buttons">
        <button className="vpad-btn vpad-btn-jump" {...makeBtnHandlers('jump')}>
          JUMP
        </button>
        <button className="vpad-btn vpad-btn-item" {...makeBtnHandlers('useItem')}>
          ITEM
        </button>
      </div>

      {/* Bottom-left D-Pad */}
      <div className="vpad-bottom-dpad">
        <div
          className="dpad-zone"
          ref={dpadRef}
          onMouseDown={onMouseDown}
          onMouseMove={onMouseMove}
          onMouseUp={onMouseUp}
          onMouseLeave={onMouseUp}
        >
          <div className="dpad-arrows">
            <span className="dpad-arrow dpad-up">▲</span>
            <span className="dpad-arrow dpad-right-arrow">▶</span>
            <span className="dpad-arrow dpad-down">▼</span>
            <span className="dpad-arrow dpad-left-arrow">◀</span>
          </div>
          <div className="dpad-knob" ref={indicatorRef} />
        </div>
      </div>
    </>
  );
};
