import React, { useEffect, useMemo, useState } from "react";
import { createClient } from "@supabase/supabase-js";
import { Search, Heart, Play, User, LogOut, Settings as SettingsIcon, ListVideo, Star, Film } from "lucide-react";

// BOXTOX PLAYER — Dark redesign + PUBLIC AUTH (email signup for everyone)
// - Każdy użytkownik może utworzyć konto (email/hasło) i mieć playlisty/ulubione w chmurze.
// - Goście (bez logowania) mają LocalStorage.
// - Wyszukiwanie YT przez Netlify Function (/.netlify/functions/youtube-search) — klucz po stronie serwera.
// - Mobile UX: elementy playlisty = prosta lista bez miniaturek (< md), karty z miniaturami (>= md).
//
// ENV (Netlify → Environment variables):
//   YT_API_KEY               — klucz do YouTube Data API v3 (SERWER, bez VITE_)
//   VITE_SUPABASE_URL        — URL Supabase (public)
//   VITE_SUPABASE_ANON_KEY   — anon key Supabase (public)

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || "";
const SUPABASE_ANON = import.meta.env.VITE_SUPABASE_ANON_KEY || "";

const LS_GUEST_KEY = "boxtox.guest.publicauth.v1";

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
    try {
      const raw = localStorage.getItem(LS_GUEST_KEY);
      return raw ? JSON.parse(raw) : { favorites: [], playlists: [] };
    } catch { return { favorites: [], playlists: [] }; }
  });
  useEffect(() => { localStorage.setItem(LS_GUEST_KEY, JSON.stringify(store)); }, [store]);
  return [store, setStore];
}

