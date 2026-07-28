export type HomeInputMode = 'auto' | 'keyboard' | 'gamepad' | 'touch' | 'orientation';
export type HomePlayerState = 'idle' | 'moving' | 'interacting';

export interface HomeVector {
  x: number;
  y: number;
}

export interface HomeWorldBounds {
  x: number;
  y: number;
  width: number;
  height: number;
}

export type HomeInteractionAction =
  | { type: 'scene'; scene: string }
  | { type: 'sleep' }
  | { type: 'settings' };

export interface HomeBuildingDefinition {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  label: string;
  subtitle: string;
  icon: string;
  accent: number;
}

export interface HomeEntranceDefinition {
  id: string;
  buildingId: string;
  x: number;
  y: number;
  radius: number;
  priority: number;
  label: string;
  hint: string;
  action: HomeInteractionAction;
}

export interface HomeInteractionCandidate {
  id: string;
  x: number;
  y: number;
  radius: number;
  priority: number;
  label: string;
  hint: string;
  action: HomeInteractionAction;
}
