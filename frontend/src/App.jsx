import React, { useState, useEffect, useRef } from 'react';
import { io } from 'socket.io-client';
import { initializeApp } from 'firebase/app';
import { getAuth, signInWithPopup, GoogleAuthProvider, signOut, onAuthStateChanged } from 'firebase/auth';
import { Send, Music, User, Home, Heart, MoreHorizontal, LogOut, Check, X, Smile, MessageCircle, Sparkles, Loader2, Search, UserPlus, UserCheck, ArrowLeft } from 'lucide-react';

// --- CONFIGURATION ---
const BACKEND_URL = "http://localhost:7860"; 
const FIREBASE_CONFIG = {
  apiKey: "AIzaSyAs0UtZC4beADW1xvPPexm63mszJuaLCHA",
  authDomain: "nobody-c7703.firebaseapp.com",
  projectId: "nobody-c7703",
  storageBucket: "nobody-c7703.firebasestorage.app",
  messagingSenderId: "275846457542",
  appId: "1:275846457542:web:45a47fef7a4a069ddb0fc7",
  measurementId: "G-1S8QXS5DGX"
};

// --- INITIALIZE ---
const app = initializeApp(FIREBASE_CONFIG);
const auth = getAuth(app);
const socket = io(BACKEND_URL);

// --- THEMES ---
const THEMES = {
  classic: { name: 'Classic', bg: 'bg-black', msg: 'bg-zinc-900 text-gray-200', self: 'bg-blue-600 text-white' },
  sunset: { name: 'Sunset', bg: 'bg-gradient-to-br from-orange-900 to-rose-900', msg: 'bg-black/40 text-orange-100 backdrop-blur-sm', self: 'bg-gradient-to-r from-orange-500 to-rose-500 text-white' },
  ocean: { name: 'Ocean', bg: 'bg-gradient-to-br from-blue-900 to-cyan-900', msg: 'bg-black/40 text-blue-100 backdrop-blur-sm', self: 'bg-gradient-to-r from-blue-500 to-cyan-500 text-white' },
  love: { name: 'Love', bg: 'bg-gradient-to-br from-pink-900 to-red-900', msg: 'bg-black/40 text-pink-100 backdrop-blur-sm', self: 'bg-gradient-to-r from-pink-500 to-rose-500 text-white' },
  matrix: { name: 'Hacker', bg: 'bg-black', msg: 'bg-gray-900 text-green-500 border border-green-900 font-mono', self: 'bg-green-900 text-green-100 border border-green-500 font-mono' },
  midnight: { name: 'Midnight', bg: 'bg-slate-950', msg: 'bg-slate-900 text-slate-300', self: 'bg-indigo-600 text-white' },
  galaxy: { name: 'Galaxy', bg: 'bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-indigo-900 via-purple-900 to-black', msg: 'bg-black/50 text-purple-200 backdrop-blur-md', self: 'bg-gradient-to-r from-indigo-500 to-purple-500 text-white' },
};

const SONGS = [
  { id: 'lofi', name: 'Lofi Chill', url: 'https://cdn.pixabay.com/download/audio/2022/05/27/audio_1808fbf07a.mp3' },
  { id: 'trap', name: 'Trap Beat', url: 'https://cdn.pixabay.com/download/audio/2022/03/15/audio_1067246574.mp3' },
  { id: 'jazz', name: 'Smooth Jazz', url: 'https://cdn.pixabay.com/download/audio/2022/02/10/audio_fc8c857732.mp3' },
  { id: 'synth', name: 'Synthwave', url: 'https://cdn.pixabay.com/download/audio/2022/01/18/audio_d0a13f69d2.mp3' },
];

