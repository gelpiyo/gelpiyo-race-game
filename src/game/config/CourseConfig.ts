export interface CourseDef {
  id: string;
  name: string;
  subtitle: string;
  concept: string;
  difficulty: number; // 1-6
  glowColor: string;
  roadColor: string;
  groundColor: string;
  centerLineColor: string;
  accentColor: string;
  bgColor: string;
}

export const COURSES: CourseDef[] = [
  {
    id: 'cyber_ring',
    name: 'CYBER RING',
    subtitle: 'ネオンサイバー',
    concept: 'なめらかな円形。\n初心者向け入門コース。',
    difficulty: 1,
    glowColor: '#0ea5e9',
    roadColor: '#1e293b',
    groundColor: '#0f172a',
    centerLineColor: '#0ea5e9',
    accentColor: '#0ea5e9',
    bgColor: '#020617',
  },
  {
    id: 'sunset_oval',
    name: 'SUNSET OVAL',
    subtitle: 'サバンナ夕日',
    concept: '楕円＋ゆるいS字。\nブレーキングを意識しよう。',
    difficulty: 2,
    glowColor: '#f97316',
    roadColor: '#292524',
    groundColor: '#7c2d12',
    centerLineColor: '#fbbf24',
    accentColor: '#f97316',
    bgColor: '#431407',
  },
  {
    id: 'glacier_pass',
    name: 'GLACIER PASS',
    subtitle: '氷河の峠道',
    concept: '8の字コース。\n交差点での接触に注意。',
    difficulty: 3,
    glowColor: '#a5f3fc',
    roadColor: '#1e3a5f',
    groundColor: '#0c4a6e',
    centerLineColor: '#67e8f9',
    accentColor: '#22d3ee',
    bgColor: '#083344',
  },
  {
    id: 'volcano_inferno',
    name: 'VOLCANO INFERNO',
    subtitle: '火山溶岩地帯',
    concept: 'タイトコーナー連続。\nコースアウト注意。',
    difficulty: 4,
    glowColor: '#ef4444',
    roadColor: '#1c0a00',
    groundColor: '#450a0a',
    centerLineColor: '#fb923c',
    accentColor: '#dc2626',
    bgColor: '#3b0000',
  },
  {
    id: 'neon_spiral',
    name: 'NEON SPIRAL',
    subtitle: 'サイバー連続ヘアピン',
    concept: '螺旋状にカーブが続く。\nハンドルを切り続ける地獄。',
    difficulty: 5,
    glowColor: '#a855f7',
    roadColor: '#1a0a2e',
    groundColor: '#2e1065',
    centerLineColor: '#e879f9',
    accentColor: '#a855f7',
    bgColor: '#0f0020',
  },
  {
    id: 'labyrinth',
    name: 'LABYRINTH',
    subtitle: '迷宮回廊',
    concept: '最高難易度。\n複雑な入り組んだ迷路状コース。\nコースを覚えないと勝てない。',
    difficulty: 6,
    glowColor: '#10b981',
    roadColor: '#0a1a0f',
    groundColor: '#052e16',
    centerLineColor: '#34d399',
    accentColor: '#10b981',
    bgColor: '#000a05',
  },
];

export function getCourse(id: string): CourseDef {
  return COURSES.find(c => c.id === id) ?? COURSES[0];
}
