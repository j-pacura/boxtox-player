import React, { useEffect, useMemo, useState } from "react";
import { createClient } from "@supabase/supabase-js";
import { Search, Heart, Play, User, LogOut, Settings as SettingsIcon, ListVideo, Star, Film } from "lucide-react";

// BOXTOX PLAYER — Dark/Netflix-style redesign ⭐
// - Paleta (Tailwind):
//   tło główne: bg-gray-950, sekcje: bg-gray-900, karty: bg-gray-800
//   tekst: text-white / text-gray-400, akcent: bg-red-600 hover:bg-red-700
// - Ikony: lucide-react
// - Line clamp: @tailwindcss/line-clamp (zainstaluj i dodaj do tailwind.config.js)
// - Zachowana funkcjonalność: wyszukiwarka YT, odtwarzacz, ulubione, playlisty, Supabase auth

const LS_SETTINGS_KEY = "boxtox.settings.v1";
const LS_GUEST_KEY = "boxtox.guest.v1";

function useLocalSettings() {
  const [settings, setSettings] = useState(() => {
    try {
      const raw = localStorage.getItem(LS_SETTINGS_KEY);
      return raw ? JSON.parse(raw) : { youtubeApiKey: "", supabaseUrl: "", supabaseAnonKey: "" };
    } catch (e) {
      return { youtubeApiKey: "", supabaseUrl: "", supabaseAnonKey: "" };
    }
  });
  useEffect(() => {
    localStorage.setItem(LS_SETTINGS_KEY, JSON.stringify(settings));
  }, [settings]);
  return [settings, setSettings];
}

function useSupabase(settings) {
  const supabase = useMemo(() => {
    if (settings.supabaseUrl && settings.supabaseAnonKey) {
      try {
        return createClient(settings.supabaseUrl, settings.supabaseAnonKey);
      } catch (e) {
        console.warn("Supabase init error", e);
        return null;
      }
    }
    return null;
  }, [settings.supabaseUrl, settings.supabaseAnonKey]);

  const [user, setUser] = useState(null);

  useEffect(() => {
    let sub;
    (async () => {
      if (!supabase) {
        setUser(null);
        return;
      }
      const { data } = await supabase.auth.getSession();
      setUser(data?.session?.user ?? null);
      sub = supabase.auth.onAuthStateChange((_event, session) => {
        setUser(session?.user ?? null);
      });
    })();
    return () => {
      if (sub && typeof sub.unsubscribe === "function") sub.unsubscribe();
    };
  }, [supabase]);

  return { supabase, user };
}

function useGuestStore() {
  const [store, setStore] = useState(() => {
    try {
      const raw = localStorage.getItem(LS_GUEST_KEY);
      return raw ? JSON.parse(raw) : { favorites: [], playlists: [] };
    } catch (e) {
      return { favorites: [], playlists: [] };
    }
  });
  useEffect(() => {
    localStorage.setItem(LS_GUEST_KEY, JSON.stringify(store));
  }, [store]);
  return [store, setStore];
}