export default function App() {
  const [user, setUser] = useState(null); 
  const [profile, setProfile] = useState(null); 
  const [view, setView] = useState('loading'); // loading, login, setup, home, search, chat, profile, settings
  const [messages, setMessages] = useState([]);
  const [inputText, setInputText] = useState('');
  const [currentTheme, setCurrentTheme] = useState('classic');
  const [activeSong, setActiveSong] = useState(null);
  const [activeChat, setActiveChat] = useState({ id: 'general', name: 'General Chat', avatar: null }); 
  const audioRef = useRef(new Audio());

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (fbUser) => {
      if (fbUser) {
        setUser(fbUser);
        try {
          const res = await fetch(`{BACKEND_URL}/api/user/{fbUser.uid}`);
          if (res.ok) {
            const data = await res.json();
            setProfile(data);
            setCurrentTheme(data.chatTheme || 'classic');
            setView('home');
          } else {
            setView('setup'); 
          }
        } catch (e) {
          console.error("Backend Error:", e);
          setView('setup'); 
        }
      } else {
        setUser(null);
        setProfile(null);
        setView('login');
      }
    });
    return () => unsub();
  }, []);

  // Socket Room Logic
  useEffect(() => {
    if (view === 'chat') {
      socket.emit('join_room', activeChat.id); 
    }

    const handleMessage = (msg) => {
      if (msg.conversationId === activeChat.id) {
        setMessages(prev => [...prev, msg]);
      }
    };

    socket.on('chat message', handleMessage);
    socket.on('chat history', (hist) => setMessages(hist));
    
    return () => { 
      socket.off('chat message', handleMessage); 
      socket.off('chat history'); 
    }
  }, [activeChat.id, view]); 

  const handleProfileCreate = async (username, bio) => {
    if (!username) return alert("Please enter a username.");
    try {
      const check = await fetch(`{BACKEND_URL}/api/check-username`, {
        method: 'POST', headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({ username })
      });
      const checkData = await check.json();
      if (!checkData.available) { alert("Username unavailable!"); return; }

      const newProfile = {
        uid: user.uid,
        email: user.email,
        username: username,
        displayName: user.displayName,
        photoURL: user.photoURL,
        bio: bio || "Hey there! I'm using Nobody Chat.",
        chatTheme: 'classic'
      };

      await fetch(`{BACKEND_URL}/api/user-sync`, {
        method: 'POST', headers: {'Content-Type': 'application/json'},
        body: JSON.stringify(newProfile)
      });

      setProfile(newProfile);
      setView('home');
    } catch (e) { alert("Error connecting to server."); }
  };

  const updateTheme = async (themeKey) => {
    setCurrentTheme(themeKey);
    if(profile) {
      const updated = { ...profile, chatTheme: themeKey };
      setProfile(updated);
      try {
        await fetch(`{BACKEND_URL}/api/user-sync`, {
          method: 'POST', headers: {'Content-Type': 'application/json'},
          body: JSON.stringify({ uid: user.uid, chatTheme: themeKey })
        });
      } catch (e) {}
    }
  };

  const startChat = (targetUser) => {
    let chatId = 'general';
    let chatName = 'General Chat';
    let chatAvatar = null;

    if (targetUser) {
      const ids = [profile.uid, targetUser.uid].sort();
      chatId = ids.join('_');
      chatName = targetUser.username;
      chatAvatar = targetUser.photoURL;
    }

    setActiveChat({ id: chatId, name: chatName, avatar: chatAvatar });
    setMessages([]); 
    setView('chat');
  };

  const sendMessage = (e) => {
    e.preventDefault();
    if(!inputText.trim() || !profile) return;
    const msg = {
      user: profile.username, 
      avatar: profile.photoURL,
      text: inputText,
      conversationId: activeChat.id 
    };
    socket.emit('chat message', msg);
    setInputText('');
  };

  const playSong = (url) => {
    if(activeSong === url) { audioRef.current.pause(); setActiveSong(null); } 
    else { audioRef.current.src = url; audioRef.current.play(); setActiveSong(url); }
  };

  if (view === 'loading') return <div className="h-screen flex items-center justify-center bg-black text-white animate-pulse">Loading...</div>;

  if (view === 'login') return <LoginScreen onLogin={() => signInWithPopup(auth, new GoogleAuthProvider())} />;
  if (view === 'setup') return <SetupProfile user={user} onComplete={handleProfileCreate} />;

  return (
    <div className={`h-screen flex flex-col {THEMES[currentTheme].bg} transition-colors duration-500 text-white`}>
      {/* Header */}
      {view !== 'chat' && (
        <div className="p-4 flex justify-between items-center backdrop-blur-md sticky top-0 z-10 border-b border-white/10">
          <h1 className="text-xl font-bold italic tracking-wider">Nobody</h1>
          <div className="flex gap-4">
            <Heart size={24} className="hover:text-red-500 cursor-pointer transition-colors"/>
            <MessageCircle size={24} className="cursor-pointer" onClick={() => startChat(null)}/>
          </div>
        </div>
      )}

      {/* Main Content */}
      <div className="flex-1 overflow-y-auto pb-20 scrollbar-hide">
        {view === 'home' && <HomeFeed user={profile} onStartChat={startChat} />}
        {view === 'search' && <SearchPage myProfile={profile} onChat={startChat} />}
        {view === 'chat' && (
          <ChatInterface 
            messages={messages} 
            user={profile} 
            activeChat={activeChat}
            theme={THEMES[currentTheme]} 
            inputText={inputText}
            setInputText={setInputText}
            sendMessage={sendMessage}
            onBack={() => setView('home')}
            onOpenSettings={() => setView('settings')}
          />
        )}
        {view === 'profile' && (
          <ProfilePage 
            profile={profile} 
            activeSong={activeSong} 
            onPlay={playSong}
            onLogout={() => signOut(auth)}
          />
        )}
        {view === 'settings' && (
          <ThemeSelector 
            current={currentTheme} 
            onSelect={(t) => { updateTheme(t); setView('chat'); }} 
            onClose={() => setView('chat')} 
          />
        )}
      </div>

      {/* Nav */}
      <div className="fixed bottom-0 w-full bg-black/80 backdrop-blur-lg border-t border-white/10 p-3 flex justify-around items-center z-20">
        <Home size={26} className={view === 'home' ? "text-white" : "text-zinc-500"} onClick={() => setView('home')} />
        <Search size={26} className={view === 'search' ? "text-white" : "text-zinc-500"} onClick={() => setView('search')} />
        <div className={`w-7 h-7 rounded-full overflow-hidden border-2 {view === 'profile' ? "border-white" : "border-transparent"} cursor-pointer`} onClick={() => setView('profile')}>
           <img src={profile?.photoURL} className="w-full h-full object-cover" />
        </div>
      </div>
    </div>
  );
}

