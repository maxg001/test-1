export type Vector3 = [number, number, number];

export type ElementType = 'AIR' | 'SAND' | 'WATER' | 'STONE' | 'WOOD' | 'FIRE';

export interface Block {
  id: string;
  position: Vector3;
  color: string;
  type: ElementType;
}

export interface ElementConfig {
  id: ElementType;
  name: string;
  color: string;
  description: string;
}

export const ELEMENTS: ElementConfig[] = [
  { id: 'SAND', name: 'Sand', color: '#fbbf24', description: 'Falls and piles up' }, // Amber-400
  { id: 'WATER', name: 'Water', color: '#3b82f6', description: 'Flows and fills' }, // Blue-500
  { id: 'STONE', name: 'Stone', color: '#52525b', description: 'Static solid' },   // Zinc-600
  { id: 'WOOD', name: 'Wood', color: '#78350f', description: 'Solid organic' },    // Amber-900
  { id: 'FIRE', name: 'Fire', color: '#ef4444', description: 'Burns things' },     // Red-500
];

export interface AIStructureResponse {
  blocks: {
    x: number;
    y: number;
    z: number;
    color: string;
  }[];
  name: string;
}
