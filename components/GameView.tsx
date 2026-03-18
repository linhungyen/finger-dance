
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
  handPreference: 'right' | 'left';
  onUpdateScore: (score: number, combo: number) => void;
  onGameOver: (finalScore: number, finalMaxCombo: number) => void;
  onRestart: () => void;
  onReturnMenu: () => void;
}

const GameView: React.FC<GameViewProps> = ({ selectedSong, handPreference, onUpdateScore, onGameOver, onRestart, onReturnMenu }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const gameCanvasRef = useRef<HTMLCanvasElement>(null);
  const audioRef = useRef<HTMLAudioElement>(null);
  
  const [isLoaded, setIsLoaded] = useState(false);
  const [isReadyToStart, setIsReadyToStart] = useState(false); 
  const [countdown, setCountdown] = useState<number | string | null>(null);
  const [gameTime, setGameTime] = useState(0);
  const [isMuted, setIsMuted] = useState(false);
  
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

  useEffect(() => {
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
      }
    };
  }, []);

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

            // 動態獨立閾值設定
            let pinchThreshold = PINCH_THRESHOLD_3D;
            const isMobile = window.innerWidth < 768;
            
            if (isMobile) {
              // 手機版畫面受解析度與站位影響，整體距離感應必須大幅拉緊
              pinchThreshold *= 0.65; 
              // 食指最靠近手掌內側，極易連續誤判
              if (index === 0) pinchThreshold *= 0.6;
              // 中指同樣容易受廣角鏡頭扭曲干擾
              else if (index === 1) pinchThreshold *= 0.75;
            } else {
              // 電腦板針對食指稍微調緊即可
              if (index === 0) pinchThreshold *= 0.8;
            }

            // 遲滯機制 (Hysteresis)：如果上一幀已經是捏合狀態，放寬鬆開的標準，防止邊界反覆抖動連發
            const isCurrentlyPinched = wasPinchingRef.current[index];
            const effectiveThreshold = isCurrentlyPinched ? pinchThreshold * 1.5 : pinchThreshold;

            // 視覺回饋：當手指接近時，顯示連線（磁吸感）
            if (dist < PRE_PINCH_THRESHOLD) {
              const alpha = 1 - (dist / PRE_PINCH_THRESHOLD);
              ctx.beginPath();
              ctx.moveTo(thx, thy);
              ctx.lineTo(tx, ty);
              ctx.strokeStyle = dist < effectiveThreshold ? TRACK_COLORS[index] : `rgba(255,255,255,${alpha * 0.5})`;
              ctx.lineWidth = dist < effectiveThreshold ? 6 : 2;
              ctx.stroke();

              // 在指尖繪製偵測環
              ctx.beginPath();
              ctx.arc(tx, ty, 8 + (alpha * 10), 0, Math.PI * 2);
              ctx.strokeStyle = TRACK_COLORS[index];
              ctx.lineWidth = 2;
              ctx.stroke();
            }

            // 判定觸發 (使用 effectiveThreshold 防止連發抖動)
            if (dist < effectiveThreshold) {
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
        if (audioRef.current) {
          audioRef.current.currentTime = 0;
          audioRef.current.play().catch(e => console.error("Audio playback error:", e));
        }
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
    ctx.globalAlpha = gameActiveRef.current ? 1 : 0.0;
    ctx.fillRect(0, 0, 500, 1000);
    ctx.globalAlpha = 1;

    const trackWidth = 500 / TRACK_COUNT;

    for (let col = 0; col < TRACK_COUNT; col++) {
      const fingerIndex = handPreference === 'left' ? 3 - col : col;

      if (!gameActiveRef.current && isPinchingRef.current[fingerIndex] && !wasPinchingRef.current[fingerIndex]) {
        hitFlashRef.current[fingerIndex] = 0.5;
      }

      ctx.fillStyle = 'rgba(255,255,255,0.015)';
      ctx.fillRect(col * trackWidth, 0, trackWidth, 1000);
      
      if (isPinchingRef.current[fingerIndex]) {
        ctx.fillStyle = `${TRACK_COLORS[fingerIndex]}33`;
        ctx.fillRect(col * trackWidth, 0, trackWidth, 1000);
      }

      if (hitFlashRef.current[fingerIndex] > 0) {
        ctx.fillStyle = `${TRACK_COLORS[fingerIndex]}${Math.floor(hitFlashRef.current[fingerIndex] * 60).toString(16).padStart(2, '0')}`;
        ctx.fillRect(col * trackWidth, 0, trackWidth, 1000);
        hitFlashRef.current[fingerIndex] -= 0.05;
      }

      ctx.strokeStyle = isPinchingRef.current[fingerIndex] ? TRACK_COLORS[fingerIndex] : 'rgba(255,255,255,0.1)';
      ctx.lineWidth = isPinchingRef.current[fingerIndex] ? 12 : 2;
      ctx.strokeRect(col * trackWidth + 15, JUDGMENT_LINE_Y - 45, trackWidth - 30, 90);
      
      ctx.fillStyle = isPinchingRef.current[fingerIndex] ? TRACK_COLORS[fingerIndex] : 'rgba(255,255,255,0.4)';
      ctx.font = '900 16px Inter, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(TRACK_LABELS[fingerIndex], col * trackWidth + trackWidth/2, JUDGMENT_LINE_Y + 85);
    }

    if (!gameActiveRef.current || gameStartTimeRef.current === null) {
      for (let i = 0; i < TRACK_COUNT; i++) wasPinchingRef.current[i] = isPinchingRef.current[i];
      ctx.restore();
      animationFrameRef.current = requestAnimationFrame(update);
      return;
    }

    const currentTime = performance.now() - gameStartTimeRef.current;
    setGameTime(currentTime);
    
    // Check if we are in the last 15 seconds
    const currentTimeLeft = Math.max(0, Math.ceil((GAME_DURATION_MS - currentTime) / 1000));
    const isDoubleScore = currentTimeLeft <= 15 && currentTimeLeft > 0;

    const trackHitThisFrame = [false, false, false, false];
    
    // 以 120 BPM 當作基準掉落速度，BPM 越高掉落越快
    const dynamicScrollSpeed = SCROLL_SPEED * (selectedSong.bpm / 120);

    notesRef.current.forEach(note => {
      if (note.hit || note.missed) return;
      
      const timeDiff = note.targetTime - currentTime;
      const y = JUDGMENT_LINE_Y - (timeDiff * dynamicScrollSpeed);

      const col = handPreference === 'left' ? 3 - note.track : note.track;

      if (y > -200 && y < 1200) {
        ctx.save();
        ctx.fillStyle = TRACK_COLORS[note.track];
        ctx.shadowBlur = 25;
        ctx.shadowColor = TRACK_COLORS[note.track];
        
        ctx.beginPath();
        ctx.roundRect(col * trackWidth + 12, y - 25, trackWidth - 24, 50, 15);
        ctx.fill();
        
        ctx.fillStyle = 'rgba(255,255,255,0.6)';
        ctx.fillRect(col * trackWidth + 20, y - 12, trackWidth - 40, 6);
        ctx.restore();
      }

      const isPinching = isPinchingRef.current[note.track];
      const wasPinching = wasPinchingRef.current[note.track];

      if (isPinching && !wasPinching) {
        const absDiff = Math.abs(timeDiff);
        if (absDiff <= JUDGMENT_WINDOWS.PERFECT) {
          note.hit = true; 
          scoreRef.current += isDoubleScore ? 2000 : 1000; 
          comboRef.current += 1;
          maxComboRef.current = Math.max(maxComboRef.current, comboRef.current);
          addFeedback(isDoubleScore ? "PERFECT x2" : "PERFECT", isDoubleScore ? "#facc15" : "#22d3ee");
          hitFlashRef.current[note.track] = 1;
          trackHitThisFrame[note.track] = true;
          onUpdateScore(scoreRef.current, comboRef.current);
        } else if (absDiff <= JUDGMENT_WINDOWS.GOOD) {
          note.hit = true; 
          scoreRef.current += isDoubleScore ? 1000 : 500; 
          comboRef.current += 1;
          maxComboRef.current = Math.max(maxComboRef.current, comboRef.current);
          addFeedback(isDoubleScore ? "GREAT x2" : "GREAT", isDoubleScore ? "#fde047" : "#4ade80");
          hitFlashRef.current[note.track] = 0.8;
          trackHitThisFrame[note.track] = true;
          onUpdateScore(scoreRef.current, comboRef.current);
        }
      }

      if (timeDiff < -JUDGMENT_WINDOWS.GOOD) {
        note.missed = true; 
        comboRef.current = 0;
        scoreRef.current = Math.max(0, scoreRef.current - 300);
        addFeedback("MISS", "#f43f5e");
        onUpdateScore(scoreRef.current, comboRef.current);
      }
    });

    for (let i = 0; i < TRACK_COUNT; i++) {
      if (isPinchingRef.current[i] && !wasPinchingRef.current[i] && !trackHitThisFrame[i]) {
        comboRef.current = 0;
        scoreRef.current = Math.max(0, scoreRef.current - 500);
        addFeedback("BAD", "#ef4444");
        onUpdateScore(scoreRef.current, comboRef.current);
      }
      wasPinchingRef.current[i] = isPinchingRef.current[i];
    }

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
      if (audioRef.current) audioRef.current.pause();
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

  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.muted = isMuted;
    }
  }, [isMuted]);

  const timeLeft = Math.max(0, Math.ceil((GAME_DURATION_MS - gameTime) / 1000));
  const isDoubleScorePhase = timeLeft <= 15 && gameActiveRef.current;
  const isGamePlaying = isLoaded && !isReadyToStart && countdown === null;

  return (
    <div className="relative w-full h-full flex items-center justify-center">
      <audio ref={audioRef} src={selectedSong.url} preload="auto" />
      <video ref={videoRef} className="hidden" playsInline />
      
      <canvas 
        ref={canvasRef} 
        width={1280} 
        height={720} 
        className={`absolute inset-0 w-full h-full object-cover z-10 pointer-events-none transition-all duration-1000 ${isGamePlaying ? 'opacity-40' : 'opacity-100'}`}
      />
      
      {isDoubleScorePhase && (
        <div className="absolute inset-0 z-10 pointer-events-none bg-[radial-gradient(ellipse_at_center,transparent_0%,rgba(234,179,8,0.2)_100%)] animate-pulse mix-blend-screen" />
      )}
      
      <div className={`relative w-full max-w-lg aspect-[9/16] border-x ${isDoubleScorePhase ? 'border-yellow-500/50 shadow-[0_0_150px_rgba(234,179,8,0.5)]' : 'border-white/10 shadow-[0_0_100px_rgba(0,0,0,1)]'} ${isGamePlaying ? 'bg-slate-900' : 'bg-slate-900/10'} z-20 overflow-hidden transition-all duration-1000`}>
         <div className="absolute top-0 left-0 w-full p-8 flex justify-center items-center z-30">
            <div className={`backdrop-blur-xl px-8 py-3 rounded-2xl border flex items-center gap-4 transition-all ${isDoubleScorePhase ? 'bg-yellow-950/80 border-yellow-500/50 shadow-[0_0_30px_rgba(234,179,8,0.3)]' : 'bg-slate-950/80 border-white/10'}`}>
                {isDoubleScorePhase && (
                  <span className="text-[12px] font-black tracking-widest text-yellow-400 animate-pulse">
                    🔥 2X SCORE DOUBLE 🔥
                  </span>
                )}
                <span className={`text-4xl font-black tabular-nums ${isDoubleScorePhase ? 'text-yellow-400 animate-pulse scale-125 drop-shadow-[0_0_15px_rgba(234,179,8,1)]' : 'text-white'}`}>
                  {timeLeft}s
                </span>
            </div>
         </div>

         <div className="absolute top-0 left-0 w-full h-2 bg-white/5 z-30">
            <div 
              className={`h-full shadow-[0_0_20px_#22d3ee] transition-all duration-100 ${isDoubleScorePhase ? 'bg-gradient-to-r from-yellow-400 to-amber-600 shadow-[0_0_20px_#facc15]' : 'bg-gradient-to-r from-cyan-400 to-blue-500'}`}
              style={{ width: `${Math.min(100, (gameTime / GAME_DURATION_MS) * 100)}%` }}
            />
         </div>

         <canvas ref={gameCanvasRef} width={1000} height={2000} className="w-full h-full block" />
      </div>

      {isReadyToStart && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-950/20 backdrop-blur-sm z-[60]">
          <div className="text-center p-8 bg-slate-900/60 border border-cyan-500/30 rounded-[2rem] shadow-[0_0_50px_rgba(6,182,212,0.2)] max-w-md mx-4 mt-20 backdrop-blur-xl">
            <h3 className="text-cyan-400 font-black tracking-[0.2em] uppercase mb-4 text-xl italic">Calibration Complete</h3>
            <p className="text-white text-sm mb-8 leading-loose tracking-widest">
              Please try pinching your <span className="text-pink-400 font-bold">Thumb</span> with the <span className="text-cyan-400 font-bold">Other Fingers</span> in front of the camera.<br/>
              The corresponding track will light up dynamically!<br/>
              <span className="text-slate-400 text-xs">Test your gesture now. Click below when you are ready.</span>
            </p>
            <button 
              onClick={handleUserClickToStart}
              className="w-full py-5 bg-white text-slate-950 font-black rounded-full hover:scale-105 active:scale-95 transition-all shadow-[0_0_30px_rgba(255,255,255,0.3)] uppercase tracking-[0.4em] text-sm"
            >
              Start Training
            </button>
          </div>
        </div>
      )}

      {isLoaded && !isReadyToStart && countdown === null && (
        <div className="absolute bottom-10 right-10 z-[70] flex flex-col gap-3 items-end">
          <button 
            onClick={() => setIsMuted(prev => !prev)}
            className={`px-8 py-3 backdrop-blur-lg border text-[10px] font-black rounded-full transition-all uppercase tracking-[0.2em] shadow-xl ${
              isMuted 
              ? 'bg-rose-500/20 border-rose-500/50 text-rose-400 hover:bg-rose-500 hover:text-white' 
              : 'bg-slate-800/60 border-white/10 text-white hover:bg-white hover:text-slate-950'
            }`}
          >
            {isMuted ? 'Muted' : 'Sound On'}
          </button>
          <button 
            onClick={onRestart}
            className="px-8 py-3 bg-slate-800/60 backdrop-blur-lg border border-white/10 text-white font-black text-[10px] rounded-full hover:bg-white hover:text-slate-950 transition-all uppercase tracking-[0.2em] shadow-xl"
          >
            Restart
          </button>
          <button 
            onClick={onReturnMenu}
            className="px-8 py-3 bg-slate-800/60 backdrop-blur-lg border border-white/10 text-white font-black text-[10px] rounded-full hover:bg-white hover:text-slate-950 transition-all uppercase tracking-[0.2em] shadow-xl"
          >
            Main Menu
          </button>
        </div>
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
