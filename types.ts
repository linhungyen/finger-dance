
export enum FingerType {
  INDEX = 0,
  MIDDLE = 1,
  RING = 2,
  PINKY = 3
}

export interface Note {
  id: number;
  track: FingerType;
  targetTime: number; // The absolute music time this note should be hit
  hit: boolean;
  missed: boolean;
}

export interface Feedback {
  text: string;
  color: string;
  opacity: number;
  y: number;
  id: number;
}
