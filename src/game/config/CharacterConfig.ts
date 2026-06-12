export interface CharacterStats {
  speedMax: number;
  acceleration: number;
  turnRate: number;
  jumpPower: number;
  collisionForce: number;
}

export interface CharacterDef {
  id: string;
  name: string;
  description: string;
  color: string;
  stats: CharacterStats;
  gameSprite: string;
  systemImage: string;
}

export const CHARACTERS: CharacterDef[] = [
  {
    id: 'gelpiyo',
    name: 'ゲルぴよ',
    description: 'バランス型。すべての能力が平均的で扱いやすい。',
    color: '#FFD700',
    stats: { speedMax: 688, acceleration: 1.0, turnRate: 1.0, jumpPower: 1.0, collisionForce: 1.0 },
    gameSprite: 'assets/characters/game/gelpiyo.png',
    systemImage: 'assets/characters/system/gelpiyo.jpg',
  },
  {
    id: 'momopiyo',
    name: 'モモぴよ',
    description: 'ジャンプ型。高いジャンプ力でショートカットが得意。',
    color: '#FF69B4',
    stats: { speedMax: 688, acceleration: 1.3, turnRate: 1.15, jumpPower: 1.5, collisionForce: 0.8 },
    gameSprite: 'assets/characters/game/momopiyo.png',
    systemImage: 'assets/characters/system/momopiyo.jpg',
  },
  {
    id: 'blue',
    name: 'ブルー',
    description: 'スピード型。最高速度が高いが加速とハンドリングは低め。',
    color: '#00BFFF',
    stats: { speedMax: 688, acceleration: 0.65, turnRate: 0.85, jumpPower: 0.8, collisionForce: 0.9 },
    gameSprite: 'assets/characters/game/blue.png',
    systemImage: 'assets/characters/system/blue.jpg',
  },
  {
    id: 'red',
    name: 'レッド',
    description: 'パワー型。接触時の弾き力が強く、ライバルを吹き飛ばせる。',
    color: '#FF4444',
    stats: { speedMax: 688, acceleration: 1.15, turnRate: 0.9, jumpPower: 0.9, collisionForce: 1.5 },
    gameSprite: 'assets/characters/game/red.png',
    systemImage: 'assets/characters/system/red.jpg',
  },
];

export function getCharacter(id: string): CharacterDef {
  return CHARACTERS.find(c => c.id === id) || CHARACTERS[0];
}

export function getOtherCharacters(selectedId: string): CharacterDef[] {
  return CHARACTERS.filter(c => c.id !== selectedId);
}
