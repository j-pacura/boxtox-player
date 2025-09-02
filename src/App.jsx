// FILE: src/App.jsx
import React, { useEffect, useMemo, useRef, useState } from "react";
import { createClient } from "@supabase/supabase-js";
import { Search, Heart, Play, User, LogOut, ListVideo, Star, Film, ChevronDown, Trash2, Plus, X, SkipBack, SkipForward, Zap, Gamepad2 } from "lucide-react";
import PacBoxGame from "./components/PacBoxGame.jsx";

// BOXTOX PLAYER — App.jsx (aktualny)
// - Player (YT IFrame API) z auto‑następnym
// - Ulubione, Playlisty (Supabase lub LocalStorage)
// - Wyszukiwarka YouTube z paginacją („Pokaż więcej” + auto‑doładowanie)
// - Dropdown „Dodaj do playlisty” poprawiony (nie wychodzi poza kartę)
// - FAB „Gra” → modal z Pac‑BOX (osobny komponent)

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || "";
const SUPABASE_ANON = import.meta.env.VITE_SUPABASE_ANON_KEY || "";
const LS_GUEST_KEY = "boxtox.guest.publicauth.v7";

function useSupabase() {
  const enabled = !!(SUPABASE_URL && SUPABASE_ANON);
  const supabase = useMemo(() => {
    if (!enabled) return null;
    try { return createClient(SUPABASE_URL, SUPABASE_ANON); } catch { return null; }
  }, [enabled]);
  const [user, setUser] = useState(null);
  useEffect(() => {
    if (!supabase) { setUser(null); return; }
    let sub;
    (async () => {
      const { data } = await supabase.auth.getSession();
      setUser(data?.session?.user ?? null);
      sub = supabase.auth.onAuthStateChange((_e, session) => setUser(session?.user ?? null));
    })();
    return () => { if (sub?.unsubscribe) sub.unsubscribe(); };
  }, [supabase]);
  return { supabase, user };
}

function useGuestStore() {
  const [store, setStore] = useState(() => {
    try { const raw = localStorage.getItem(LS_GUEST_KEY); return raw ? JSON.parse(raw) : { favorites: [], playlists: [] }; }
    catch { return { favorites: [], playlists: [] }; }
  });
  useEffect(() => { localStorage.setItem(LS_GUEST_KEY, JSON.stringify(store)); }, [store]);
  return [store, setStore];
}

