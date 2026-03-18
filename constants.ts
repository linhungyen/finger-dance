
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
  difficulty: 'Beginner' | 'Easy' | 'Medium' | 'Hard';
}

export const SONG_LIST: Song[] = [
  {
    id: 'dian_guang',
    title: '電光踏節奏',
    artist: 'Jeff Lin',
    bpm: 120, // 預設 120 BPM，可以依實際節奏再做修改
    url: '/電光踏節奏.mp3',
    difficulty: 'Medium'
  },
  {
    id: 'tiao_dao',
    title: '跳到想你為止',
    artist: 'Jeff Lin',
    bpm: 85, // 較慢的節奏
    url: '/跳到想你為止.mp3',
    difficulty: 'Easy'
  },
  {
    id: 'man_dong_zuo',
    title: '慢動作的勇氣',
    artist: 'Jeff Lin',
    bpm: 60, // 最慢的節奏
    url: '/慢動作的勇氣.mp3',
    difficulty: 'Beginner'
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
