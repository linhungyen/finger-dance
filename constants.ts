
export const TRACK_COUNT = 4;
export const TRACK_COLORS = [
  '#22d3ee', // Index - Cyan
  '#4ade80', // Middle - Green
  '#facc15', // Ring - Yellow
  '#f472b6'  // Pinky - Pink
];

export const TRACK_LABELS = ['INDEX', 'MIDDLE', 'RING', 'PINKY'];

/**
 * 提高靈敏度：從 0.08 提升至 0.11，讓手指不需要完全貼死也能觸發。
 */
export const PINCH_THRESHOLD_3D = 0.11;

/**
 * 視覺引導閾值：當距離小於此值時開始顯示連線動畫。
 */
export const PRE_PINCH_THRESHOLD = 0.25;

export const SCROLL_SPEED = 0.45; 
export const JUDGMENT_LINE_Y = 850; 
export const GAME_DURATION_MS = 60000; 

export const JUDGMENT_WINDOWS = {
  PERFECT: 200, 
  GOOD: 400,    
};

export const LANDMARKS = {
  THUMB_TIP: 4,
  INDEX_TIP: 8,
  MIDDLE_TIP: 12,
  RING_TIP: 16,
  PINKY_TIP: 20
};

export interface Song {
  id: string;
  title: string;
  artist: string;
  bpm: number;
  url: string;
  difficulty: 'Easy' | 'Medium' | 'Hard';
}

export const SONG_LIST: Song[] = [
  {
    id: 'challenge_70',
    title: 'Rhythm Challenge',
    artist: 'Digital Maestro',
    bpm: 70,
    url: 'https://cdn.pixabay.com/audio/2022/03/10/audio_c8c8a7315b.mp3',
    difficulty: 'Medium'
  }
];

export const generateChartForSong = (bpm: number) => {
  const msPerBeat = (60 / bpm) * 1000;
  const chart = [];
  const startDelay = 3000;
  const totalBeats = Math.floor(GAME_DURATION_MS / msPerBeat);
  
  for (let i = 0; i < totalBeats; i++) {
    const isMajorBeat = i % 4 === 0;
    if (isMajorBeat || Math.random() > 0.3) {
      const track = Math.floor(Math.random() * 4);
      chart.push({ time: startDelay + i * msPerBeat, track });
    }
    if (Math.random() > 0.8) {
      let track2 = Math.floor(Math.random() * 4);
      chart.push({ time: startDelay + i * msPerBeat, track: track2 });
    }
  }
  return chart;
};