// --- COMPONENTS ---

function LoginScreen({ onLogin }) {
  return (
    <div className="h-screen bg-black flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-sm bg-zinc-900 border border-zinc-800 p-8 rounded-2xl shadow-2xl text-center animate-fade-in">
        <div className="text-5xl font-bold bg-gradient-to-r from-purple-500 to-pink-500 bg-clip-text text-transparent mb-2">Nobody</div>
        <p className="text-zinc-400 mb-8">Enter the void. Connect with the future.</p>
        <button onClick={onLogin} className="w-full bg-white text-black font-bold py-3 rounded-xl hover:bg-gray-200 transition flex items-center justify-center gap-2">
          <User size={20}/> Continue with Google
        </button>
      </div>
    </div>
  );
}

function SetupProfile({ user, onComplete }) {
  const [handle, setHandle] = useState('');
  const [bio, setBio] = useState('');
  const [loading, setLoading] = useState(false);
  
  const submit = async () => {
    setLoading(true);
    await onComplete(handle, bio);
    setLoading(false);
  };

  return (
    <div className="h-screen bg-black text-white p-6 flex flex-col justify-center items-center">
      <div className="w-full max-w-md animate-fade-in">
        <div className="mb-8 text-center">
          <Sparkles className="w-12 h-12 text-purple-500 mx-auto mb-4" />
          <h2 className="text-3xl font-bold mb-2">Create Identity</h2>
          <p className="text-zinc-500">Claim your unique handle in the NobodyVerse.</p>
        </div>
        <div className="space-y-6 bg-zinc-900/50 p-6 rounded-2xl border border-zinc-800">
          <div>
            <label className="text-xs font-bold text-zinc-500 uppercase tracking-wider mb-2 block">Username</label>
            <div className="relative"><span className="absolute left-3 top-3 text-zinc-500">@</span><input className="w-full bg-black border border-zinc-800 rounded-xl py-3 pl-8 pr-4 text-white focus:outline-none focus:border-purple-500 transition-colors font-mono" placeholder="username" value={handle} onChange={e => setHandle(e.target.value.replace(/\s/g, '').toLowerCase())} /></div>
          </div>
          <div>
            <label className="text-xs font-bold text-zinc-500 uppercase tracking-wider mb-2 block">Bio</label>
            <textarea className="w-full bg-black border border-zinc-800 rounded-xl py-3 px-4 text-white focus:outline-none focus:border-purple-500 transition-colors resize-none h-24" placeholder="What's your vibe?" value={bio} onChange={e => setBio(e.target.value)} />
          </div>
          <button onClick={submit} disabled={loading} className="bg-white text-black w-full py-4 rounded-xl font-bold text-lg hover:bg-gray-200 transition-transform active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2">
            {loading ? <><Loader2 className="animate-spin"/> Connecting...</> : "Enter the Void"}
          </button>
        </div>
      </div>
    </div>
  );
}

