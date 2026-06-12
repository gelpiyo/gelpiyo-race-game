import { create } from 'zustand';

export type GameScreen = 'title' | 'charSelect' | 'race' | 'result';

interface GameState {
  screen: GameScreen;
  selectedCharacter: string;
  setScreen: (screen: GameScreen) => void;
  setSelectedCharacter: (id: string) => void;
}

export const useGameStore = create<GameState>((set) => ({
  screen: 'title',
  selectedCharacter: 'gelpiyo',
  setScreen: (screen) => set({ screen }),
  setSelectedCharacter: (id) => set({ selectedCharacter: id }),
}));