function Header({ onSearch, query, setQuery, onOpenAccount, userEmail, onSignOut, activeTab, setActiveTab }) {
  return (
    <div className="w-full sticky top-0 z-40 bg-gray-900/90 backdrop-blur border-b border-gray-700">
      <div className="max-w-6xl mx-auto px-4 h-16 flex items-center gap-4">
        <div className="flex items-center gap-2">
          <div className="w-9 h-9 rounded-lg bg-red-600 grid place-items-center font-extrabold text-white">B</div>
          <div className="font-extrabold tracking-tight text-white text-xl">BOXTOX <span className="text-gray-400">PLAYER</span></div>
        </div>
        <nav className="hidden md:flex items-center gap-2 ml-2">
          {[
            { key: "browse", label: "Przeglądaj", icon: <ListVideo size={16} /> },
            { key: "favorites", label: "Ulubione", icon: <Star size={16} /> },
            { key: "playlists", label: "Playlisty", icon: <Film size={16} /> },
          ].map((tab) => (
            <button key={tab.key} onClick={() => setActiveTab(tab.key)} className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors border ${activeTab===tab.key?"bg-red-600 text-white border-transparent":"bg-gray-800 text-gray-300 hover:bg-gray-700 border-gray-700"}`}>{tab.icon}{tab.label}</button>
          ))}
        </nav>
        <div className="flex-1" />
        <div className="relative w-full max-w-2xl">
          <input value={query} onChange={(e)=>setQuery(e.target.value)} onKeyDown={(e)=>e.key==="Enter"&&onSearch()} placeholder="Szukaj na YouTube..." className="w-full pl-4 pr-11 py-3 rounded-lg border border-gray-700 bg-gray-800 text-white placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-red-600"/>
          <button onClick={onSearch} className="absolute right-2 top-1/2 -translate-y-1/2 p-2 rounded-md bg-gray-800 hover:bg-gray-700 border border-gray-700"><Search size={20} className="text-gray-300"/></button>
        </div>
        <div className="flex-1" />
        <div className="flex items-center gap-2">
          {userEmail ? (
            <>
              <div className="hidden lg:block text-sm text-gray-300">{userEmail}</div>
              <button onClick={onSignOut} className="px-3 py-2 rounded-lg border border-gray-700 bg-gray-800 text-gray-200 hover:bg-gray-700 flex items-center gap-2"><LogOut size={16}/><span className="hidden sm:inline">Wyloguj</span></button>
            </>
          ) : (
            <button onClick={onOpenAccount} className="px-3 py-2 rounded-lg border border-gray-700 bg-gray-800 text-gray-200 hover:bg-gray-700 flex items-center gap-2"><User size={16}/> Zaloguj / Rejestracja</button>
          )}
        </div>
      </div>
    </div>
  );
}

function VideoCard({ video, onClick, isActive, onFavToggle, isFavorite, playlists, onCreatePlaylist, onAddToPlaylist, playlistIdContext, onRemoveFromPlaylist }) {
  const [menuOpen, setMenuOpen] = useState(false);
  return (
    <div className={`relative ${menuOpen?"z-20":""} rounded-lg border border-gray-700 bg-gray-800 hover:bg-gray-700 transition-colors cursor-pointer ${isActive?"ring-2 ring-red-600/60":""}`} onClick={()=>onClick(video)}>
      {playlistIdContext && onRemoveFromPlaylist && (
        <button title="Usuń z playlisty" onClick={(e)=>{ e.stopPropagation(); onRemoveFromPlaylist(playlistIdContext, video.video_id); }} className="absolute top-2 right-2 p-1.5 rounded-md bg-gray-900/80 hover:bg-gray-900 border border-gray-700 z-40"><X size={14} /></button>
      )}
      {/* overflow-hidden tylko na miniaturze — nie na całej karcie */}
      <div className="relative group overflow-hidden rounded-t-lg">
        <img src={video.thumbnail_url} alt={video.title} className="w-full aspect-video object-cover"/>
        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/50 transition-colors grid place-items-center">
          <div className="w-16 h-16 rounded-full bg-white/90 grid place-items-center shadow-md opacity-0 group-hover:opacity-100 transition-opacity"><Play className="text-gray-900" size={28}/></div>
        </div>
      </div>
      <div className="p-4">
        <div className="font-semibold text-white line-clamp-2 leading-tight">{video.title}</div>
        <div className="text-sm text-gray-400 mt-1">{video.channel_title}</div>
        {/* Akcje: w lewo, zawijane, dropdown otwierany od LEWEJ */}
        <div className="mt-3 flex flex-wrap items-center justify-start gap-2 relative">
          <button onClick={(e)=>{ e.stopPropagation(); onFavToggle(video, isFavorite); }} className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border border-gray-700 bg-gray-800 hover:bg-gray-700 text-sm">
            <Heart size={16} className={isFavorite?"text-red-500 fill-red-500":"text-gray-400"}/> {isFavorite?"Usuń z ulubionych":"Ulubione"}
          </button>
          {onAddToPlaylist && (
            <div className="relative" onClick={(e)=>e.stopPropagation()}>
              <button onClick={()=>setMenuOpen((o)=>!o)} className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border border-gray-700 bg-gray-800 hover:bg-gray-700 text-sm">Dodaj do playlisty <ChevronDown size={16} className="opacity-80"/></button>
              {menuOpen && (
                <div className="absolute left-0 mt-2 w-60 rounded-lg border border-gray-700 bg-gray-900 shadow-xl z-[100]">
                  <button className="w-full flex items-center gap-2 px-3 py-2 hover:bg-gray-800 rounded-t-lg" onClick={async()=>{ const name = prompt("Nazwa nowej playlisty"); if(name){ const id = await onCreatePlaylist(name); if(id){ await onAddToPlaylist(id, video); setMenuOpen(false);} } }}><Plus size={16}/> Nowa playlista</button>
                  <div className="max-h-56 overflow-auto py-1">
                    {(!playlists||playlists.length===0) ? (
                      <div className="px-3 py-2 text-sm text-gray-400">Brak playlist</div>
                    ) : (
                      playlists.map(pl => (
                        <button key={pl.id} className="w-full text-left px-3 py-2 hover:bg-gray-800" onClick={async()=>{ await onAddToPlaylist(pl.id, video); setMenuOpen(false); }}>{pl.name}</button>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function Player({ videoId, onEnded, userInteracted, onRequireInteract }) {
  const containerRef = useRef(null);
  const playerRef = useRef(null);
  const [apiReady, setApiReady] = useState(false);
  const lastEndedRef = useRef(0);

  // Ładowanie IFrame API
  useEffect(() => {
    let mounted = true;
    function ensureYT() {
      return new Promise((resolve) => {
        if (window.YT && window.YT.Player) return resolve(window.YT);
        const existing = document.querySelector('script[src="https://www.youtube.com/iframe_api"]');
        if (!existing) {
          const tag = document.createElement('script');
          tag.src = 'https://www.youtube.com/iframe_api';
          document.body.appendChild(tag);
        }
        const check = () => { if (window.YT && window.YT.Player) resolve(window.YT); else setTimeout(check, 50); };
        check();
      });
    }
    (async () => { await ensureYT(); if (!mounted) return; setApiReady(true); })();
    return () => { mounted = false; };
  }, []);

  // Tworzenie playera
  useEffect(() => {
    if (!apiReady || !containerRef.current || playerRef.current) return;
    try {
      playerRef.current = new window.YT.Player(containerRef.current, {
        width: '100%', height: '100%',
        playerVars: { rel: 0, modestbranding: 1, playsinline: 1, origin: window.location.origin },
        events: {
          onReady: (e) => {
            if (videoId && userInteracted) { try { e.target.loadVideoById(videoId); e.target.playVideo(); } catch {} }
            else if (videoId) { try { e.target.cueVideoById(videoId); } catch {} }
          },
          onStateChange: (e) => {
            if (!window.YT) return;
            if (e?.data === window.YT.PlayerState.ENDED) {
              const now = Date.now(); if (now - lastEndedRef.current > 1200) { lastEndedRef.current = now; onEnded && onEnded(); }
            }
            if (e?.data === window.YT.PlayerState.PAUSED) {
              try {
                const p = playerRef.current; const dur = p.getDuration?.(); const cur = p.getCurrentTime?.();
                if (dur > 0 && cur >= dur - 0.2) {
                  const now = Date.now(); if (now - lastEndedRef.current > 1200) { lastEndedRef.current = now; onEnded && onEnded(); }
                }
              } catch {}
            }
          },
          onError: () => { const now = Date.now(); if (now - lastEndedRef.current > 1200) { lastEndedRef.current = now; onEnded && onEnded(); } }
        },
      });
    } catch {}
  }, [apiReady]);

  // Zmiana videoId / userInteracted
  useEffect(() => {
    const p = playerRef.current; if (!apiReady || !p || !videoId) return;
    try { if (userInteracted) { p.loadVideoById(videoId); p.playVideo(); } else { p.cueVideoById(videoId); } } catch {}
  }, [apiReady, videoId, userInteracted]);

  // Fallback blisko końca
  useEffect(() => {
    const p = playerRef.current; if (!p) return;
    const iv = setInterval(() => {
      try {
        const state = p.getPlayerState?.();
        const dur = p.getDuration?.();
        const cur = p.getCurrentTime?.();
        if (dur > 0 && cur >= dur - 0.25 && (state === window.YT.PlayerState.PLAYING || state === window.YT.PlayerState.PAUSED)) {
          const now = Date.now(); if (now - lastEndedRef.current > 1200) { lastEndedRef.current = now; onEnded && onEnded(); }
        }
      } catch {}
    }, 800);
    return () => clearInterval(iv);
  }, [apiReady, onEnded]);

  function playAfterUserGesture() {
    const p = playerRef.current;
    onRequireInteract && onRequireInteract();
    setTimeout(() => { try { p && p.playVideo(); } catch {} }, 0);
  }

  return (
    <div className="relative w-full aspect-video rounded-xl overflow-hidden border border-gray-700 bg-gray-900">
      <div ref={containerRef} className="w-full h-full" />
      {!userInteracted && videoId && (
        <button onClick={playAfterUserGesture} className="absolute inset-0 flex items-center justify-center bg-black/40 hover:bg-black/30" title="Kliknij, aby odtworzyć">
          <span className="px-4 py-2 rounded-lg bg-red-600 hover:bg-red-700 text-white font-medium">Kliknij, aby odtworzyć</span>
        </button>
      )}
    </div>
  );
}

function SkeletonCard(){
  return (
    <div className="rounded-lg border border-gray-700 overflow-hidden bg-gray-800 animate-pulse">
      <div className="w-full aspect-video bg-gray-700"/>
      <div className="p-4 space-y-2"><div className="h-4 bg-gray-700 rounded w-3/4"/><div className="h-3 bg-gray-700 rounded w-1/2"/></div>
    </div>
  );
}

export default function App(){
  const { supabase, user } = useSupabase();
  const [guestStore, setGuestStore] = useGuestStore();

  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [active, setActive] = useState(null);

  const [showAccount, setShowAccount] = useState(false);
  const [authView, setAuthView] = useState("signin");
  const [activeTab, setActiveTab] = useState("browse");

  const [favorites, setFavorites] = useState([]);
  const [playlists, setPlaylists] = useState([]);
  const [selectedPlaylistId, setSelectedPlaylistId] = useState(null);
  const [playlistItems, setPlaylistItems] = useState([]);

  // Kolejka
  const [queue, setQueue] = useState([]);
  the_queue_fix: // (label to avoid accidental edits)
  const [queueIndex, setQueueIndex] = useState(0);
  const [autoNext, setAutoNext] = useState(true);
  const [queueLabel, setQueueLabel] = useState("");
  const [userInteracted, setUserInteracted] = useState(false);

  // Paginacja wyników
  const [nextToken, setNextToken] = useState(null);
  const [lastQuery, setLastQuery] = useState("");
  const sentinelRef = useRef(null);

  // Gra (modal)
  const [showGame, setShowGame] = useState(false);

  const isCloud = !!(supabase && user);

  useEffect(()=>{
    if(!isCloud){
      setFavorites(guestStore.favorites||[]);
      setPlaylists(guestStore.playlists||[]);
      setPlaylistItems([]); setSelectedPlaylistId(null);
      return;
    }
    (async()=>{
      const { data: favs } = await supabase.from("favorites").select("video_id, title, channel_title, thumbnail_url, created_at").order("created_at", { ascending: false });
      setFavorites(favs||[]);
      const { data: pls } = await supabase.from("playlists").select("id, name, created_at").order("created_at", { ascending: true });
      setPlaylists(pls||[]);
      setPlaylistItems([]); setSelectedPlaylistId(null);
    })();
  },[isCloud]);

  async function search(){
    if(!query.trim()) return; setLoading(true);
    try{
      const res = await fetch(`/.netlify/functions/youtube-search?q=${encodeURIComponent(query)}`);
      if(!res.ok) throw new Error("YouTube search failed");
      const data = await res.json();
      const items = (data.items||[]).filter(v=>v.video_id);
      setResults(items);
      setNextToken(data.nextPageToken||null);
      setLastQuery(query);
      if(items.length) { setActive(items[0]); clearQueue(); }
      setActiveTab("browse");
    }catch(e){ console.error(e); alert("Błąd wyszukiwania. Skontaktuj się z administratorem."); }
    finally{ setLoading(false); }
  }

  async function loadMore(){
    if(!lastQuery || !nextToken) return;
    setLoading(true);
    try{
      const url = `/.netlify/functions/youtube-search?q=${encodeURIComponent(lastQuery)}&pageToken=${encodeURIComponent(nextToken)}`;
      const res = await fetch(url);
      if(!res.ok) throw new Error("YouTube search failed");
      const data = await res.json();
      const items = (data.items||[]).filter(v=>v.video_id);
      setResults(prev => [...prev, ...items]);
      setNextToken(data.nextPageToken||null);
    } catch(e){ console.error(e); alert("Nie udało się pobrać kolejnych wyników."); }
    finally{ setLoading(false); }
  }

  // Auto‑doładowanie przy przewinięciu do dołu
  useEffect(() => {
    if (!sentinelRef.current) return;
    const el = sentinelRef.current;
    const obs = new IntersectionObserver((entries) => {
      const first = entries[0];
      if (first.isIntersecting && nextToken && !loading) { loadMore(); }
    }, { rootMargin: "200px" });
    obs.observe(el);
    return () => obs.disconnect();
  }, [nextToken, loading, lastQuery]);

  function toVideoMinimal(v){ return { video_id: v.video_id, title: v.title, channel_title: v.channel_title, thumbnail_url: v.thumbnail_url }; }

  async function toggleFavorite(video, currentlyFavorite){
    const v = toVideoMinimal(video);
    if(isCloud){
      if(currentlyFavorite){
        const { error } = await supabase.from("favorites").delete().eq("video_id", v.video_id);
        if(error) return alert("Nie udało się usunąć z Ulubionych (Supabase).");
        setFavorites(prev=> prev.filter(x=>x.video_id!==v.video_id));
      } else {
        const { error } = await supabase.from("favorites").upsert(v);
        if(error) return alert("Nie udało się dodać do Ulubionych (Supabase).");
        setFavorites(prev=> prev.find(x=>x.video_id===v.video_id)?prev:[v,...prev]);
      }
    } else {
      setGuestStore(prev=>{
        const exists = prev.favorites.find(x=>x.video_id===v.video_id);
        const favs = exists? prev.favorites.filter(x=>x.video_id!==v.video_id) : [v, ...prev.favorites];
        return { ...prev, favorites: favs };
      });
      setFavorites(prev=>{
        const exists = prev.find(x=>x.video_id===v.video_id);
        return exists? prev.filter(x=>x.video_id!==v.video_id) : [v, ...prev];
      });
    }
  }

  async function createPlaylist(name){
    if(!name?.trim()) return null;
    if(isCloud){
      const { data, error } = await supabase.from("playlists").insert({ name }).select();
      if(error){ alert("Nie udało się utworzyć playlisty (Supabase)."); return null; }
      const pl = data[0]; setPlaylists(p=>[...p, pl]); return pl.id;
    } else {
      const id = crypto.randomUUID();
      const playlist = { id, name, created_at: new Date().toISOString(), items: [] };
      setGuestStore(prev=>({ ...prev, playlists: [...prev.playlists, playlist] }));
      setPlaylists(p=>[...p, { id, name }]);
      return id;
    }
  }

  async function addToPlaylist(playlistId, video){
    const v = toVideoMinimal(video); if(!playlistId) return alert("Wybierz playlistę.");
    if(isCloud){
      const { error } = await supabase.from("playlist_items").insert({ playlist_id: playlistId, ...v });
      if(error) return alert("Nie udało się dodać do playlisty (Supabase).");
      if(playlistId===selectedPlaylistId) loadPlaylistItems(playlistId);
    } else {
      setGuestStore(prev=>{ const pls = prev.playlists.map(p=>{ if(p.id===playlistId && !p.items.find(x=>x.video_id===v.video_id)) p.items.unshift(v); return p; }); return { ...prev, playlists: pls }; });
      if(playlistId===selectedPlaylistId){ const pl = guestStore.playlists.find(p=>p.id===playlistId); setPlaylistItems(pl?.items||[]); }
    }
  }

  async function removeFromPlaylist(playlistId, videoId){
    if(!playlistId||!videoId) return;
    if(isCloud){
      const { error } = await supabase.from("playlist_items").delete().eq("playlist_id", playlistId).eq("video_id", videoId);
      if(error) return alert("Nie udało się usunąć z playlisty (Supabase).");
      if(playlistId===selectedPlaylistId) loadPlaylistItems(playlistId);
    } else {
      setGuestStore(prev=>{ const pls = prev.playlists.map(p=>{ if(p.id===playlistId) p.items = p.items.filter(x=>x.video_id!==videoId); return p; }); return { ...prev, playlists: pls }; });
      if(playlistId===selectedPlaylistId){ const pl = (guestStore.playlists.find(p=>p.id===playlistId))||{items:[]}; setPlaylistItems(pl.items.filter(x=>x.video_id!==videoId)); }
    }
  }

  async function deletePlaylist(playlistId){
    if(!playlistId) return; const ok = confirm("Usunąć całą playlistę? Tej operacji nie można cofnąć.");
    if(!ok) return;
    if(isCloud){
      const { error } = await supabase.from("playlists").delete().eq("id", playlistId);
      if(error) return alert("Nie udało się usunąć playlisty (Supabase).");
      setPlaylists(p=>p.filter(pl=>pl.id!==playlistId));
      if(selectedPlaylistId===playlistId){ setSelectedPlaylistId(null); setPlaylistItems([]); clearQueue(); }
    } else {
      setGuestStore(prev=>{ const pls = prev.playlists.filter(p=>p.id!==playlistId); return { ...prev, playlists: pls }; });
      setPlaylists(p=>p.filter(pl=>pl.id!==playlistId));
      if(selectedPlaylistId===playlistId){ setSelectedPlaylistId(null); setPlaylistItems([]); clearQueue(); }
    }
  }

  async function loadPlaylistItems(playlistId){
    setSelectedPlaylistId(playlistId); if(!playlistId) return setPlaylistItems([]);
    if(isCloud){
      const { data, error } = await supabase.from("playlist_items").select("video_id, title, channel_title, thumbnail_url, added_at").eq("playlist_id", playlistId).order("added_at", { ascending: false });
      if(error) return alert("Nie udało się pobrać elementów playlisty (Supabase).");
      setPlaylistItems(data||[]);
    } else {
      const pl = guestStore.playlists.find(p=>p.id===playlistId); setPlaylistItems(pl?.items||[]);
    }
  }

  function clearQueue(){ setQueue([]); setQueueIndex(0); setQueueLabel(""); }
  function startQueue(items, label){ if(!items||items.length===0) return; setUserInteracted(true); setQueue(items); setQueueIndex(0); setQueueLabel(label||""); setActive(items[0]); }
  function nextInQueue(){ if(queue.length===0) return; const i = Math.min(queueIndex+1, queue.length-1); setQueueIndex(i); setActive(queue[i]); }
  function prevInQueue(){ if(queue.length===0) return; const i = Math.max(queueIndex-1, 0); setQueueIndex(i); setActive(queue[i]); }
  function onEnded(){ if(autoNext && queue.length>0 && queueIndex < queue.length-1){ nextInQueue(); } }

  function handleSelect(video){ setUserInteracted(true); setActive(video); if(queue.length>0){ const idx = queue.findIndex(v=>v.video_id===video.video_id); if(idx>=0) setQueueIndex(idx); }}

  const favoriteIds = new Set(favorites.map(f=>f.video_id));

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      <Header query={query} setQuery={setQuery} onSearch={search} onOpenAccount={()=>setShowAccount(true)} userEmail={user?.email} onSignOut={async()=>{ await (supabase?.auth.signOut()); }} activeTab={activeTab} setActiveTab={setActiveTab}/>

      <main className="max-w-6xl mx-auto px-4 py-6 grid grid-cols-12 gap-6">
        {/* Sidebar */}
        <aside className="col-span-12 lg:col-span-4 flex flex-col gap-4">
          <section className="rounded-lg border border-gray-700 bg-gray-900 p-4">
            <div className="flex items-center justify-between gap-2">
              <h2 className="font-bold text-xl">Playlisty</h2>
              <div className="flex items-center gap-2">
                <button onClick={()=>{ const name = prompt("Nazwa playlisty"); if(name) createPlaylist(name); }} className="text-sm px-3 py-2 rounded-lg border border-gray-700 bg-gray-800 hover:bg-gray-700"><Plus size={14}/></button>
              </div>
            </div>
            <div className="mt-3 space-y-2 max-h-64 overflow-auto pr-1">
              {playlists.length===0 ? (
                <div className="text-sm text-gray-400 flex items-center gap-2"><ListVideo size={16}/> Brak playlist. Utwórz pierwszą.</div>
              ) : (
                playlists.map((pl)=>(
                  <div key={pl.id} className="flex items-center gap-2">
                    <button onClick={()=>loadPlaylistItems(pl.id)} className={`flex-1 text-left px-3 py-2 rounded-lg border border-gray-700 transition-colors ${selectedPlaylistId===pl.id?"bg-gray-800":"bg-gray-900 hover:bg-gray-800"}`}>{pl.name}</button>
                    <button title="Usuń playlistę" onClick={()=>deletePlaylist(pl.id)} className="p-2 rounded-lg border border-gray-700 bg-gray-800 hover:bg-gray-700"><Trash2 size={14}/></button>
                  </div>
                ))
              )}
            </div>
          </section>

          <section className="rounded-lg border border-gray-700 bg-gray-900 p-4">
            <div className="flex items-center justify-between">
              <h2 className="font-bold text-xl">Ulubione</h2>
              <button onClick={()=> startQueue(favorites, "Ulubione") } className="text-sm px-3 py-2 rounded-lg border border-gray-700 bg-gray-800 hover:bg-gray-700 inline-flex items-center gap-2"><Play size={14}/> Odtwórz</button>
            </div>
            <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-80 overflow-auto pr-1">
              {favorites.length===0 ? (
                <div className="text-sm text-gray-400 flex items-center gap-2"><Heart size={16}/> Brak ulubionych.</div>
              ) : (
                favorites.map(v=> (
                  <div key={v.video_id} className="flex gap-3 items-center">
                    <button className="flex-1 flex items-center gap-3 text-left" onClick={()=>handleSelect(v)}>
                      <img src={v.thumbnail_url} className="w-20 h-12 rounded-md object-cover border border-gray-700 hidden md:block"/>
                      <div className="text-sm text-white/90 line-clamp-2">{v.title}</div>
                    </button>
                    <button title="Usuń z ulubionych" onClick={()=>toggleFavorite(v, true)} className="p-2 rounded-lg border border-gray-700 bg-gray-800 hover:bg-gray-700"><Trash2 size={14}/></button>
                  </div>
                ))
              )}
            </div>
          </section>
        </aside>

        {/* Prawa kolumna: player + wyniki */}
        <section className="col-span-12 lg:col-span-8 flex flex-col gap-4">
          <div className="space-y-3">
            <Player videoId={active?.video_id} onEnded={onEnded} userInteracted={userInteracted} onRequireInteract={()=>setUserInteracted(true)} />
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <button onClick={prevInQueue} className="px-3 py-2 rounded-lg border border-gray-700 bg-gray-800 hover:bg-gray-700 inline-flex items-center gap-2"><SkipBack size={16}/> Poprzedni</button>
                <button onClick={nextInQueue} className="px-3 py-2 rounded-lg border border-gray-700 bg-gray-800 hover:bg-gray-700 inline-flex items-center gap-2">Następny <SkipForward size={16}/></button>
                <button onClick={()=>setAutoNext(v=>!v)} className={`px-3 py-2 rounded-lg border ${autoNext?"bg-red-600 border-transparent":"bg-gray-800 border-gray-700 hover:bg-gray-700"} inline-flex items-center gap-2`}><Zap size={16}/> Auto‑następny: {autoNext?"ON":"OFF"}</button>
              </div>
              <div className="text-sm text-gray-400">{queueLabel && queue.length>0 ? `Tryb: ${queueLabel} (${queueIndex+1}/${queue.length})` : "Tryb: ręczny"}</div>
            </div>
          </div>

          {selectedPlaylistId && (
            <div className="rounded-lg border border-gray-700 bg-gray-900 p-4">
              <div className="flex items-center justify-between mb-2">
                <div className="font-bold text-xl">Elementy playlisty</div>
                <button onClick={()=> startQueue(playlistItems, "Playlista") } className="text-sm px-3 py-2 rounded-lg border border-gray-700 bg-gray-800 hover:bg-gray-700 inline-flex items-center gap-2"><Play size={14}/> Odtwórz playlistę</button>
              </div>

              {/* Mobile: lista */}
              <div className="md:hidden divide-y divide-gray-800 border border-gray-800 rounded-lg overflow-hidden">
                {playlistItems.length===0 ? (
                  <div className="p-4 text-sm text-gray-400 flex items-center gap-2"><ListVideo size={16}/> Ta playlista jest pusta.</div>
                ) : (
                  playlistItems.map((v)=> (
                    <div key={v.video_id} className={`w-full flex items-center justify-between px-4 py-3 ${active?.video_id===v.video_id?"bg-gray-800":"bg-gray-900"}`}>
                      <button onClick={()=>handleSelect(v)} className="text-left">
                        <div className="font-medium text-white line-clamp-2">{v.title}</div>
                        <div className="text-xs text-gray-400">{v.channel_title}</div>
                      </button>
                      <button title="Usuń z playlisty" onClick={()=>removeFromPlaylist(selectedPlaylistId, v.video_id)} className="ml-3 p-2 rounded-md border border-gray-700 bg-gray-800 hover:bg-gray-700"><Trash2 size={14}/></button>
                    </div>
                  ))
                )}
              </div>

              {/* Desktop: karty */}
              <div className="hidden md:grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 max-h-72 overflow-auto pr-1 mt-3 md:mt-0">
                {playlistItems.length===0 ? (
                  <div className="text-sm text-gray-400 flex items-center gap-2"><ListVideo size={16}/> Ta playlista jest pusta.</div>
                ) : (
                  playlistItems.map((v)=> (
                    <VideoCard key={v.video_id} video={v} onClick={handleSelect} isActive={active?.video_id===v.video_id} onFavToggle={toggleFavorite} isFavorite={favoriteIds.has(v.video_id)} playlistIdContext={selectedPlaylistId} onRemoveFromPlaylist={removeFromPlaylist}/>
                  ))
                )}
              </div>
            </div>
          )}

          <div className="rounded-lg border border-gray-700 bg-gray-900 p-4">
            <div className="flex items-center justify-between mb-3"><div className="font-bold text-xl">Wyniki wyszukiwania</div>{loading && <div className="text-sm text-gray-400">Szukam...</div>}</div>

            {loading && results.length===0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">{Array.from({length:6}).map((_,i)=><SkeletonCard key={i}/>)}</div>
            ) : (
              <>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {results.map((v)=> (
                    <VideoCard key={v.video_id} video={v} onClick={handleSelect} isActive={active?.video_id===v.video_id} onFavToggle={toggleFavorite} isFavorite={favoriteIds.has(v.video_id)} playlists={playlists} onCreatePlaylist={createPlaylist} onAddToPlaylist={async(id, video)=>{ await addToPlaylist(id, video); }} />
                  ))}
                </div>

                {results.length>0 && (
                  <div className="mt-4 flex items-center justify-center">
                    <button onClick={loadMore} disabled={!nextToken || loading} className={`px-4 py-2 rounded-lg border ${(!nextToken||loading)?"bg-gray-800 border-gray-700 text-gray-400 cursor-not-allowed":"bg-gray-800 hover:bg-gray-700 border-gray-700"}`}>
                      {loading?"Ładowanie...": (nextToken?"Pokaż więcej wyników":"Brak kolejnych wyników")}
                    </button>
                  </div>
                )}

                <div ref={sentinelRef} className="h-1" />
              </>
            )}
          </div>
        </section>
      </main>

      {/* FAB: uruchom grę */}
      <button onClick={()=>setShowGame(true)} className="fixed right-3 bottom-3 z-30 inline-flex items-center gap-2 px-3 py-2 rounded-full bg-red-600 hover:bg-red-700 shadow-lg">
        <Gamepad2 size={18}/> Gra
      </button>

      {/* Modal gry */}
      {showGame && (
        <div className="fixed inset-0 z-[100] bg-black/70 grid place-items-center p-3" onClick={()=>setShowGame(false)}>
          <div className="w-full max-w-3xl h-[70vh] md:h-[80vh] rounded-xl border border-gray-700 bg-gray-900 overflow-hidden shadow-2xl" onClick={(e)=>e.stopPropagation()}>
            <div className="px-4 py-3 border-b border-gray-800 flex items-center justify-between">
              <div className="flex items-center gap-2"><Gamepad2 size={18}/> <b>Pac‑BOX</b></div>
              <button className="px-3 py-1.5 rounded-md bg-gray-800 border border-gray-700 hover:bg-gray-700" onClick={()=>setShowGame(false)}>Zamknij</button>
            </div>
            <PacBoxGame onClose={()=>setShowGame(false)} />
          </div>
        </div>
      )}

      {/* Account modal */}
      {showAccount && (
        <div className="fixed inset-0 z-50 bg-black/50 grid place-items-center p-4" onClick={()=>setShowAccount(false)}>
          <div className="w-full max-w-md bg-gray-900 text-white rounded-lg border border-gray-700 shadow-xl" onClick={(e)=>e.stopPropagation()}>
            <div className="p-4 border-b border-gray-700 flex items-center justify-between"><div className="font-semibold text-xl">Konto</div><button className="px-3 py-2 rounded-lg border border-gray-700 bg-gray-800 hover:bg-gray-700" onClick={()=>setShowAccount(false)}>Zamknij</button></div>
            <div className="p-6">
              {supabase ? (
                user ? (
                  <div className="rounded-lg border border-gray-700 p-4 bg-gray-800">
                    <div className="text-sm text-gray-400">Zalogowano jako</div>
                    <div className="font-medium">{user.email}</div>
                    <button className="mt-3 px-3 py-2 rounded-lg border border-gray-700 bg-gray-900 hover:bg-gray-800 flex items-center gap-2" onClick={async()=>{ await supabase.auth.signOut(); setShowAccount(false); }}><LogOut size={16}/> Wyloguj</button>
                  </div>
                ) : (
                  <AuthPanel supabase={supabase} authView={authView} setAuthView={setAuthView}/>
                )
              ) : (
                <div className="text-sm text-gray-300">Logowanie nieaktywne: dodaj env <code>VITE_SUPABASE_URL</code> i <code>VITE_SUPABASE_ANON_KEY</code> w Netlify i zrób redeploy.</div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function AuthPanel({ supabase, authView, setAuthView }){
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  async function submit(){
    setLoading(true); setMessage("");
    try{
      if(authView==="signup"){ const { error } = await supabase.auth.signUp({ email, password }); if(error) throw error; setMessage("Konto utworzone. Sprawdź mail i zaloguj się."); setAuthView("signin"); }
      else { const { error } = await supabase.auth.signInWithPassword({ email, password }); if(error) throw error; }
    }catch(e){ setMessage(e.message||"Błąd logowania/rejestracji."); }
    finally{ setLoading(false); }
  }
  return (
    <div className="rounded-lg border border-gray-700 p-4 bg-gray-800">
      <div className="flex items-center gap-2 mb-3">
        <button className={`px-3 py-2 rounded-lg border border-gray-700 ${authView==="signin"?"bg-red-600":"bg-gray-900 hover:bg-gray-800"}`} onClick={()=>setAuthView("signin")}>Logowanie</button>
        <button className={`px-3 py-2 rounded-lg border border-gray-700 ${authView==="signup"?"bg-red-600":"bg-gray-900 hover:bg-gray-800"}`} onClick={()=>setAuthView("signup")}>Rejestracja</button>
      </div>
      <label className="text-sm text-gray-400">Email</label>
      <input className="mt-1 w-full px-3 py-3 rounded-lg border border-gray-700 bg-gray-900 text-white placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-red-600" value={email} onChange={(e)=>setEmail(e.target.value)} placeholder="you@example.com"/>
      <label className="text-sm text-gray-400 mt-2 block">Hasło</label>
      <input className="mt-1 w-full px-3 py-3 rounded-lg border border-gray-700 bg-gray-900 text-white placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-red-600" type="password" value={password} onChange={(e)=>setPassword(e.target.value)} placeholder="••••••••"/>
      {message ? <div className="mt-2 text-sm text-gray-300">{message}</div> : null}
      <button disabled={loading} onClick={submit} className="mt-3 w-full px-3 py-3 rounded-lg bg-red-600 hover:bg-red-700 disabled:opacity-60">{authView==="signup"?"Utwórz konto":"Zaloguj"}</button>
    </div>
  );
}