function SearchPage({ myProfile, onChat }) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);

  const search = async (e) => {
    const q = e.target.value;
    setQuery(q);
    if (q.length < 2) { setResults([]); return; }
    
    setLoading(true);
    try {
      const res = await fetch(`{BACKEND_URL}/api/search?q={q}`);
      const data = await res.json();
      setResults(data.filter(u => u.uid !== myProfile.uid)); // Filter self
    } catch(e) {}
    setLoading(false);
  };

  const toggleFollow = async (targetUid, isFollowing) => {
    const endpoint = isFollowing ? '/api/unfollow' : '/api/follow';
    await fetch(`{BACKEND_URL}{endpoint}`, {
      method: 'POST', headers: {'Content-Type': 'application/json'},
      body: JSON.stringify({ myUid: myProfile.uid, targetUid })
    });
    // Optimistic refresh
    search({target: {value: query}});
  };

  return (
    <div className="p-4">
      <div className="relative mb-6">
        <Search className="absolute left-3 top-3 text-zinc-500" size={20}/>
        <input 
          value={query} onChange={search}
          placeholder="Search usernames..." 
          className="w-full bg-zinc-900 border border-zinc-800 rounded-xl py-3 pl-10 pr-4 text-white focus:outline-none focus:border-purple-500 transition-colors"
        />
      </div>
      
      <div className="flex flex-col gap-4">
        {loading && <div className="text-center text-zinc-500">Searching...</div>}
        {results.map(user => {
          const isFollowing = myProfile.following?.includes(user.uid);
          return (
            <div key={user.uid} className="flex items-center justify-between bg-zinc-900/50 p-4 rounded-xl border border-white/5">
              <div className="flex items-center gap-3">
                <img src={user.photoURL} className="w-10 h-10 rounded-full border border-white/10" />
                <div>
                  <div className="font-bold">@{user.username}</div>
                  <div className="text-xs text-zinc-500">{user.displayName}</div>
                </div>
              </div>
              <div className="flex gap-2">
                <button onClick={() => onChat(user)} className="p-2 bg-white/5 rounded-full hover:bg-white/10"><MessageCircle size={18}/></button>
                <button onClick={() => toggleFollow(user.uid, isFollowing)} className={`p-2 rounded-full {isFollowing ? 'bg-zinc-800' : 'bg-purple-600'} text-white`}>
                  {isFollowing ? <UserCheck size={18}/> : <UserPlus size={18}/>}
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function HomeFeed({ user, onStartChat }) {
  const [friends, setFriends] = useState([]);

  useEffect(() => {
    if(!user) return;
    fetch(`{BACKEND_URL}/api/friends/{user.uid}`)
      .then(res => res.json())
      .then(setFriends)
      .catch(console.error);
  }, [user]);

  return (
     <div className="p-4">
        {/* Horizontal Stories / Direct Messages */}
        <div className="mb-6">
          <h2 className="text-sm font-bold text-zinc-500 mb-3 uppercase tracking-wider">Direct Messages</h2>
          <div className="flex gap-4 overflow-x-auto pb-4 scrollbar-hide">
            <div className="flex flex-col items-center cursor-pointer" onClick={() => onStartChat(null)}>
               <div className="w-16 h-16 rounded-full bg-gradient-to-tr from-purple-500 to-blue-500 p-[2px]">
                  <img src="https://cdn-icons-png.flaticon.com/512/4712/4712038.png" className="w-full h-full rounded-full bg-black p-1" />
               </div>
               <span className="text-xs mt-2 text-zinc-300">General</span>
            </div>
            {friends.map(f => (
              <div key={f.uid} className="flex flex-col items-center cursor-pointer min-w-[64px]" onClick={() => onStartChat(f)}>
                 <div className="w-16 h-16 rounded-full bg-zinc-800 p-[2px] border border-zinc-700">
                    <img src={f.photoURL} className="w-full h-full rounded-full object-cover" />
                 </div>
                 <span className="text-xs mt-2 text-zinc-300 truncate w-full text-center">{f.username}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="flex flex-col items-center justify-center h-64 text-center opacity-50 border-t border-white/5 pt-8">
           <div className="w-24 h-24 bg-zinc-900 rounded-full mb-6 flex items-center justify-center border border-zinc-800">
              <Send size={40} className="text-purple-500" />
           </div>
           <h2 className="text-xl font-bold mb-3 text-white">Start Messaging</h2>
           <p className="text-zinc-500 max-w-xs">Tap a friend above or search to find new people.</p>
        </div>
     </div>
  );
}

function ChatInterface({ messages, user, activeChat, theme, inputText, setInputText, sendMessage, onBack, onOpenSettings }) {
  const endRef = useRef(null);
  useEffect(() => endRef.current?.scrollIntoView({ behavior: 'smooth' }), [messages]);

  return (
    <div className="flex flex-col h-full">
      <div className="flex justify-between items-center px-4 py-3 bg-black/20 backdrop-blur-sm sticky top-0 z-10 border-b border-white/5">
         <div className="flex items-center gap-3">
            <ArrowLeft className="cursor-pointer" onClick={onBack} />
            <div className="w-10 h-10 rounded-full bg-zinc-800 overflow-hidden">
               <img src={activeChat.avatar || "https://cdn-icons-png.flaticon.com/512/4712/4712038.png"} className="w-full h-full object-cover" />
            </div>
            <div>
              <div className="font-bold text-sm">{activeChat.name}</div>
              <div className="text-[10px] text-green-400 flex items-center gap-1">● Online</div>
            </div>
         </div>
         <div className="p-2 bg-white/10 rounded-full cursor-pointer hover:bg-white/20" onClick={onOpenSettings}>
            <MoreHorizontal size={20}/>
         </div>
      </div>

      <div className="flex-1 p-4 flex flex-col gap-4">
        {messages.map((msg, i) => {
          const isMe = msg.user === user.username;
          return (
            <div key={i} className={`flex gap-3 max-w-[85%] {isMe ? 'self-end flex-row-reverse' : 'self-start'} animate-fade-in`}>
              {!isMe && <img src={msg.avatar || `https://ui-avatars.com/api/?name={msg.user}`} className="w-8 h-8 rounded-full border border-white/10 shadow-sm mt-auto" />}
              <div className={`px-4 py-2.5 rounded-2xl text-sm shadow-md leading-relaxed {isMe ? theme.self : theme.msg} {isMe ? 'rounded-br-sm' : 'rounded-bl-sm'}`}>
                {!isMe && activeChat.id === 'general' && <p className="text-[10px] opacity-50 mb-1 font-bold">@{msg.user}</p>}
                {msg.text || msg.content}
              </div>
            </div>
          );
        })}
        <div ref={endRef} />
      </div>

      <form onSubmit={sendMessage} className="p-3 bg-black/40 backdrop-blur-md border-t border-white/10 flex gap-2">
        <input 
          value={inputText}
          onChange={e => setInputText(e.target.value)}
          placeholder="Message..."
          className="flex-1 bg-white/10 border border-white/5 text-white rounded-full px-5 py-3 focus:outline-none focus:bg-white/20 transition-colors placeholder:text-zinc-500"
        />
        <button className="bg-blue-600 text-white rounded-full p-3 hover:bg-blue-500 transition-colors">
          <Send size={20} />
        </button>
      </form>
    </div>
  );
}

function ProfilePage({ profile, activeSong, onPlay, onLogout }) {
  const [song, setSong] = useState(profile?.themeSong || null);
  const [isEditingSong, setIsEditingSong] = useState(false);

  return (
    <div className="p-4 min-h-full">
      <div className="flex justify-between mb-8 items-center">
         <h1 className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-white to-zinc-500">@{profile.username}</h1>
         <LogOut size={20} className="cursor-pointer text-zinc-500 hover:text-red-500 transition-colors" onClick={onLogout} />
      </div>

      <div className="flex items-center gap-6 mb-8">
         <div className="w-24 h-24 rounded-full p-[3px] bg-gradient-to-tr from-yellow-400 via-pink-500 to-purple-500 shadow-xl">
            <img src={profile.photoURL} className="w-full h-full rounded-full border-4 border-black object-cover"/>
         </div>
         <div className="flex gap-6 text-center">
            <div><div className="font-bold text-xl">1.2k</div><div className="text-xs text-zinc-500 tracking-wider">POSTS</div></div>
            <div><div className="font-bold text-xl">{profile.followers?.length || 0}</div><div className="text-xs text-zinc-500 tracking-wider">SUBS</div></div>
            <div><div className="font-bold text-xl">{profile.following?.length || 0}</div><div className="text-xs text-zinc-500 tracking-wider">FOLLOWING</div></div>
         </div>
      </div>

      <div className="mb-8">
         <div className="font-bold text-lg mb-1">{profile.displayName}</div>
         <div className="text-sm text-zinc-300 whitespace-pre-wrap leading-relaxed">{profile.bio}</div>
         
         <div className="mt-4 bg-zinc-900/80 rounded-xl p-3 flex items-center gap-3 border border-white/5 hover:border-white/10 transition-colors">
            <div className="w-12 h-12 bg-zinc-800 rounded-lg flex items-center justify-center cursor-pointer" onClick={() => song && onPlay(song)}>
               <Music size={20} className={activeSong === song ? "text-purple-500 animate-pulse" : "text-zinc-400"} />
            </div>
            <div className="flex-1 min-w-0">
               <div className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider mb-0.5">Profile Anthem</div>
               {isEditingSong ? (
                 <select onChange={(e) => { setSong(e.target.value); setIsEditingSong(false); }} className="text-sm w-full bg-zinc-800 text-white rounded p-1 outline-none">
                    <option value="">Select a track...</option>
                    {SONGS.map(s => <option key={s.id} value={s.url}>{s.name}</option>)}
                 </select>
               ) : (
                 <div className="text-sm font-bold cursor-pointer truncate hover:text-purple-400 transition-colors" onClick={() => setIsEditingSong(true)}>
                    {SONGS.find(s => s.url === song)?.name || "Add a song..."}
                 </div>
               )}
            </div>
         </div>
      </div>

      <div className="flex gap-3 mb-8">
         <button className="flex-1 bg-zinc-800 py-2.5 rounded-lg font-bold text-sm hover:bg-zinc-700 transition-colors">Edit Profile</button>
         <button className="flex-1 bg-zinc-800 py-2.5 rounded-lg font-bold text-sm hover:bg-zinc-700 transition-colors">Share</button>
      </div>

      <div className="grid grid-cols-3 gap-1 rounded-xl overflow-hidden border border-white/5">
         {[...Array(12)].map((_,i) => (
            <div key={i} className="aspect-square bg-zinc-900 hover:bg-zinc-800 transition-colors cursor-pointer relative group">
               <div className="absolute inset-0 bg-black/20 group-hover:bg-transparent transition-all"></div>
            </div>
         ))}
      </div>
    </div>
  );
}

function ThemeSelector({ current, onSelect, onClose }) {
  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-end animate-fade-in">
      <div className="bg-zinc-900 w-full rounded-t-3xl p-6 max-h-[80vh] overflow-y-auto border-t border-white/10">
        <div className="flex justify-between items-center mb-6">
          <h3 className="font-bold text-xl text-white">Chat Themes</h3>
          <div className="p-2 bg-white/5 rounded-full cursor-pointer hover:bg-white/10" onClick={onClose}>
             <X size={20} className="text-white" />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4">
          {Object.entries(THEMES).map(([key, theme]) => (
            <div 
              key={key} 
              onClick={() => onSelect(key)}
              className={`p-4 rounded-2xl border-2 cursor-pointer relative overflow-hidden group {current === key ? 'border-purple-500' : 'border-transparent bg-black/40'}`}
            >
              <div className={`absolute inset-0 opacity-30 group-hover:opacity-50 transition-opacity {theme.bg}`}></div>
              <div className="relative z-10 flex items-center justify-between">
                <span className="font-bold text-white text-sm">{theme.name}</span>
                {current === key && <div className="bg-purple-500 rounded-full p-1"><Check size={12} className="text-white"/></div>}
              </div>
              <div className="flex gap-2 mt-4">
                 <div className={`w-8 h-8 rounded-full shadow-lg {theme.self.split(' ')[0]}`}></div>
                 <div className={`w-8 h-8 rounded-full bg-zinc-700 shadow-lg`}></div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}