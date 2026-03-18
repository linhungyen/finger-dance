
import React, { useState, useCallback, useEffect } from 'react';
import GameView from './components/GameView';
import { SONG_LIST, Song } from './constants';

interface LeaderboardEntry {
  name: string;
  score: number;
  maxCombo: number;
  songId: string;
  date: number;
}

const App: React.FC = () => {
  const [gameState, setGameState] = useState<'idle' | 'selecting' | 'playing' | 'gameOver'>('idle');
  const [selectedSong, setSelectedSong] = useState<Song>(SONG_LIST[0]);
  const [handPreference, setHandPreference] = useState<'right' | 'left'>('right');
  const [sessionKey, setSessionKey] = useState(0);
  const [score, setScore] = useState(0);
  const [combo, setCombo] = useState(0);
  const [maxCombo, setMaxCombo] = useState(0);
  
  const [playerName, setPlayerName] = useState("");
  const [hasSaved, setHasSaved] = useState(false);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>(() => {
    const saved = localStorage.getItem('fingerDanceLeaderboard');
    return saved ? JSON.parse(saved) : [];
  });

  useEffect(() => {
    localStorage.setItem('fingerDanceLeaderboard', JSON.stringify(leaderboard));
  }, [leaderboard]);

  const startSelecting = () => setGameState('selecting');
  
  const startGame = (song: Song) => {
    setSelectedSong(song);
    setScore(0);
    setCombo(0);
    setSessionKey(prev => prev + 1);
    setGameState('playing');
  };

  const restartGame = useCallback(() => {
    setScore(0);
    setCombo(0);
    setSessionKey(prev => prev + 1);
  }, []);

  const onUpdateScore = useCallback((s: number, c: number) => {
    setScore(s);
    setCombo(c);
  }, []);

  const onGameOver = useCallback((finalScore: number, finalMaxCombo: number) => {
    setScore(finalScore);
    setMaxCombo(finalMaxCombo);
    setHasSaved(false);
    setPlayerName("");
    setGameState('gameOver');
  }, []);

  const saveScore = () => {
    const newEntry: LeaderboardEntry = {
      name: playerName.trim() || 'Anonymous',
      score,
      maxCombo,
      songId: selectedSong.id,
      date: Date.now()
    };
    setLeaderboard(prev => [...prev, newEntry].sort((a, b) => b.score - a.score));
    setHasSaved(true);
  };

  const topScores = leaderboard
    .filter(entry => entry.songId === selectedSong.id)
    .slice(0, 5);

  return (
    <div className="relative w-full h-screen bg-slate-950 flex flex-col items-center justify-center overflow-hidden font-sans text-slate-50">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(17,24,39,1)_0%,rgba(2,6,23,1)_100%)]" />
      
      {gameState === 'playing' && (
        <div className="absolute top-8 left-0 right-0 px-8 flex justify-between z-20 pointer-events-none">
          <div className="bg-slate-950/40 backdrop-blur-md p-4 rounded-2xl border border-white/5">
            <div className="text-cyan-400 text-[10px] font-black tracking-[0.3em] uppercase opacity-60">Accuracy Score</div>
            <div className="text-4xl font-black tabular-nums">{score.toLocaleString()}</div>
          </div>
          <div className="bg-slate-950/40 backdrop-blur-md p-4 rounded-2xl border border-white/5 text-right">
            <div className="text-pink-400 text-[10px] font-black tracking-[0.3em] uppercase opacity-60">Combo Streak</div>
            <div className="text-4xl font-black tabular-nums">{combo}</div>
          </div>
        </div>
      )}

      {gameState === 'idle' && (
        <div className="z-30 flex flex-col items-center text-center p-12 bg-slate-900/40 backdrop-blur-xl rounded-[2rem] border border-white/5 shadow-2xl max-w-xl">
          <div className="w-24 h-24 bg-cyan-500/20 rounded-full flex items-center justify-center mb-8 border border-cyan-500/30">
            <div className="w-12 h-12 bg-cyan-500 rounded-full animate-pulse shadow-[0_0_30px_#06b6d4]" />
          </div>
          <h1 className="text-6xl font-black mb-4 tracking-tighter italic">
            FINGER <span className="text-cyan-400">DANCE</span> HERO
          </h1>
          <p className="text-slate-400 mb-10 text-sm tracking-wide leading-relaxed">
            Enhance your dexterity with high-precision gesture tracking.<br/>
            Requires a camera and a quiet focus.
          </p>
          <button 
            onClick={startSelecting}
            className="px-16 py-5 bg-white text-slate-950 font-black rounded-full hover:scale-105 transition-all shadow-xl uppercase tracking-widest"
          >
            Enter Training
          </button>
        </div>
      )}

      {gameState === 'selecting' && (
        <div className="z-30 flex flex-col items-center text-center p-10 bg-slate-900/60 backdrop-blur-2xl rounded-[2rem] border border-white/10 shadow-2xl w-full max-w-2xl">
          <h2 className="text-2xl font-black mb-8 tracking-[0.2em] uppercase text-cyan-400">Calibration Profile</h2>
          
          <div className="flex gap-4 mb-8 w-full">
            <button 
              onClick={() => setHandPreference('left')}
              className={`flex-1 py-4 rounded-2xl font-black uppercase tracking-widest transition-all border ${
                handPreference === 'left' 
                ? 'bg-cyan-500/20 text-cyan-400 border-cyan-500/50 shadow-[0_0_20px_rgba(6,182,212,0.3)]' 
                : 'bg-white/5 text-slate-400 border-white/5 hover:bg-white/10'
              }`}
            >
              Left Hand
            </button>
            <button 
              onClick={() => setHandPreference('right')}
              className={`flex-1 py-4 rounded-2xl font-black uppercase tracking-widest transition-all border ${
                handPreference === 'right' 
                ? 'bg-cyan-500/20 text-cyan-400 border-cyan-500/50 shadow-[0_0_20px_rgba(6,182,212,0.3)]' 
                : 'bg-white/5 text-slate-400 border-white/5 hover:bg-white/10'
              }`}
            >
              Right Hand
            </button>
          </div>

          <div className="w-full h-px bg-white/10 mb-8" />
          <h2 className="text-2xl font-black mb-8 tracking-[0.2em] uppercase text-cyan-400">Select Track</h2>
          <div className="grid grid-cols-1 gap-4 w-full mb-8">
            {SONG_LIST.map((song) => (
              <button 
                key={song.id}
                onClick={() => startGame(song)}
                className="flex items-center justify-between p-6 bg-white/5 hover:bg-white/10 border border-white/5 rounded-2xl transition-all group"
              >
                <div className="text-left">
                  <p className="font-black text-xl group-hover:text-cyan-400 transition-colors">{song.title}</p>
                </div>
                <div className="flex flex-col items-end">
                  <span className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest ${
                    song.difficulty === 'Beginner' ? 'bg-blue-500/20 text-blue-400' :
                    song.difficulty === 'Easy' ? 'bg-green-500/20 text-green-400' :
                    song.difficulty === 'Medium' ? 'bg-yellow-500/20 text-yellow-400' : 'bg-red-500/20 text-red-400'
                  }`}>
                    {song.difficulty}
                  </span>
                  <p className="text-xs mt-2 text-slate-400 font-mono">{song.bpm} BPM</p>
                </div>
              </button>
            ))}
          </div>
          <button onClick={() => setGameState('idle')} className="text-slate-500 text-xs font-bold uppercase tracking-widest hover:text-white transition-colors">
            Return to Menu
          </button>
        </div>
      )}

      {gameState === 'gameOver' && (
        <div className="z-30 flex flex-col items-center text-center p-10 bg-slate-900/60 backdrop-blur-3xl rounded-[2rem] border border-white/10 shadow-2xl w-full max-w-xl">
          <h2 className="text-3xl font-black text-white mb-2 uppercase italic tracking-tighter">Session Complete</h2>
          
          <div className="flex gap-12 my-6">
            <div className="text-center">
              <p className="text-slate-500 text-[10px] font-bold uppercase tracking-[0.2em]">Final Score</p>
              <p className="text-5xl font-black text-cyan-400 tabular-nums">{score.toLocaleString()}</p>
            </div>
            <div className="text-center">
              <p className="text-slate-500 text-[10px] font-bold uppercase tracking-[0.2em]">Max Combo</p>
              <p className="text-5xl font-black text-pink-400 tabular-nums">{maxCombo}</p>
            </div>
          </div>

          {!hasSaved ? (
            <div className="w-full bg-black/20 p-6 rounded-2xl border border-white/5 mb-6">
              <p className="text-slate-400 text-xs font-bold uppercase tracking-widest mb-4">Save Your Score</p>
              <input 
                type="text" 
                maxLength={12}
                placeholder="Enter Name (Optional)" 
                value={playerName}
                onChange={e => setPlayerName(e.target.value)}
                className="w-full bg-white/5 border border-white/10 text-center text-white p-4 rounded-xl mb-4 focus:outline-none focus:border-cyan-500/50 font-black tracking-widest placeholder:text-white/20 transition-all"
              />
              <div className="flex gap-4">
                <button onClick={saveScore} className="flex-1 py-4 bg-cyan-500/20 text-cyan-400 border border-cyan-500/50 font-black rounded-xl hover:bg-cyan-500 hover:text-white transition-all uppercase tracking-widest text-xs">
                  Save Score
                </button>
                <button onClick={() => setHasSaved(true)} className="flex-1 py-4 bg-white/5 text-slate-400 border border-white/10 font-black rounded-xl hover:bg-white/10 transition-all uppercase tracking-widest text-xs">
                  Skip
                </button>
              </div>
            </div>
          ) : (
            <div className="w-full bg-black/20 p-6 rounded-2xl border border-white/5 mb-8">
              <p className="text-cyan-400 text-sm font-black uppercase tracking-[0.2em] mb-4 flex items-center justify-center gap-2">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
                </svg>
                Top 5 Leaderboard
              </p>
              {topScores.length === 0 ? (
                <p className="text-slate-500 text-xs py-4">No records yet.</p>
              ) : (
                <div className="flex flex-col gap-2">
                  {topScores.map((entry, idx) => (
                    <div key={idx} className="flex justify-between items-center bg-white/5 px-4 py-3 rounded-lg border border-white/5">
                      <div className="flex items-center gap-4">
                        <span className={`font-black text-sm ${idx === 0 ? 'text-yellow-400' : idx === 1 ? 'text-slate-300' : idx === 2 ? 'text-amber-600' : 'text-slate-500'}`}>#{idx + 1}</span>
                        <span className="text-white font-bold tracking-widest truncate max-w-[120px]">{entry.name}</span>
                      </div>
                      <div className="text-right">
                        <div className="text-cyan-400 font-black tabular-nums">{entry.score.toLocaleString()}</div>
                        <div className="text-[10px] text-slate-500 uppercase tracking-widest">{entry.maxCombo} Combo</div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {hasSaved && (
            <div className="flex gap-4 w-full">
              <button onClick={startSelecting} className="flex-1 py-5 bg-white text-slate-950 font-black rounded-xl tracking-[0.2em] uppercase hover:scale-105 transition-all shadow-xl">
                Play Again
              </button>
              <button onClick={() => setGameState('idle')} className="flex-1 py-5 bg-slate-800 text-white font-black rounded-xl tracking-[0.2em] uppercase hover:bg-slate-700 transition-all border border-white/10">
                Menu
              </button>
            </div>
          )}
        </div>
      )}

      {gameState === 'playing' && (
        <GameView 
          key={sessionKey}
          selectedSong={selectedSong}
          handPreference={handPreference}
          onUpdateScore={onUpdateScore}
          onGameOver={onGameOver}
          onRestart={restartGame}
          onReturnMenu={() => setGameState('idle')}
        />
      )}
    </div>
  );
};

export default App;
