
import React, { useState, useCallback } from 'react';
import GameView from './components/GameView';
import { SONG_LIST, Song } from './constants';

const App: React.FC = () => {
  const [gameState, setGameState] = useState<'idle' | 'selecting' | 'playing' | 'gameOver'>('idle');
  const [selectedSong, setSelectedSong] = useState<Song>(SONG_LIST[0]);
  const [sessionKey, setSessionKey] = useState(0);
  const [score, setScore] = useState(0);
  const [combo, setCombo] = useState(0);
  const [maxCombo, setMaxCombo] = useState(0);

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
    setGameState('gameOver');
  }, []);

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
          <h2 className="text-2xl font-black mb-8 tracking-[0.2em] uppercase text-cyan-400">Select Difficulty</h2>
          <div className="grid grid-cols-1 gap-4 w-full mb-8">
            {SONG_LIST.map((song) => (
              <button 
                key={song.id}
                onClick={() => startGame(song)}
                className="flex items-center justify-between p-6 bg-white/5 hover:bg-white/10 border border-white/5 rounded-2xl transition-all group"
              >
                <div className="text-left">
                  <p className="font-black text-xl group-hover:text-cyan-400 transition-colors">{song.title}</p>
                  <p className="text-xs text-slate-500 font-bold uppercase tracking-widest">{song.artist}</p>
                </div>
                <div className="flex flex-col items-end">
                  <span className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest ${
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
        <div className="z-30 flex flex-col items-center text-center p-12 bg-slate-900/60 backdrop-blur-xl rounded-[2rem] border border-white/10 shadow-2xl">
          <h2 className="text-3xl font-black text-white mb-2 uppercase italic tracking-tighter">Session Complete</h2>
          <div className="flex gap-12 my-8">
            <div className="text-center">
              <p className="text-slate-500 text-[10px] font-bold uppercase tracking-[0.2em]">Final Score</p>
              <p className="text-5xl font-black text-cyan-400 tabular-nums">{score.toLocaleString()}</p>
            </div>
            <div className="text-center">
              <p className="text-slate-500 text-[10px] font-bold uppercase tracking-[0.2em]">Max Combo</p>
              <p className="text-5xl font-black text-pink-400 tabular-nums">{maxCombo}</p>
            </div>
          </div>
          <div className="flex gap-4">
            <button onClick={startSelecting} className="px-12 py-4 bg-white text-slate-950 font-black rounded-full tracking-widest uppercase hover:scale-105 transition-all">
              Try Again
            </button>
            <button onClick={() => setGameState('idle')} className="px-8 py-4 bg-slate-800 text-white font-black rounded-full tracking-widest uppercase hover:bg-slate-700 transition-all">
              Exit
            </button>
          </div>
        </div>
      )}

      {gameState === 'playing' && (
        <GameView 
          key={sessionKey}
          selectedSong={selectedSong}
          onUpdateScore={onUpdateScore}
          onGameOver={onGameOver}
          onRestart={restartGame}
        />
      )}
    </div>
  );
};

export default App;