function Header({ onSearch, query, setQuery, onOpenSettings, userEmail, onSignOut, activeTab, setActiveTab }) {
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

        {/* Użytkownik / Ustawienia */}
        <div className="flex items-center gap-2">
          <button onClick={onOpenSettings} className="px-3 py-2 rounded-lg border border-gray-700 bg-gray-800 text-gray-200 hover:bg-gray-700 flex items-center gap-2">
            <SettingsIcon size={16} />
            <span className="hidden sm:inline">Ustawienia</span>
          </button>
          {userEmail ? (
            <div className="ml-1 flex items-center gap-2">
              <div className="text-sm text-gray-300 hidden lg:block">{userEmail}</div>
              <button onClick={onSignOut} className="px-3 py-2 rounded-lg border border-gray-700 bg-gray-800 text-gray-200 hover:bg-gray-700 flex items-center gap-2">
                <LogOut size={16} />
                <span className="hidden sm:inline">Wyloguj</span>
              </button>
            </div>
          ) : (
            <div className="text-gray-400 text-sm flex items-center gap-1"><User size={16} /> Gość</div>
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
      <div className="relative">
        <img src={video.thumbnail_url} alt={video.title} className="w-full aspect-video object-cover" />
        {/* Overlay + Play */}
        <div className="absolute inset-0 bg-black/0 hover:bg-black/50 transition-colors grid place-items-center">
          <div className="opacity-0 group-hover:opacity-100"></div>
          <div className="w-16 h-16 rounded-full bg-white/90 grid place-items-center shadow-md">
            <Play className="text-gray-900" size={28} />
          </div>
        </div>
      </div>
      <div className="p-4">
        <div className="font-semibold text-white line-clamp-2 leading-tight">{video.title}</div>
        <div className="text-sm text-gray-400 mt-1">{video.channel_title}</div>
        <div className="mt-3 flex items-center justify-between">
          <button
            onClick={(e) => {
              e.stopPropagation();
              onFav(video);
            }}
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
  const [settings, setSettings] = useLocalSettings();
  const { supabase, user } = useSupabase(settings);
  const [guestStore, setGuestStore] = useGuestStore();

  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [active, setActive] = useState(null); // current video object

  const [showSettings, setShowSettings] = useState(false);
  const [authView, setAuthView] = useState("signin"); // signin | signup
  const [activeTab, setActiveTab] = useState("browse");

  // Cloud state
  const [favorites, setFavorites] = useState([]);
  const [playlists, setPlaylists] = useState([]);
  const [selectedPlaylistId, setSelectedPlaylistId] = useState(null);
  const [playlistItems, setPlaylistItems] = useState([]);

  const isCloud = !!(supabase && user);

  // Load cloud data
  useEffect(() => {
    if (!supabase || !user) {
      // Local
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
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });
      setFavorites(favs || []);
      const { data: pls } = await supabase
        .from("playlists")
        .select("id, name, created_at")
        .eq("user_id", user.id)
        .order("created_at", { ascending: true });
      setPlaylists(pls || []);
      setPlaylistItems([]);
      setSelectedPlaylistId(null);
    })();
  }, [supabase, user]);

  async function search() {
    if (!settings.youtubeApiKey) {
      alert("Dodaj YouTube API Key w Ustawieniach.");
      return;
    }
    if (!query.trim()) return;
    setLoading(true);
    try {
      const url = new URL("https://www.googleapis.com/youtube/v3/search");
      url.searchParams.set("part", "snippet");
      url.searchParams.set("type", "video");
      url.searchParams.set("maxResults", "24");
      url.searchParams.set("q", query);
      url.searchParams.set("key", settings.youtubeApiKey);
      const res = await fetch(url.toString());
      if (!res.ok) throw new Error("YouTube API error");
      const data = await res.json();
      const items = (data.items || [])
        .map((it) => ({
          video_id: it.id?.videoId,
          title: it.snippet?.title,
          channel_title: it.snippet?.channelTitle,
          thumbnail_url: it.snippet?.thumbnails?.medium?.url || it.snippet?.thumbnails?.high?.url,
          publishedAt: it.snippet?.publishedAt,
        }))
        .filter((v) => v.video_id);
      setResults(items);
      if (items.length) setActive(items[0]);
      setActiveTab("browse");
    } catch (e) {
      console.error(e);
      alert("Błąd podczas wyszukiwania. Sprawdź klucz API.");
    } finally {
      setLoading(false);
    }
  }

  function toVideoMinimal(video) {
    return {
      video_id: video.video_id,
      title: video.title,
      channel_title: video.channel_title,
      thumbnail_url: video.thumbnail_url,
    };
  }

  async function addToFavorites(video) {
    const v = toVideoMinimal(video);
    if (isCloud) {
      const { error } = await supabase.from("favorites").upsert({ user_id: user.id, ...v });
      if (error) {
        alert("Nie udało się dodać do Ulubionych (Supabase).");
        return;
      }
      setFavorites((prev) => {
        if (prev.find((x) => x.video_id === v.video_id)) return prev;
        return [v, ...prev];
      });
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
      const { data, error } = await supabase.from("playlists").insert({ user_id: user.id, name }).select();
      if (error) return alert("Nie udało się utworzyć playlisty (Supabase).");
      setPlaylists((p) => [...p, data[0]]);
    } else {
      const id = crypto.randomUUID();
      setGuestStore((prev) => {
        const playlist = { id, name, created_at: new Date().toISOString(), items: [] };
        return { ...prev, playlists: [...prev.playlists, playlist] };
      });
      setPlaylists((p) => [...p, { id, name }]);
    }
  }

  async function addToPlaylist(playlistId, video) {
    const v = toVideoMinimal(video);
    if (!playlistId) return alert("Wybierz playlistę.");
    if (isCloud) {
      const { error } = await supabase.from("playlist_items").insert({ playlist_id: playlistId, user_id: user.id, ...v });
      if (error) return alert("Nie udało się dodać do playlisty (Supabase).");
      if (playlistId === selectedPlaylistId) {
        loadPlaylistItems(playlistId);
      }
    } else {
      setGuestStore((prev) => {
        const pls = prev.playlists.map((p) => {
          if (p.id === playlistId) {
            if (!p.items.find((x) => x.video_id === v.video_id)) p.items.unshift(v);
          }
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
        .eq("user_id", user.id)
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
        onOpenSettings={() => setShowSettings(true)}
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
                onClick={() => {
                  const name = prompt("Nazwa playlisty");
                  if (name) createPlaylist(name);
                }}
                className="text-sm px-3 py-2 rounded-lg border border-gray-700 bg-gray-800 hover:bg-gray-700"
              >+ Nowa</button>
            </div>
            <div className="mt-3 space-y-2 max-h-64 overflow-auto pr-1">
              {playlists.length === 0 ? (
                <div className="text-sm text-gray-400 flex items-center gap-2"><ListVideo size={16} /> Brak playlist. Utwórz pierwszą.</div>
              ) : (
                playlists.map((pl) => (
                  <button
                    key={pl.id}
                    onClick={() => loadPlaylistItems(pl.id)}
                    className={`w-full text-left px-3 py-2 rounded-lg border border-gray-700 transition-colors ${selectedPlaylistId === pl.id ? "bg-gray-800" : "bg-gray-900 hover:bg-gray-800"}`}
                  >{pl.name}</button>
                ))
              )}
            </div>
            <div className="mt-4">
              <label className="text-sm text-gray-400">Dodaj aktywny film do:</label>
              <div className="mt-2 flex items-center gap-2">
                <select
                  className="flex-1 px-3 py-2 rounded-lg border border-gray-700 bg-gray-800 focus:outline-none focus:ring-2 focus:ring-red-600"
                  value={selectedPlaylistId || ""}
                  onChange={(e) => setSelectedPlaylistId(e.target.value || null)}
                >
                  <option value="">— wybierz playlistę —</option>
                  {playlists.map((pl) => (
                    <option value={pl.id} key={pl.id}>{pl.name}</option>
                  ))}
                </select>
                <button
                  onClick={() => active && addToPlaylist(selectedPlaylistId, active)}
                  className="px-3 py-2 rounded-lg border border-gray-700 bg-gray-800 hover:bg-gray-700"
                >Dodaj</button>
              </div>
            </div>
          </section>

          <section className="rounded-lg border border-gray-700 bg-gray-900 p-4">
            <div className="flex items-center justify-between">
              <h2 className="font-bold text-xl">Ulubione</h2>
            </div>
            <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-80 overflow-auto pr-1">
              {favorites.length === 0 ? (
                <div className="text-sm text-gray-400 flex items-center gap-2"><Heart size={16} /> Brak ulubionych.</div>
              ) : (
                favorites.map((v) => (
                  <div key={v.video_id} className="flex gap-3 items-center cursor-pointer" onClick={() => setActive(v)}>
                    <img src={v.thumbnail_url} className="w-20 h-12 rounded-md object-cover border border-gray-700" />
                    <div className="text-sm line-clamp-2 text-white/90">{v.title}</div>
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
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 max-h-72 overflow-auto pr-1">
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
                      <button onClick={() => document.querySelector('input[placeholder="Szukaj na YouTube..."]').focus()} className="mt-1 px-4 py-3 rounded-lg bg-red-600 hover:bg-red-700">Przejdź do wyszukiwarki</button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </section>
      </main>

      {/* SETTINGS & AUTH MODAL */}
      {showSettings && (
        <div className="fixed inset-0 z-50 bg-black/50 grid place-items-center p-4" onClick={() => setShowSettings(false)}>
          <div className="w-full max-w-2xl bg-gray-900 text-white rounded-lg border border-gray-700 shadow-xl" onClick={(e) => e.stopPropagation()}>
            <div className="p-4 border-b border-gray-700 flex items-center justify-between">
              <div className="font-semibold text-xl">Ustawienia & Konto</div>
              <button className="px-3 py-2 rounded-lg border border-gray-700 bg-gray-800 hover:bg-gray-700" onClick={() => setShowSettings(false)}>Zamknij</button>
            </div>
            <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <div className="font-medium">YouTube API</div>
                <label className="text-sm text-gray-400">Klucz API</label>
                <input
                  className="mt-1 w-full px-3 py-3 rounded-lg border border-gray-700 bg-gray-800 text-white placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-red-600"
                  placeholder="AIza..."
                  value={settings.youtubeApiKey}
                  onChange={(e) => setSettings({ ...settings, youtubeApiKey: e.target.value })}
                />
                <p className="text-xs text-gray-500 mt-2">Ogranicz klucz do domeny produkcyjnej (HTTP referrers).</p>

                <div className="mt-6 font-medium">Supabase (opcjonalnie)</div>
                <label className="text-sm text-gray-400">Project URL</label>
                <input
                  className="mt-1 w-full px-3 py-3 rounded-lg border border-gray-700 bg-gray-800 text-white placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-red-600"
                  placeholder="https://xxxx.supabase.co"
                  value={settings.supabaseUrl}
                  onChange={(e) => setSettings({ ...settings, supabaseUrl: e.target.value })}
                />
                <label className="text-sm text-gray-400 mt-2 block">Anon Key</label>
                <input
                  className="mt-1 w-full px-3 py-3 rounded-lg border border-gray-700 bg-gray-800 text-white placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-red-600"
                  placeholder="eyJhbGci..."
                  value={settings.supabaseAnonKey}
                  onChange={(e) => setSettings({ ...settings, supabaseAnonKey: e.target.value })}
                />
                <p className="text-xs text-gray-500 mt-2">Po zapisaniu pojawi się logowanie. Włącz RLS i polityki na user_id.</p>
              </div>

              <div>
                {supabase ? (
                  <div>
                    {user ? (
                      <div className="rounded-lg border border-gray-700 p-4 bg-gray-800">
                        <div className="text-sm text-gray-400">Zalogowano jako</div>
                        <div className="font-medium">{user.email}</div>
                        <button className="mt-2 px-3 py-2 rounded-lg border border-gray-700 bg-gray-900 hover:bg-gray-800 flex items-center gap-2" onClick={async () => { await supabase.auth.signOut(); }}>
                          <LogOut size={16} /> Wyloguj
                        </button>
                      </div>
                    ) : (
                      <AuthPanel supabase={supabase} authView={authView} setAuthView={setAuthView} />
                    )}

                    <div className="mt-6">
                      <details className="rounded-lg border border-gray-700 p-4 bg-gray-800">
                        <summary className="cursor-pointer font-medium">SQL – schemat tabel</summary>
                        <pre className="text-xs whitespace-pre-wrap mt-2 text-gray-300">{`
create table if not exists public.playlists (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  name text not null,
  created_at timestamp with time zone default now()
);
create table if not exists public.playlist_items (
  id uuid primary key default gen_random_uuid(),
  playlist_id uuid references public.playlists(id) on delete cascade,
  user_id uuid not null,
  video_id text not null,
  title text,
  channel_title text,
  thumbnail_url text,
  added_at timestamp with time zone default now()
);
create table if not exists public.favorites (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  video_id text not null,
  title text,
  channel_title text,
  thumbnail_url text,
  created_at timestamp with time zone default now(),
  unique (user_id, video_id)
);
-- Po włączeniu RLS:
-- create policy "own rows" on playlists for all using (user_id = auth.uid());
-- create policy "own rows" on playlist_items for all using (user_id = auth.uid());
-- create policy "own rows" on favorites for all using (user_id = auth.uid());
                        `}</pre>
                      </details>
                    </div>
                  </div>
                ) : (
                  <div className="text-sm text-gray-300">
                    Dodaj Supabase URL i Anon Key, aby włączyć logowanie oraz zapisy w chmurze.
                    <div className="mt-3 rounded-lg border border-gray-700 p-4 bg-gray-800">
                      <div className="font-medium mb-1">Tryb gościa (LocalStorage)</div>
                      <ul className="list-disc ml-5 text-gray-400">
                        <li>Ulubione i Playlisty zapisywane lokalnie w przeglądarce</li>
                        <li>Brak konta/logowania</li>
                      </ul>
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="p-4 border-t border-gray-700 flex justify-end">
              <button className="px-4 py-2 rounded-lg bg-red-600 hover:bg-red-700" onClick={() => setShowSettings(false)}>Zapisz</button>
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
    setLoading(true);
    setMessage("");
    try {
      if (authView === "signup") {
        const { error } = await supabase.auth.signUp({ email, password });
        if (error) throw error;
        setMessage("Konto utworzone. Zaloguj się.");
        setAuthView("signin");
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
      }
    } catch (e) {
      setMessage(e.message || "Błąd logowania/rejestracji.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="rounded-lg border border-gray-700 p-4 bg-gray-800">
      <div className="flex items-center gap-2 mb-3">
        <button
          className={`px-3 py-2 rounded-lg border border-gray-700 ${authView === "signin" ? "bg-red-600" : "bg-gray-900 hover:bg-gray-800"}`}
          onClick={() => setAuthView("signin")}
        >Logowanie</button>
        <button
          className={`px-3 py-2 rounded-lg border border-gray-700 ${authView === "signup" ? "bg-red-600" : "bg-gray-900 hover:bg-gray-800"}`}
          onClick={() => setAuthView("signup")}
        >Rejestracja</button>
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
