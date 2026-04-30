import { useState, useEffect } from 'react';
import { 
  Gamepad2, 
  Trophy, 
  User as UserIcon, 
  Search, 
  Gamepad,
  TrendingUp,
  LayoutGrid,
  LogOut,
  LogIn,
  Send,
  Loader2
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  onAuthStateChanged, 
  signInWithPopup, 
  GoogleAuthProvider, 
  signOut,
  User
} from 'firebase/auth';
import { 
  collection, 
  query, 
  orderBy, 
  limit, 
  getDocs, 
  addDoc, 
  serverTimestamp,
  where,
  getDoc,
  doc,
  setDoc
} from 'firebase/firestore';
import { auth, db } from './firebase';
import gamesData from './data/games.json';
import { cn } from './lib/utils';

interface Game {
  id: string;
  name: string;
  description: string;
  iframeUrl: string;
  thumbnail: string;
  category: string;
}

interface LeaderboardEntry {
  userId: string;
  username: string;
  score: number;
  timestamp: any;
}

export default function App() {
  const [activeTab, setActiveTab] = useState<'games' | 'leaderboard' | 'profile'>('games');
  const [selectedGame, setSelectedGame] = useState<Game | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [user, setUser] = useState<User | null>(null);
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [leaderboardData, setLeaderboardData] = useState<LeaderboardEntry[]>([]);
  const [isLoadingLeaderboard, setIsLoadingLeaderboard] = useState(false);
  const [scoreToSubmit, setScoreToSubmit] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (u) => {
      setUser(u);
      if (u) {
        syncUserProfile(u);
      }
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (activeTab === 'leaderboard') {
      fetchLeaderboard();
    }
  }, [activeTab]);

  const syncUserProfile = async (u: User) => {
    try {
      const userRef = doc(db, 'users', u.uid);
      const userSnap = await getDoc(userRef);
      if (!userSnap.exists()) {
        await setDoc(userRef, {
          uid: u.uid,
          username: u.displayName || 'Anon Player',
          avatarUrl: u.photoURL,
          createdAt: new Date().toISOString(),
          totalScore: 0
        });
      }
    } catch (e) {
      console.error("Error syncing profile:", e);
    }
  };

  const handleLogin = async () => {
    setIsLoggingIn(true);
    try {
      await signInWithPopup(auth, new GoogleAuthProvider());
    } catch (error) {
      console.error("Login failed:", error);
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handleLogout = async () => {
    await signOut(auth);
  };

  const fetchLeaderboard = async (gameId?: string) => {
    setIsLoadingLeaderboard(true);
    try {
      // If we don't have a specific game, we just show a general high score or a default game
      // Since our schema is /leaderboards/{gameId}/scores, we need a gameId
      const targetGameId = gameId || '2048'; 
      const scoresRef = collection(db, 'leaderboards', targetGameId, 'scores');
      const q = query(scoresRef, orderBy('score', 'desc'), limit(10));
      const querySnapshot = await getDocs(q);
      const scores = querySnapshot.docs.map(doc => doc.data() as LeaderboardEntry);
      setLeaderboardData(scores);
    } catch (e) {
      console.error("Error fetching leaderboard:", e);
    } finally {
      setIsLoadingLeaderboard(false);
    }
  };

  const submitScore = async () => {
    if (!user || !selectedGame || !scoreToSubmit) return;
    setIsSubmitting(true);
    try {
      const scoresRef = collection(db, 'leaderboards', selectedGame.id, 'scores');
      await addDoc(scoresRef, {
        userId: user.uid,
        username: user.displayName || 'Anonymous',
        gameId: selectedGame.id,
        score: parseInt(scoreToSubmit),
        timestamp: serverTimestamp()
      });
      setScoreToSubmit('');
      alert("Score submitted!");
    } catch (e) {
      console.error("Submission failed:", e);
      alert("Failed to submit score. Make sure you are logged in.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const filteredGames = gamesData.filter(game => 
    game.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    game.category.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-slate-900 text-slate-200 font-sans selection:bg-indigo-500 selection:text-white flex flex-col geometric-grid">
      {/* Navigation */}
      <nav id="main-navigation" className="h-16 border-b border-slate-700 bg-slate-900/80 backdrop-blur-md flex items-center justify-between px-8 z-50 fixed top-0 w-full">
        <div className="max-w-7xl mx-auto w-full flex items-center justify-between">
          <div 
            id="nav-logo"
            className="flex items-center gap-3 cursor-pointer group"
            onClick={() => { setSelectedGame(null); setActiveTab('games'); }}
          >
            <div className="w-8 h-8 bg-indigo-500 rounded-sm rotate-45 flex items-center justify-center group-hover:scale-110 transition-transform">
              <span className="-rotate-45 font-black text-white">N</span>
            </div>
            <h1 className="text-xl font-bold tracking-tighter uppercase italic">Nova<span className="text-indigo-400 font-normal">Games</span></h1>
          </div>

          <div className="hidden md:flex items-center gap-8">
            <button 
              onClick={() => { setActiveTab('games'); setSelectedGame(null); }}
              className={cn(
                "px-3 py-1 text-xs font-bold uppercase tracking-widest transition-all border-b-2",
                activeTab === 'games' ? "border-indigo-500 text-indigo-400" : "border-transparent text-slate-400 hover:text-slate-200"
              )}
            >
              Games
            </button>
            <button 
              onClick={() => setActiveTab('leaderboard')}
              className={cn(
                "px-3 py-1 text-xs font-bold uppercase tracking-widest transition-all border-b-2",
                activeTab === 'leaderboard' ? "border-indigo-500 text-indigo-400" : "border-transparent text-slate-400 hover:text-slate-200"
              )}
            >
              Leaderboards
            </button>
            <button 
              onClick={() => setActiveTab('profile')}
              className={cn(
                "px-3 py-1 text-xs font-bold uppercase tracking-widest transition-all border-b-2",
                activeTab === 'profile' ? "border-indigo-500 text-indigo-400" : "border-transparent text-slate-400 hover:text-slate-200"
              )}
            >
              Profile
            </button>
          </div>

          <div className="flex items-center gap-6">
             <div className="relative hidden sm:block">
               <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none text-slate-500 text-[10px] font-bold">SEARCH</div>
               <input 
                 type="text" 
                 placeholder="TITLES..." 
                 className="bg-slate-800 border border-slate-700 rounded-none py-1.5 pl-14 pr-4 text-xs focus:outline-none focus:border-indigo-500 transition-colors w-48 md:w-64"
                 value={searchQuery}
                 onChange={(e) => setSearchQuery(e.target.value)}
               />
             </div>
             
             {user ? (
               <div className="flex items-center gap-4">
                 <div className="text-right hidden sm:block">
                   <div className="text-[10px] text-slate-500 uppercase font-bold tracking-widest">Level 12</div>
                   <div className="text-sm font-medium">{user.displayName}</div>
                 </div>
                 <button 
                   onClick={handleLogout}
                   className="w-10 h-10 border border-slate-700 p-0.5 hover:border-indigo-500 transition-colors"
                 >
                    <div className="w-full h-full bg-slate-800 flex items-center justify-center overflow-hidden">
                      {user.photoURL ? <img src={user.photoURL} alt="" /> : <UserIcon className="w-5 h-5 text-slate-500" />}
                    </div>
                 </button>
               </div>
             ) : (
               <button 
                 onClick={handleLogin}
                 disabled={isLoggingIn}
                 className="bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold uppercase tracking-widest px-6 py-2 rounded-none transition-all disabled:opacity-50"
               >
                 {isLoggingIn ? "SYNCING..." : "AUTH ACCESS"}
               </button>
             )}
          </div>
        </div>
      </nav>

      <main id="app-main-content" className="flex-1 pt-24 pb-12 px-8 max-w-7xl mx-auto w-full">
        <AnimatePresence mode="wait">
          {selectedGame ? (
            <motion.div
              id="game-player-view"
              key="player"
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.98 }}
              className="space-y-6"
            >
              <div className="flex items-end justify-between border-b border-slate-700 pb-4">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-[10px] bg-indigo-500 text-white px-2 py-0.5 font-bold uppercase tracking-widest">RUNNING</span>
                    <span className="text-[10px] text-slate-500 font-mono tracking-widest uppercase">{selectedGame.category}</span>
                  </div>
                  <h2 className="text-4xl font-black italic uppercase tracking-tighter">{selectedGame.name}</h2>
                </div>
                <button 
                  onClick={() => setSelectedGame(null)}
                  className="px-4 py-2 border border-slate-700 bg-slate-800/50 hover:bg-slate-700 text-[10px] font-bold uppercase tracking-widest transition-all"
                >
                  Terminate Session
                </button>
              </div>

              <div className="relative aspect-video w-full bg-slate-800 border border-slate-700 p-1 active-glow">
                <div className="w-full h-full bg-slate-900 relative overflow-hidden">
                   <iframe 
                    src={selectedGame.iframeUrl}
                    className="w-full h-full border-none"
                    allowFullScreen
                    title={selectedGame.name}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                <div className="md:col-span-2 border border-slate-700 bg-slate-900/60 p-6">
                  <div className="flex items-center justify-between mb-8">
                    <h3 className="text-[10px] text-slate-500 uppercase font-bold tracking-widest flex items-center gap-2">
                       LOCAL NETWORK HIGHSCORES
                    </h3>
                    <button 
                      onClick={() => fetchLeaderboard(selectedGame.id)}
                      className="text-[10px] text-indigo-400 hover:text-indigo-300 font-bold uppercase tracking-widest"
                    >
                      Sync Data
                    </button>
                  </div>
                  
                  <div className="space-y-2 min-h-[150px] font-mono">
                    {isLoadingLeaderboard ? (
                      <div className="flex items-center justify-center py-10">
                        <Loader2 className="w-6 h-6 animate-spin text-indigo-500/50" />
                      </div>
                    ) : leaderboardData.length > 0 ? (
                      leaderboardData.map((entry, v) => (
                        <div key={v} className="flex items-center justify-between p-3 border border-slate-800 bg-slate-800/30 group hover:border-slate-700 transition-colors">
                          <div className="flex items-center gap-4">
                            <span className="text-slate-600 text-xs">{String(v+1).padStart(2, '0')}</span>
                            <span className="text-sm font-medium uppercase text-slate-300 group-hover:text-indigo-400 transition-colors">{entry.username}</span>
                          </div>
                          <span className="text-indigo-400 font-black tabular-nums">{entry.score.toLocaleString()}</span>
                        </div>
                      ))
                    ) : (
                      <div className="text-center py-10 text-slate-600 uppercase text-[10px] font-bold tracking-[0.2em]">
                        Waiting for transmission...
                      </div>
                    )}
                  </div>
                </div>

                <div className="space-y-6">
                  <div className="border border-slate-700 bg-slate-900/60 p-6">
                    <h3 className="text-[10px] text-slate-500 uppercase font-bold tracking-widest mb-6">DATA INJECTION</h3>
                    <div className="space-y-6">
                      {!user ? (
                        <p className="text-[10px] text-slate-500 leading-relaxed uppercase tracking-widest font-medium">
                          AUTHENTICATION REQUIRED FOR GLOBAL SYNC.
                        </p>
                      ) : (
                        <>
                          <div className="space-y-2">
                             <label className="text-[9px] uppercase font-bold text-slate-600 tracking-wider">UNITS CONSUMED</label>
                             <input 
                               type="number"
                               placeholder="ENTER VALUE..."
                               className="w-full bg-slate-800 border border-slate-700 rounded-none px-4 py-2 text-xs focus:outline-none focus:border-indigo-500 font-mono"
                               value={scoreToSubmit}
                               onChange={(e) => setScoreToSubmit(e.target.value)}
                             />
                          </div>
                          <button 
                            onClick={submitScore}
                            disabled={isSubmitting || !scoreToSubmit}
                            className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-3 text-[10px] uppercase tracking-[0.2em] transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                          >
                            {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : "BROADCAST SCORE"}
                          </button>
                        </>
                      )}
                    </div>
                  </div>

                  <div className="border border-slate-700 bg-slate-900/60 p-6 text-[10px] font-bold uppercase tracking-widest">
                    <h3 className="text-slate-500 mb-6 font-bold tracking-widest">CORE SPECS</h3>
                    <div className="space-y-4">
                      <div className="flex justify-between border-b border-slate-800 pb-2">
                        <span className="text-slate-500">TYPE</span>
                        <span className="text-indigo-400">{selectedGame.category}</span>
                      </div>
                      <div className="flex justify-between border-b border-slate-800 pb-2">
                        <span className="text-slate-500">ENGINE</span>
                        <span>WEB_ENV_V1</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          ) : (
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
            >
              {activeTab === 'games' && (
                <div className="space-y-12">
                  <div className="flex flex-col md:flex-row md:items-end justify-between gap-8 border-b border-slate-700 pb-12">
                    <div className="max-w-2xl">
                       <span className="text-xs text-indigo-500 font-mono tracking-[0.5em] font-black uppercase mb-4 block underline decoration-4 underline-offset-8">V_CORE_082</span>
                      <h1 className="text-6xl font-black italic uppercase tracking-tighter sm:text-8xl leading-none">
                        Unblocked<span className="text-indigo-500 font-normal">Hub.</span>
                      </h1>
                      <p className="text-slate-400 mt-6 text-base leading-relaxed tracking-wide uppercase font-medium">
                        HIGH PERFORMANCE WEB ARCADE. LOW LATENCY ACCESS TO PREMIUM TITLES.
                      </p>
                    </div>
                    <div className="flex flex-wrap gap-1">
                      {['All', 'Puzzle', 'Arcade', 'Racing'].map(cat => (
                         <button 
                           key={cat}
                           className={cn(
                             "px-4 py-1.5 text-[10px] font-bold uppercase tracking-[0.2em] transition-all border",
                             searchQuery === cat || (cat === 'All' && !searchQuery)
                              ? "bg-indigo-500 border-indigo-500 text-white active-glow" 
                              : "bg-slate-800 border-slate-700 text-slate-500 hover:text-slate-200"
                           )}
                           onClick={() => setSearchQuery(cat === 'All' ? '' : cat)}
                         >
                           {cat}
                         </button>
                      ))}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-3 gap-8">
                    {filteredGames.map((game) => (
                      <motion.div 
                        key={game.id}
                        whileHover={{ y: -4 }}
                        className="group relative border border-slate-700 bg-slate-900/60 p-1 flex flex-col hover:border-slate-500 transition-all cursor-pointer"
                        onClick={() => setSelectedGame(game)}
                      >
                        <div className="aspect-video overflow-hidden relative bg-slate-800">
                          <img 
                            src={game.thumbnail} 
                            alt={game.name} 
                            className="w-full h-full object-cover grayscale opacity-60 group-hover:grayscale-0 group-hover:opacity-100 transition-all duration-700"
                          />
                          <div className="absolute inset-0 bg-gradient-to-t from-slate-950 to-transparent group-hover:opacity-20 transition-opacity" />
                        </div>
                        <div className="h-14 flex items-center justify-between px-4 bg-slate-900">
                           <div className="flex flex-col">
                             <h4 className="text-[11px] font-black italic uppercase tracking-widest group-hover:text-indigo-400 transition-colors">{game.name}</h4>
                             <span className="text-[8px] font-bold text-slate-500 tracking-[0.3em]">{game.category}</span>
                           </div>
                           <button className="text-[10px] font-black uppercase text-indigo-400 tracking-[0.2em] opacity-0 group-hover:opacity-100 transform translate-x-2 group-hover:translate-x-0 transition-all">
                             INITIALIZE
                           </button>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                </div>
              )}

              {activeTab === 'leaderboard' && (
                <div className="max-w-4xl mx-auto space-y-12">
                  <div className="text-center space-y-4">
                    <h2 className="text-5xl font-black italic uppercase tracking-tighter">Global High<span className="text-indigo-400 font-normal">Scores</span></h2>
                    <p className="text-slate-500 font-mono text-xs tracking-widest uppercase underline decoration-indigo-500/50 decoration-2 underline-offset-8">VERIFIED_DATA_TRANSMISSIONS</p>
                  </div>
                  
                  <div className="border border-slate-700 bg-slate-900/60 p-8">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-12 pb-6 border-b border-slate-800 gap-6">
                      <div className="flex items-center gap-6">
                        <div className="w-12 h-12 bg-indigo-500/10 flex items-center justify-center border border-indigo-500/20 rotate-45">
                          <Trophy className="w-6 h-6 text-indigo-500 -rotate-45" />
                        </div>
                        <div>
                          <span className="font-black text-xl italic uppercase tracking-widest block leading-none">RANKINGS_V1</span>
                          <span className="text-[9px] text-slate-500 font-bold uppercase tracking-[0.3em] mt-1 block">Latency: 24ms</span>
                        </div>
                      </div>
                      <select 
                        className="bg-slate-800 border border-slate-700 rounded-none px-6 py-2 text-[10px] focus:outline-none focus:border-indigo-500 uppercase font-black tracking-widest text-slate-300"
                        onChange={(e) => fetchLeaderboard(gamesData.find(g => g.name === e.target.value)?.id)}
                      >
                        {gamesData.map(g => <option key={g.id}>{g.name}</option>)}
                      </select>
                    </div>

                    <div className="space-y-4">
                      {isLoadingLeaderboard ? (
                        <div className="flex flex-col items-center justify-center py-20 gap-4">
                           <Loader2 className="w-10 h-10 animate-spin text-indigo-500" />
                           <p className="text-[10px] font-bold uppercase tracking-[0.4em] text-slate-600">Syncing with nexus...</p>
                        </div>
                      ) : leaderboardData.length > 0 ? (
                        leaderboardData.map((entry, v) => (
                          <div 
                            key={v} 
                            className={cn(
                              "flex items-center justify-between p-5 border transition-all font-mono",
                              v === 0 ? "bg-indigo-500/10 border-indigo-500 active-glow" : "bg-slate-800/20 border-slate-700/50 hover:border-slate-600"
                            )}
                          >
                            <div className="flex items-center gap-6">
                              <span className={cn(
                                "text-2xl font-black w-8 text-center italic",
                                v === 0 ? "text-indigo-400" : "text-slate-700"
                              )}>
                                {String(v + 1).padStart(2, '0')}
                              </span>
                              <div>
                                <p className="font-black tracking-widest text-sm uppercase">{entry.username}</p>
                                <p className="text-[8px] text-slate-500 font-bold uppercase tracking-[0.3em]">Operator Identity Verified</p>
                              </div>
                            </div>
                            <div className="text-right">
                              <p className={cn(
                                "text-xl font-black tabular-nums tracking-tighter underline underline-offset-4",
                                v === 0 ? "text-indigo-400 decoration-indigo-400/50" : "text-slate-300 decoration-slate-700"
                              )}>{entry.score.toLocaleString()}</p>
                              <p className="text-[9px] text-slate-600 font-bold uppercase tracking-widest">SCORE_UNITS</p>
                            </div>
                          </div>
                        ))
                      ) : (
                        <div className="text-center py-20 border border-slate-800 bg-slate-900/50">
                           <Gamepad className="w-8 h-8 text-slate-800 mx-auto mb-4" />
                           <p className="text-slate-600 font-black uppercase text-[10px] tracking-[0.4em]">VOID DETECTED. TRANSMIT FIRST SCORE.</p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'profile' && (
                <div className="max-w-2xl mx-auto">
                   <div className="border border-slate-700 bg-slate-900/60 overflow-hidden relative p-1 active-glow">
                      <div className="h-40 bg-slate-800 relative flex items-center justify-center">
                         <div className="absolute inset-0 opacity-5 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')]" />
                         <div className="text-slate-900 font-black text-9xl italic pointer-events-none uppercase tracking-tighter opacity-10">OPERATOR</div>
                      </div>
                      <div className="p-10 -mt-20 text-center relative z-10 bg-slate-900">
                        <div className="w-32 h-32 bg-slate-950 border border-slate-700 mx-auto overflow-hidden flex items-center justify-center mb-8 relative p-1 group">
                           <div className="w-full h-full bg-slate-900 flex items-center justify-center overflow-hidden">
                              {user?.photoURL ? (
                                <img src={user.photoURL} alt="Avatar" className="w-full h-full object-cover grayscale opacity-80" />
                              ) : (
                                <UserIcon className="w-12 h-12 text-slate-700 group-hover:text-indigo-400 transition-colors" />
                              )}
                           </div>
                           <div className="absolute -top-1 -right-1 w-4 h-4 bg-emerald-500 rounded-full border-4 border-slate-900" />
                        </div>
                        <h2 className="text-4xl font-black italic uppercase tracking-tighter underline underline-offset-8 decoration-slate-800">{user ? user.displayName : 'UNKNOWN_ENTITY'}</h2>
                        <p className="text-slate-600 text-[9px] mb-12 tracking-[0.4em] uppercase font-black block mt-4">{user ? user.email : 'AWAITING_CREDENTIALS'}</p>
                        
                        <div className="grid grid-cols-2 gap-px bg-slate-700 p-px mb-12">
                           <div className="bg-slate-900 p-8">
                              <p className="text-3xl font-black tabular-nums tracking-tighter font-mono italic">014</p>
                              <p className="text-[9px] text-slate-600 uppercase tracking-widest font-black mt-2 underline decoration-indigo-500/30">Sessions</p>
                           </div>
                           <div className="bg-slate-900 p-8">
                              <p className="text-3xl font-black tabular-nums tracking-tighter font-mono italic text-indigo-400">EX+</p>
                              <p className="text-[9px] text-slate-600 uppercase tracking-widest font-black mt-2 underline decoration-indigo-500/30">Class Tier</p>
                           </div>
                        </div>

                        {!user ? (
                          <button 
                            onClick={handleLogin}
                            disabled={isLoggingIn}
                            className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-black py-5 text-[10px] uppercase tracking-[0.4em] transition-all disabled:opacity-50"
                          >
                            {isLoggingIn ? "TRANSMITTING..." : "INITIALIZE SYNC"}
                          </button>
                        ) : (
                          <div className="space-y-4">
                            <button className="w-full bg-slate-800 hover:bg-slate-700 text-slate-200 font-black py-5 text-[10px] uppercase tracking-[0.4em] transition-all border border-slate-700">
                              System Config
                            </button>
                            <button 
                              onClick={handleLogout}
                              className="w-full text-red-500/50 hover:text-red-500 font-black py-4 text-[10px] uppercase tracking-[0.4em] transition-all"
                            >
                              Disconnect Node
                            </button>
                          </div>
                        )}
                      </div>
                   </div>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* Quick Access Menu */}
      <div className="fixed bottom-8 left-1/2 -translate-x-1/2 md:hidden z-50">
        <div className="bg-slate-950/90 backdrop-blur-3xl border border-slate-700 rounded-none px-12 py-5 flex gap-12 shadow-2xl active-glow">
           <button onClick={() => { setSelectedGame(null); setActiveTab('games'); }} className={cn("transition-colors", activeTab === 'games' ? "text-indigo-400" : "text-slate-600")}>
             <LayoutGrid className="w-7 h-7" />
           </button>
           <button onClick={() => setActiveTab('leaderboard')} className={cn("transition-colors", activeTab === 'leaderboard' ? "text-indigo-400" : "text-slate-600")}>
             <Trophy className="w-7 h-7" />
           </button>
           <button onClick={() => setActiveTab('profile')} className={cn("transition-colors", activeTab === 'profile' ? "text-indigo-400" : "text-slate-600")}>
             <UserIcon className="w-7 h-7" />
           </button>
        </div>
      </div>

      <footer className="h-10 border-t border-slate-700 bg-slate-950 flex items-center justify-between px-8 text-[10px] text-slate-600 font-mono tracking-wider uppercase">
        <div>&copy; 2024 NOVA GAMES // V1.0.8-STABLE</div>
        <div className="hidden sm:flex items-center gap-8">
          <div>FIREBASE: <span className="text-emerald-500">CONNECTED</span></div>
          <div>REGION: <span className="text-indigo-400">US-WEST</span></div>
          <div>LATENCY: 24MS</div>
        </div>
      </footer>
    </div>
  );
}
