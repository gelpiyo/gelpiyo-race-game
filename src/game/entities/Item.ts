export type ItemType = 'senbei' | 'egg' | 'soccer_ball' | 'gelpiyo';

export interface ItemInfo {
  type: ItemType;
  name: string;
  description: string;
  color: string;
  emoji: string;
}

export const ITEM_DEFS: Record<ItemType, ItemInfo> = {
  senbei: {
    type: 'senbei',
    name: 'せんべい',
    description: '5秒間スピードアップ！',
    color: '#cc8833',
    emoji: '🍘',
  },
  egg: {
    type: 'egg',
    name: 'たまご',
    description: '前を走るキャラに卵をぶつける！',
    color: '#ffffff',
    emoji: '🥚',
  },
  soccer_ball: {
    type: 'soccer_ball',
    name: 'サッカーボール',
    description: '全員クラッシュ！',
    color: '#111111',
    emoji: '⚽',
  },
  gelpiyo: {
    type: 'gelpiyo',
    name: 'ゲルぴよ',
    description: '10秒無敵＋スピード30%UP！',
    color: '#FFD700',
    emoji: '🐣',
  },
};

export interface ItemBox {
  x: number;
  y: number;
  active: boolean;
  respawnTimer: number;
}

export class ItemSystem {
  public boxes: ItemBox[] = [];
  private respawnTime: number = 10;

  initBoxes(spawnPoints: { x: number; y: number }[]): void {
    this.boxes = spawnPoints.map(p => ({
      x: p.x,
      y: p.y,
      active: true,
      respawnTimer: 0,
    }));
  }

  update(dt: number): void {
    for (const box of this.boxes) {
      if (!box.active) {
        box.respawnTimer -= dt;
        if (box.respawnTimer <= 0) {
          box.active = true;
        }
      }
    }
  }

  tryCollect(kartX: number, kartY: number, kartRadius: number): ItemType | null {
    for (const box of this.boxes) {
      if (!box.active) continue;
      const dx = kartX - box.x;
      const dy = kartY - box.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist < kartRadius + 30) {
        box.active = false;
        box.respawnTimer = this.respawnTime;
        return this.randomItem();
      }
    }
    return null;
  }

  private randomItem(): ItemType {
    const rand = Math.random();
    if (rand < 0.30) return 'senbei';
    if (rand < 0.55) return 'egg';
    if (rand < 0.75) return 'soccer_ball';
    return 'gelpiyo';
  }
}