function Header({ onSearch, query, setQuery, onOpenAccount, userEmail, onSignOut, activeTab, setActiveTab }) {
  return (
    <div className="w-full sticky top-0 z-40 bg-gray-900/90 backdrop-blur border-b border-gray-700">
      <div className="max-w-6xl mx-auto px-4 h-16 flex items-center gap-4">
        {/* Logo */}
        <div className="flex items-center gap-2">
          <div className="w-9 h-9 rounded-lg bg-red-600 grid place-items-center font-extrabold text-white">B</div>
          <div className="font-extrabold tracking-tight text-white text-xl">BOXTOX <span className="text-gray-400">PLAYER</span></div>
        </div>

        {/* Nawigacja */}
        <nav className="hidden md:flex items-center gap-2 ml-2">
          {[
            { key: "browse", label: "Przeglądaj", icon: <ListVideo size={16} /> },
            { key: "favorites", label: "Ulubione", icon: <Star size={16} /> },
            { key: "playlists", label: "Playlisty", icon: <Film size={16} /> },
          ].map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors border border-transparent ${
                activeTab === tab.key ? "bg-red-600 text-white" : "bg-gray-800 text-gray-300 hover:bg-gray-700"
              }`}
            >
              {tab.icon}
              {tab.label}
            </button>
          ))}
        </nav>

        <div className="flex-1" />

        {/* Wyszukiwarka */}
        <div className="relative w-full max-w-2xl">
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && onSearch()}
            placeholder="Szukaj na YouTube..."
            className="w-full pl-4 pr-11 py-3 rounded-lg border border-gray-700 bg-gray-800 text-white placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-red-600"
          />
          <button onClick={onSearch} className="absolute right-2 top-1/2 -translate-y-1/2 p-2 rounded-md bg-gray-800 hover:bg-gray-700 border border-gray-700">
            <Search size={20} className="text-gray-300" />
          </button>
        </div>

        <div className="flex-1" />

        {/* Konto */}
        <div className="flex items-center gap-2">
          {userEmail ? (
            <>
              <div className="hidden lg:block text-sm text-gray-300">{userEmail}</div>
              <button onClick={onSignOut} className="px-3 py-2 rounded-lg border border-gray-700 bg-gray-800 text-gray-200 hover:bg-gray-700 flex items-center gap-2">
                <LogOut size={16} />
                <span className="hidden sm:inline">Wyloguj</span>
              </button>
            </>
          ) : (
            <button onClick={onOpenAccount} className="px-3 py-2 rounded-lg border border-gray-700 bg-gray-800 text-gray-200 hover:bg-gray-700 flex items-center gap-2">
              <User size={16} /> Zaloguj / Rejestracja
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function VideoCard({ video, onClick, isActive, onFav, isFavorite }) {
  return (
    <div
      className={`rounded-lg border border-gray-700 overflow-hidden bg-gray-800 hover:bg-gray-700 transition-colors cursor-pointer ${
        isActive ? "ring-2 ring-red-600/60" : ""
      }`}
      onClick={() => onClick(video)}
    >
      <div className="relative group">
        <img src={video.thumbnail_url} alt={video.title} className="w-full aspect-video object-cover" />
        {/* Overlay + Play */}
        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/50 transition-colors grid place-items-center">
          <div className="w-16 h-16 rounded-full bg-white/90 grid place-items-center shadow-md opacity-0 group-hover:opacity-100 transition-opacity">
            <Play className="text-gray-900" size={28} />
          </div>
        </div>
      </div>
      <div className="p-4">
        <div className="font-semibold text-white line-clamp-2 leading-tight">{video.title}</div>
        <div className="text-sm text-gray-400 mt-1">{video.channel_title}</div>
        <div className="mt-3 flex items-center justify-between">
          <button
            onClick={(e) => { e.stopPropagation(); onFav(video); }}
            className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border border-gray-700 bg-gray-800 hover:bg-gray-700 text-sm"
          >
            <Heart size={16} className={isFavorite ? "text-red-500 fill-red-500" : "text-gray-400"} />
            {isFavorite ? "W ulubionych" : "Ulubione"}
          </button>
          <div className="text-xs text-gray-500">{video.publishedAt ? new Date(video.publishedAt).toLocaleDateString() : ""}</div>
        </div>
      </div>
    </div>
  );
}

function Player({ videoId }) {
  if (!videoId) return (
    <div className="w-full aspect-video grid place-items-center border border-dashed border-gray-700 rounded-xl bg-gray-900">
      <div className="flex flex-col items-center gap-2 text-gray-400">
        <Film size={48} />
        <div>Wybierz film, aby odtworzyć</div>
      </div>
    </div>
  );
  return (
    <div className="w-full aspect-video rounded-xl overflow-hidden border border-gray-700 bg-gray-900">
      <iframe
        className="w-full h-full"
        src={`https://www.youtube.com/embed/${videoId}?autoplay=1`}
        title="YouTube video player"
        frameBorder="0"
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
        allowFullScreen
      />
    </div>
  );
}

function SkeletonCard() {
  return (
    <div className="rounded-lg border border-gray-700 overflow-hidden bg-gray-800 animate-pulse">
      <div className="w-full aspect-video bg-gray-700" />
      <div className="p-4 space-y-2">
        <div className="h-4 bg-gray-700 rounded w-3/4" />
        <div className="h-3 bg-gray-700 rounded w-1/2" />
      </div>
    </div>
  );
}

export default function App() {
  const { supabase, user } = useSupabase();
  const [guestStore, setGuestStore] = useGuestStore();

  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [active, setActive] = useState(null);

  const [showAccount, setShowAccount] = useState(false);
  const [authView, setAuthView] = useState("signin");
  const [activeTab, setActiveTab] = useState("browse");

  // Cloud state
  const [favorites, setFavorites] = useState([]);
  const [playlists, setPlaylists] = useState([]);
  const [selectedPlaylistId, setSelectedPlaylistId] = useState(null);
  const [playlistItems, setPlaylistItems] = useState([]);

  const isCloud = !!(supabase && user); // każdy zalogowany korzysta z chmury

  // Load data
  useEffect(() => {
    if (!isCloud) {
      setFavorites(guestStore.favorites || []);
      setPlaylists(guestStore.playlists || []);
      setPlaylistItems([]);
      setSelectedPlaylistId(null);
      return;
    }
    (async () => {
      const { data: favs } = await supabase
        .from("favorites")
        .select("video_id, title, channel_title, thumbnail_url, created_at")
        .order("created_at", { ascending: false });
      setFavorites(favs || []);
      const { data: pls } = await supabase
        .from("playlists")
        .select("id, name, created_at")
        .order("created_at", { ascending: true });
      setPlaylists(pls || []);
      setPlaylistItems([]);
      setSelectedPlaylistId(null);
    })();
  }, [isCloud]);

  async function search() {
    if (!query.trim()) return;
    setLoading(true);
    try {
      const res = await fetch(`/.netlify/functions/youtube-search?q=${encodeURIComponent(query)}`);
      if (!res.ok) throw new Error("YouTube search failed");
      const data = await res.json();
      const items = (data.items || []).filter((v) => v.video_id);
      setResults(items);
      if (items.length) setActive(items[0]);
      setActiveTab("browse");
    } catch (e) {
      console.error(e);
      alert("Błąd wyszukiwania. Skontaktuj się z administratorem.");
    } finally {
      setLoading(false);
    }
  }

  function toVideoMinimal(video) {
    return { video_id: video.video_id, title: video.title, channel_title: video.channel_title, thumbnail_url: video.thumbnail_url };
  }

  async function addToFavorites(video) {
    const v = toVideoMinimal(video);
    if (isCloud) {
      const { error } = await supabase.from("favorites").upsert(v);
      if (error) return alert("Nie udało się dodać do Ulubionych (Supabase).");
      setFavorites((prev) => (prev.find((x) => x.video_id === v.video_id) ? prev : [v, ...prev]));
    } else {
      setGuestStore((prev) => {
        const exists = prev.favorites.find((x) => x.video_id === v.video_id);
        const favs = exists ? prev.favorites : [v, ...prev.favorites];
        return { ...prev, favorites: favs };
      });
      setFavorites((prev) => (prev.find((x) => x.video_id === v.video_id) ? prev : [v, ...prev]));
    }
  }

  async function createPlaylist(name) {
    if (!name?.trim()) return;
    if (isCloud) {
      const { data, error } = await supabase.from("playlists").insert({ name }).select();
      if (error) return alert("Nie udało się utworzyć playlisty (Supabase).");
      setPlaylists((p) => [...p, data[0]]);
    } else {
      const id = crypto.randomUUID();
      setGuestStore((prev) => ({ ...prev, playlists: [...prev.playlists, { id, name, created_at: new Date().toISOString(), items: [] }] }));
      setPlaylists((p) => [...p, { id, name }]);
    }
  }

  async function addToPlaylist(playlistId, video) {
    const v = toVideoMinimal(video);
    if (!playlistId) return alert("Wybierz playlistę.");
    if (isCloud) {
      const { error } = await supabase.from("playlist_items").insert({ playlist_id: playlistId, ...v });
      if (error) return alert("Nie udało się dodać do playlisty (Supabase).");
      if (playlistId === selectedPlaylistId) loadPlaylistItems(playlistId);
    } else {
      setGuestStore((prev) => {
        const pls = prev.playlists.map((p) => {
          if (p.id === playlistId && !p.items.find((x) => x.video_id === v.video_id)) p.items.unshift(v);
          return p;
        });
        return { ...prev, playlists: pls };
      });
      if (playlistId === selectedPlaylistId) {
        const pl = guestStore.playlists.find((p) => p.id === playlistId);
        setPlaylistItems(pl?.items || []);
      }
    }
  }

  async function loadPlaylistItems(playlistId) {
    setSelectedPlaylistId(playlistId);
    if (!playlistId) return setPlaylistItems([]);
    if (isCloud) {
      const { data, error } = await supabase
        .from("playlist_items")
        .select("video_id, title, channel_title, thumbnail_url, added_at")
        .eq("playlist_id", playlistId)
        .order("added_at", { ascending: false });
      if (error) return alert("Nie udało się pobrać elementów playlisty (Supabase).");
      setPlaylistItems(data || []);
    } else {
      const pl = guestStore.playlists.find((p) => p.id === playlistId);
      setPlaylistItems(pl?.items || []);
    }
  }

  async function signOut() { if (supabase) await supabase.auth.signOut(); }

  const favoriteIds = new Set(favorites.map((f) => f.video_id));

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      <Header
        query={query}
        setQuery={setQuery}
        onSearch={search}
        onOpenAccount={() => setShowAccount(true)}
        userEmail={user?.email}
        onSignOut={signOut}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
      />

      <main className="max-w-6xl mx-auto px-4 py-6 grid grid-cols-12 gap-6">
        {/* Sidebar */}
        <aside className="col-span-12 lg:col-span-4 flex flex-col gap-4">
          <section className="rounded-lg border border-gray-700 bg-gray-900 p-4">
            <div className="flex items-center justify-between">
              <h2 className="font-bold text-xl">Playlisty</h2>
              <button
                onClick={() => { const name = prompt("Nazwa playlisty"); if (name) createPlaylist(name); }}
                className="text-sm px-3 py-2 rounded-lg border border-gray-700 bg-gray-800 hover:bg-gray-700"
              >+ Nowa</button>
            </div>
            <div className="mt-3 space-y-2 max-h-64 overflow-auto pr-1">
              {playlists.length === 0 ? (
                <div className="text-sm text-gray-400 flex items-center gap-2"><ListVideo size={16} /> Brak playlist. Utwórz pierwszą.</div>
              ) : (
                playlists.map((pl) => (
                  <button key={pl.id} onClick={() => loadPlaylistItems(pl.id)} className={`w-full text-left px-3 py-2 rounded-lg border border-gray-700 transition-colors ${selectedPlaylistId === pl.id ? "bg-gray-800" : "bg-gray-900 hover:bg-gray-800"}`}>{pl.name}</button>
                ))
              )}
            </div>
            <div className="mt-4">
              <label className="text-sm text-gray-400">Dodaj aktywny film do:</label>
              <div className="mt-2 flex items-center gap-2">
                <select className="flex-1 px-3 py-2 rounded-lg border border-gray-700 bg-gray-800 focus:outline-none focus:ring-2 focus:ring-red-600" value={selectedPlaylistId || ""} onChange={(e) => setSelectedPlaylistId(e.target.value || null)}>
                  <option value="">— wybierz playlistę —</option>
                  {playlists.map((pl) => (<option value={pl.id} key={pl.id}>{pl.name}</option>))}
                </select>
                <button onClick={() => active && addToPlaylist(selectedPlaylistId, active)} className="px-3 py-2 rounded-lg border border-gray-700 bg-gray-800 hover:bg-gray-700">Dodaj</button>
              </div>
            </div>
          </section>

          <section className="rounded-lg border border-gray-700 bg-gray-900 p-4">
            <div className="flex items-center justify-between"><h2 className="font-bold text-xl">Ulubione</h2></div>
            <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-80 overflow-auto pr-1">
              {favorites.length === 0 ? (
                <div className="text-sm text-gray-400 flex items-center gap-2"><Heart size={16} /> Brak ulubionych.</div>
              ) : (
                favorites.map((v) => (
                  <div key={v.video_id} className="flex gap-3 items-center cursor-pointer" onClick={() => setActive(v)}>
                    <img src={v.thumbnail_url} className="w-20 h-12 rounded-md object-cover border border-gray-700 hidden md:block" />
                    <div className="text-sm text-white/90 line-clamp-2">{v.title}</div>
                  </div>
                ))
              )}
            </div>
          </section>
        </aside>

        {/* Right: player + results */}
        <section className="col-span-12 lg:col-span-8 flex flex-col gap-4">
          <Player videoId={active?.video_id} />

          {selectedPlaylistId && (
            <div className="rounded-lg border border-gray-700 bg-gray-900 p-4">
              <div className="font-bold text-xl mb-2">Elementy playlisty</div>

              {/* Mobile: prosta lista bez miniaturek */}
              <div className="md:hidden divide-y divide-gray-800 border border-gray-800 rounded-lg overflow-hidden">
                {playlistItems.length === 0 ? (
                  <div className="p-4 text-sm text-gray-400 flex items-center gap-2"><ListVideo size={16} /> Ta playlista jest pusta.</div>
                ) : (
                  playlistItems.map((v) => (
                    <button key={v.video_id} onClick={() => setActive(v)} className={`w-full text-left px-4 py-3 hover:bg-gray-800 ${active?.video_id === v.video_id ? "bg-gray-800" : "bg-gray-900"}`}>
                      <div className="font-medium text-white line-clamp-2">{v.title}</div>
                      <div className="text-xs text-gray-400">{v.channel_title}</div>
                    </button>
                  ))
                )}
              </div>

              {/* Desktop: karty z miniaturami */}
              <div className="hidden md:grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 max-h-72 overflow-auto pr-1 mt-3 md:mt-0">
                {playlistItems.length === 0 ? (
                  <div className="text-sm text-gray-400 flex items-center gap-2"><ListVideo size={16} /> Ta playlista jest pusta.</div>
                ) : (
                  playlistItems.map((v) => (
                    <VideoCard key={v.video_id} video={v} onClick={setActive} isActive={active?.video_id === v.video_id} onFav={addToFavorites} isFavorite={favoriteIds.has(v.video_id)} />
                  ))
                )}
              </div>
            </div>
          )}

          <div className="rounded-lg border border-gray-700 bg-gray-900 p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="font-bold text-xl">Wyniki wyszukiwania</div>
              {loading && <div className="text-sm text-gray-400">Szukam...</div>}
            </div>
            {loading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {Array.from({ length: 6 }).map((_, i) => <SkeletonCard key={i} />)}
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {results.map((v) => (
                  <VideoCard key={v.video_id} video={v} onClick={setActive} isActive={active?.video_id === v.video_id} onFav={addToFavorites} isFavorite={favoriteIds.has(v.video_id)} />
                ))}
                {results.length === 0 && (
                  <div className="w-full py-10 grid place-items-center text-gray-400">
                    <div className="flex flex-col items-center gap-3">
                      <Search size={48} />
                      <div>Wpisz zapytanie, aby zobaczyć wyniki.</div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </section>
      </main>

      {/* ACCOUNT MODAL (public) */}
      {showAccount && (
        <div className="fixed inset-0 z-50 bg-black/50 grid place-items-center p-4" onClick={() => setShowAccount(false)}>
          <div className="w-full max-w-md bg-gray-900 text-white rounded-lg border border-gray-700 shadow-xl" onClick={(e) => e.stopPropagation()}>
            <div className="p-4 border-b border-gray-700 flex items-center justify-between">
              <div className="font-semibold text-xl">Konto</div>
              <button className="px-3 py-2 rounded-lg border border-gray-700 bg-gray-800 hover:bg-gray-700" onClick={() => setShowAccount(false)}>Zamknij</button>
            </div>
            <div className="p-6">
              {supabase ? (
                user ? (
                  <div className="rounded-lg border border-gray-700 p-4 bg-gray-800">
                    <div className="text-sm text-gray-400">Zalogowano jako</div>
                    <div className="font-medium">{user.email}</div>
                    <button className="mt-3 px-3 py-2 rounded-lg border border-gray-700 bg-gray-900 hover:bg-gray-800 flex items-center gap-2" onClick={async () => { await supabase.auth.signOut(); setShowAccount(false); }}>
                      <LogOut size={16} /> Wyloguj
                    </button>
                  </div>
                ) : (
                  <AuthPanel supabase={supabase} authView={authView} setAuthView={setAuthView} />
                )
              ) : (
                <div className="text-sm text-gray-300">
                  Logowanie nieaktywne: dodaj env <code>VITE_SUPABASE_URL</code> i <code>VITE_SUPABASE_ANON_KEY</code> w Netlify i zrób redeploy.
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function AuthPanel({ supabase, authView, setAuthView }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  async function submit() {
    setLoading(true); setMessage("");
    try {
      if (authView === "signup") {
        const { error } = await supabase.auth.signUp({ email, password });
        if (error) throw error;
        setMessage("Konto utworzone. Sprawdź mail i zaloguj się.");
        setAuthView("signin");
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
      }
    } catch (e) { setMessage(e.message || "Błąd logowania/rejestracji."); }
    finally { setLoading(false); }
  }

  return (
    <div className="rounded-lg border border-gray-700 p-4 bg-gray-800">
      <div className="flex items-center gap-2 mb-3">
        <button className={`px-3 py-2 rounded-lg border border-gray-700 ${authView === "signin" ? "bg-red-600" : "bg-gray-900 hover:bg-gray-800"}`} onClick={() => setAuthView("signin")}>Logowanie</button>
        <button className={`px-3 py-2 rounded-lg border border-gray-700 ${authView === "signup" ? "bg-red-600" : "bg-gray-900 hover:bg-gray-800"}`} onClick={() => setAuthView("signup")}>Rejestracja</button>
      </div>
      <label className="text-sm text-gray-400">Email</label>
      <input className="mt-1 w-full px-3 py-3 rounded-lg border border-gray-700 bg-gray-900 text-white placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-red-600" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" />
      <label className="text-sm text-gray-400 mt-2 block">Hasło</label>
      <input className="mt-1 w-full px-3 py-3 rounded-lg border border-gray-700 bg-gray-900 text-white placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-red-600" type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" />
      {message ? <div className="mt-2 text-sm text-gray-300">{message}</div> : null}
      <button disabled={loading} onClick={submit} className="mt-3 w-full px-3 py-3 rounded-lg bg-red-600 hover:bg-red-700 disabled:opacity-60">{authView === "signup" ? "Utwórz konto" : "Zaloguj"}</button>
    </div>
  );
}
