
import React, { useRef, useEffect, useState, useCallback } from 'react';
import { 
  TRACK_COUNT, 
  TRACK_COLORS, 
  TRACK_LABELS,
  PINCH_THRESHOLD_3D,
  PRE_PINCH_THRESHOLD,
  LANDMARKS, 
  JUDGMENT_LINE_Y,
  JUDGMENT_WINDOWS,
  SCROLL_SPEED,
  GAME_DURATION_MS,
  Song,
  generateChartForSong
} from '../constants';
import { Note, Feedback } from '../types';

interface GameViewProps {
  selectedSong: Song;
  onUpdateScore: (score: number, combo: number) => void;
  onGameOver: (finalScore: number, finalMaxCombo: number) => void;
  onRestart: () => void;
}

const GameView: React.FC<GameViewProps> = ({ selectedSong, onUpdateScore, onGameOver, onRestart }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const gameCanvasRef = useRef<HTMLCanvasElement>(null);
  
  const [isLoaded, setIsLoaded] = useState(false);
  const [isReadyToStart, setIsReadyToStart] = useState(false); 
  const [countdown, setCountdown] = useState<number | string | null>(null);
  const [gameTime, setGameTime] = useState(0);
  
  const scoreRef = useRef(0);
  const comboRef = useRef(0);
  const maxComboRef = useRef(0);
  const notesRef = useRef<Note[]>([]);
  
  const feedbacksRef = useRef<Feedback[]>([]);
  const isPinchingRef = useRef<boolean[]>([false, false, false, false]);
  const wasPinchingRef = useRef<boolean[]>([false, false, false, false]);
  const hitFlashRef = useRef<number[]>([0, 0, 0, 0]);
  const animationFrameRef = useRef<number>(0);
  const gameStartTimeRef = useRef<number | null>(null);
  const gameActiveRef = useRef(false);

  useEffect(() => {
    notesRef.current = generateChartForSong(selectedSong.bpm).map((n, i) => ({ 
      id: i, track: n.track, targetTime: n.time, hit: false, missed: false 
    }));
  }, [selectedSong]);

  const addFeedback = (text: string, color: string) => {
    feedbacksRef.current.push({ text, color, opacity: 1, y: JUDGMENT_LINE_Y - 50, id: Math.random() });
  };

  useEffect(() => {
    if (!videoRef.current || !canvasRef.current) return;

    const hands = new (window as any).Hands({
      locateFile: (file: string) => `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`
    });

    hands.setOptions({
      maxNumHands: 1,
      modelComplexity: 1, // 提升至 1 以獲得更精準的關鍵點座標
      minDetectionConfidence: 0.7,
      minTrackingConfidence: 0.7
    });

    let detectedFrames = 0;
    hands.onResults((results: any) => {
      if (!isLoaded && detectedFrames > 15) {
        setIsLoaded(true);
        setIsReadyToStart(true); 
      }
      detectedFrames++;

      const ctx = canvasRef.current?.getContext('2d');
      if (!ctx || !canvasRef.current) return;

      ctx.save();
      ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
      ctx.translate(canvasRef.current.width, 0);
      ctx.scale(-1, 1);

      const pRef = isPinchingRef.current;
      pRef.fill(false);

      if (results.multiHandLandmarks && results.multiHandLandmarks.length > 0) {
        for (const landmarks of results.multiHandLandmarks) {
          // 繪製半透明骨架
          (window as any).drawConnectors(ctx, landmarks, (window as any).HAND_CONNECTIONS, { 
            color: 'rgba(255, 255, 255, 0.2)', 
            lineWidth: 2 
          });
          
          const thumb = landmarks[LANDMARKS.THUMB_TIP];
          const tips = [
            landmarks[LANDMARKS.INDEX_TIP], 
            landmarks[LANDMARKS.MIDDLE_TIP], 
            landmarks[LANDMARKS.RING_TIP], 
            landmarks[LANDMARKS.PINKY_TIP]
          ];

          tips.forEach((tip, index) => {
            // 靈敏度優化：降低 Z 軸（深度）權重，因為單鏡頭深度偵測誤差大
            const dx = thumb.x - tip.x;
            const dy = thumb.y - tip.y;
            const dz = (thumb.z - tip.z) * 0.5; // Z 軸權重減半
            const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);

            const tx = tip.x * canvasRef.current!.width;
            const ty = tip.y * canvasRef.current!.height;
            const thx = thumb.x * canvasRef.current!.width;
            const thy = thumb.y * canvasRef.current!.height;

            // 視覺回饋：當手指接近時，顯示連線（磁吸感）
            if (dist < PRE_PINCH_THRESHOLD) {
              const alpha = 1 - (dist / PRE_PINCH_THRESHOLD);
              ctx.beginPath();
              ctx.moveTo(thx, thy);
              ctx.lineTo(tx, ty);
              ctx.strokeStyle = dist < PINCH_THRESHOLD_3D ? TRACK_COLORS[index] : `rgba(255,255,255,${alpha * 0.5})`;
              ctx.lineWidth = dist < PINCH_THRESHOLD_3D ? 6 : 2;
              ctx.stroke();

              // 在指尖繪製偵測環
              ctx.beginPath();
              ctx.arc(tx, ty, 8 + (alpha * 10), 0, Math.PI * 2);
              ctx.strokeStyle = TRACK_COLORS[index];
              ctx.lineWidth = 2;
              ctx.stroke();
            }

            // 判定觸發
            if (dist < PINCH_THRESHOLD_3D) {
              pRef[index] = true;
              
              // 觸發時的擴散圓圈視覺
              ctx.beginPath();
              ctx.arc(tx, ty, 25, 0, Math.PI * 2);
              ctx.fillStyle = `${TRACK_COLORS[index]}66`;
              ctx.fill();
            }
          });

          // 繪製拇指點
          ctx.beginPath();
          ctx.arc(thumb.x * canvasRef.current!.width, thumb.y * canvasRef.current!.height, 10, 0, Math.PI * 2);
          ctx.fillStyle = '#ffffff';
          ctx.fill();
        }
      }
      ctx.restore();
    });

    const camera = new (window as any).Camera(videoRef.current, {
      onFrame: async () => { await hands.send({ image: videoRef.current! }); },
      width: 1280,
      height: 720
    });
    camera.start();

    return () => {
      camera.stop();
      hands.close();
    };
  }, [isLoaded]);

  const handleUserClickToStart = () => {
    setIsReadyToStart(false);
    startCountdown();
  };

  const startCountdown = () => {
    let count = 3;
    setCountdown(count);
    const timer = setInterval(() => {
      count -= 1;
      if (count === 0) {
        setCountdown("GO!");
      } else if (count < 0) {
        clearInterval(timer);
        setCountdown(null);
        gameStartTimeRef.current = performance.now();
        gameActiveRef.current = true;
      } else {
        setCountdown(count);
      }
    }, 1000);
  };

  const update = useCallback(() => {
    const canvas = gameCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.save();
    ctx.scale(2, 2);
    ctx.fillStyle = '#020617';
    ctx.fillRect(0, 0, 500, 1000);

    if (!gameActiveRef.current || gameStartTimeRef.current === null) {
      ctx.restore();
      animationFrameRef.current = requestAnimationFrame(update);
      return;
    }

    const currentTime = performance.now() - gameStartTimeRef.current;
    setGameTime(currentTime);
    const trackWidth = 500 / TRACK_COUNT;

    for (let i = 0; i < TRACK_COUNT; i++) {
      ctx.fillStyle = 'rgba(255,255,255,0.015)';
      ctx.fillRect(i * trackWidth, 0, trackWidth, 1000);
      
      if (isPinchingRef.current[i]) {
        ctx.fillStyle = `${TRACK_COLORS[i]}33`;
        ctx.fillRect(i * trackWidth, 0, trackWidth, 1000);
      }

      if (hitFlashRef.current[i] > 0) {
        ctx.fillStyle = `${TRACK_COLORS[i]}${Math.floor(hitFlashRef.current[i] * 60).toString(16).padStart(2, '0')}`;
        ctx.fillRect(i * trackWidth, 0, trackWidth, 1000);
        hitFlashRef.current[i] -= 0.05;
      }

      ctx.strokeStyle = isPinchingRef.current[i] ? TRACK_COLORS[i] : 'rgba(255,255,255,0.1)';
      ctx.lineWidth = isPinchingRef.current[i] ? 12 : 2;
      ctx.strokeRect(i * trackWidth + 15, JUDGMENT_LINE_Y - 45, trackWidth - 30, 90);
      
      ctx.fillStyle = isPinchingRef.current[i] ? TRACK_COLORS[i] : 'rgba(255,255,255,0.4)';
      ctx.font = '900 16px Inter, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(TRACK_LABELS[i], i * trackWidth + trackWidth/2, JUDGMENT_LINE_Y + 85);
    }

    notesRef.current.forEach(note => {
      if (note.hit || note.missed) return;
      
      const timeDiff = note.targetTime - currentTime;
      const y = JUDGMENT_LINE_Y - (timeDiff * SCROLL_SPEED);

      if (y > -200 && y < 1200) {
        ctx.save();
        ctx.fillStyle = TRACK_COLORS[note.track];
        ctx.shadowBlur = 25;
        ctx.shadowColor = TRACK_COLORS[note.track];
        
        ctx.beginPath();
        ctx.roundRect(note.track * trackWidth + 12, y - 25, trackWidth - 24, 50, 15);
        ctx.fill();
        
        ctx.fillStyle = 'rgba(255,255,255,0.6)';
        ctx.fillRect(note.track * trackWidth + 20, y - 12, trackWidth - 40, 6);
        ctx.restore();
      }

      const isPinching = isPinchingRef.current[note.track];
      const wasPinching = wasPinchingRef.current[note.track];

      if (isPinching && !wasPinching) {
        const absDiff = Math.abs(timeDiff);
        if (absDiff <= JUDGMENT_WINDOWS.PERFECT) {
          note.hit = true; scoreRef.current += 1000; comboRef.current += 1;
          maxComboRef.current = Math.max(maxComboRef.current, comboRef.current);
          addFeedback("PERFECT", "#22d3ee");
          hitFlashRef.current[note.track] = 1;
          onUpdateScore(scoreRef.current, comboRef.current);
        } else if (absDiff <= JUDGMENT_WINDOWS.GOOD) {
          note.hit = true; scoreRef.current += 500; comboRef.current += 1;
          maxComboRef.current = Math.max(maxComboRef.current, comboRef.current);
          addFeedback("GREAT", "#4ade80");
          hitFlashRef.current[note.track] = 0.8;
          onUpdateScore(scoreRef.current, comboRef.current);
        }
      }

      if (timeDiff < -JUDGMENT_WINDOWS.GOOD) {
        note.missed = true; comboRef.current = 0;
        addFeedback("MISS", "#f43f5e");
        onUpdateScore(scoreRef.current, comboRef.current);
      }
    });

    for (let i = 0; i < TRACK_COUNT; i++) wasPinchingRef.current[i] = isPinchingRef.current[i];

    feedbacksRef.current = feedbacksRef.current.filter(f => f.opacity > 0);
    feedbacksRef.current.forEach(f => {
      ctx.globalAlpha = f.opacity;
      ctx.fillStyle = f.color;
      ctx.font = '900 80px Inter, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(f.text, 250, f.y);
      f.y -= 2.5; f.opacity -= 0.035;
      ctx.globalAlpha = 1;
    });

    if (currentTime >= GAME_DURATION_MS) {
      gameActiveRef.current = false;
      onGameOver(scoreRef.current, maxComboRef.current);
    }

    ctx.restore();
    animationFrameRef.current = requestAnimationFrame(update);
  }, [onUpdateScore, onGameOver]);

  useEffect(() => {
    animationFrameRef.current = requestAnimationFrame(update);
    return () => {
        cancelAnimationFrame(animationFrameRef.current);
    };
  }, [update]);

  const timeLeft = Math.max(0, Math.ceil((GAME_DURATION_MS - gameTime) / 1000));

  return (
    <div className="relative w-full h-full flex items-center justify-center">
      <video ref={videoRef} className="hidden" playsInline />
      
      <canvas 
        ref={canvasRef} 
        width={1280} 
        height={720} 
        className="absolute inset-0 w-full h-full object-cover z-10 opacity-60 pointer-events-none" 
      />
      
      <div className="relative w-full max-w-lg aspect-[9/16] bg-slate-900 border-x border-white/10 shadow-[0_0_100px_rgba(0,0,0,1)] z-20 overflow-hidden">
         <div className="absolute top-0 left-0 w-full p-8 flex justify-center items-center z-30">
            <div className="bg-slate-950/80 backdrop-blur-xl px-8 py-3 rounded-2xl border border-white/10 flex items-center gap-4">
                <span className="text-[10px] font-black text-white/40 uppercase tracking-[0.3em]">Neural Link Status</span>
                <span className={`text-3xl font-black text-white tabular-nums ${timeLeft <= 10 ? 'text-rose-500 animate-pulse' : ''}`}>
                  {timeLeft}s
                </span>
            </div>
         </div>

         <div className="absolute top-0 left-0 w-full h-2 bg-white/5 z-30">
            <div 
              className="h-full bg-gradient-to-r from-cyan-400 to-blue-500 shadow-[0_0_20px_#22d3ee] transition-all duration-100" 
              style={{ width: `${Math.min(100, (gameTime / GAME_DURATION_MS) * 100)}%` }}
            />
         </div>

         <canvas ref={gameCanvasRef} width={1000} height={2000} className="w-full h-full block" />
      </div>

      {isReadyToStart && (
        <div className="absolute inset-0 flex items-center justify-center bg-slate-950/90 z-[60]">
          <div className="text-center p-12 bg-slate-900/90 border border-white/10 rounded-[3rem] backdrop-blur-3xl shadow-2xl max-w-sm mx-4">
            <div className="w-20 h-20 bg-cyan-500/10 rounded-full flex items-center justify-center mb-8 mx-auto border border-cyan-500/20">
              <svg className="w-10 h-10 text-cyan-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
            <h3 className="text-white font-black tracking-[0.2em] uppercase mb-4 text-base italic">Calibration Complete</h3>
            <p className="text-slate-400 text-xs mb-10 uppercase tracking-[0.2em] leading-loose">Precision mode active.<br/>Magnetic pinch sensing initialized.</p>
            <button 
              onClick={handleUserClickToStart}
              className="w-full py-6 bg-white text-slate-950 font-black rounded-full hover:scale-105 active:scale-95 transition-all shadow-2xl uppercase tracking-[0.4em] text-xs shadow-white/20"
            >
              Start Training
            </button>
          </div>
        </div>
      )}

      {isLoaded && !isReadyToStart && countdown === null && (
        <button 
          onClick={onRestart}
          className="absolute top-8 right-8 z-[70] px-8 py-3 bg-slate-800/60 backdrop-blur-lg border border-white/10 text-white font-black text-[10px] rounded-full hover:bg-white hover:text-slate-950 transition-all uppercase tracking-[0.2em] shadow-xl"
        >
          Reset Session
        </button>
      )}

      {!isLoaded && (
        <div className="absolute inset-0 flex items-center justify-center bg-slate-950/98 z-50">
          <div className="text-center">
            <div className="w-20 h-20 border-t-2 border-b-2 border-cyan-500 rounded-full animate-spin mb-10 mx-auto shadow-[0_0_25px_rgba(6,182,212,0.6)]" />
            <p className="text-cyan-400 font-black tracking-[0.8em] uppercase text-2xl italic">Syncing...</p>
            <p className="text-slate-600 text-[10px] mt-8 uppercase tracking-[0.4em]">Optimizing Hand HUD</p>
          </div>
        </div>
      )}

      {countdown !== null && (
        <div className="absolute inset-0 flex items-center justify-center z-[100] pointer-events-none">
          <p className="text-[20rem] font-black text-white italic drop-shadow-[0_0_150px_rgba(34,211,238,0.6)] animate-pulse">
            {countdown}
          </p>
        </div>
      )}
    </div>
  );
};

export default GameView;
