import React, { useEffect, useMemo, useState } from "react";
import { createClient } from "@supabase/supabase-js";

// BOXTOX PLAYER — interactive YouTube player with search, playlists & favorites
// MVP działa od razu z LocalStorage (bez backendu).
// Po dodaniu Supabase URL + Anon Key w ⚙️ Ustawieniach dostajesz logowanie i zapisy w chmurze.

const LS_SETTINGS_KEY = "boxtox.settings.v1";
const LS_GUEST_KEY = "boxtox.guest.v1";

function useLocalSettings() {
  const [settings, setSettings] = useState(() => {
    try {
      const raw = localStorage.getItem(LS_SETTINGS_KEY);
      return raw
        ? JSON.parse(raw)
        : { youtubeApiKey: "", supabaseUrl: "", supabaseAnonKey: "" };
    } catch {
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
    let subscription;
    (async () => {
      if (!supabase) {
        setUser(null);
        return;
      }
      const { data } = await supabase.auth.getSession();
      setUser(data?.session?.user ?? null);
      const res = supabase.auth.onAuthStateChange((_event, session) => {
        setUser(session?.user ?? null);
      });
      subscription = res?.data?.subscription;
    })();
    return () => {
      if (subscription) subscription.unsubscribe();
    };
  }, [supabase]);

  return { supabase, user };
}

function useGuestStore() {
  const [store, setStore] = useState(() => {
    try {
      const raw = localStorage.getItem(LS_GUEST_KEY);
      return raw ? JSON.parse(raw) : { favorites: [], playlists: [] };
    } catch {
      return { favorites: [], playlists: [] };
    }
  });
  useEffect(() => {
    localStorage.setItem(LS_GUEST_KEY, JSON.stringify(store));
  }, [store]);
  return [store, setStore];
}

function Header({ onSearch, query, setQuery, onOpenSettings, userEmail, onSignOut }) {
  return (
    <div className="w-full sticky top-0 z-40 bg-white/80 backdrop-blur border-b">
      <div className="max-w-6xl mx-auto px-4 py-3 flex items-center gap-3">
        <div className="flex items-center gap-2">
          <div className="w-9 h-9 rounded-2xl bg-black text-white grid place-items-center font-bold">B</div>
          <div className="font-extrabold tracking-tight text-xl">
            BOXTOX <span className="text-black/60">PLAYER</span>
          </div>
        </div>
        <div className="flex-1" />
        <div className="flex items-center gap-2 w-[520px] max-w-[50vw]">
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && onSearch()}
            placeholder="Szukaj na YouTube..."
            className="w-full px-4 py-2 rounded-xl border focus:outline-none focus:ring-2 focus:ring-black/20"
          />
          <button
            onClick={onSearch}
            className="px-4 py-2 rounded-xl bg-black text-white hover:opacity-90 active:opacity-80"
          >
            Szukaj
          </button>
        </div>
        <div className="flex-1" />
        <button onClick={onOpenSettings} className="px-3 py-2 rounded-xl border hover:bg-black/5">
          ⚙️ Ustawienia
        </button>
        {userEmail ? (
          <div className="ml-2 flex items-center gap-2">
            <div className="text-sm text-black/70">{userEmail}</div>
            <button onClick={onSignOut} className="px-3 py-2 rounded-xl border hover:bg-black/5">
              Wyloguj
            </button>
          </div>
        ) : null}
      </div>
    </div>
  );
}

function VideoCard({ video, onClick, isActive, onFav }) {
  return (
    <div
      className={`rounded-2xl border overflow-hidden hover:shadow-sm transition cursor-pointer ${
        isActive ? "ring-2 ring-black/20" : ""
      }`}
      onClick={() => onClick(video)}
    >
      <img src={video.thumbnail_url} alt={video.title} className="w-full aspect-video object-cover" />
      <div className="p-3">
        <div className="font-medium line-clamp-2 leading-tight">{video.title}</div>
        <div className="text-sm text-black/60 mt-1">{video.channel_title}</div>
        <div className="mt-2 flex items-center gap-2">
          <button
            onClick={(e) => {
              e.stopPropagation();
              onFav(video);
            }}
            className="text-sm px-3 py-1 rounded-lg border hover:bg-black/5"
          >
            ⭐ Ulubione
          </button>
          <div className="text-xs text-black/40">
            {video.publishedAt ? new Date(video.publishedAt).toLocaleDateString() : ""}
          </div>
        </div>
      </div>
    </div>
  );
}

function Player({ videoId }) {
  if (!videoId)
    return (
      <div className="w-full aspect-video grid place-items-center border rounded-2xl">
        <div className="text-black/50">Wybierz film, aby odtworzyć</div>
      </div>
    );
  return (
    <div className="w-full aspect-video rounded-2xl overflow-hidden border">
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

export default function App() {
  const [settings, setSettings] = useLocalSettings();
  const { supabase, user } = useSupabase(settings);
  const [guestStore, setGuestStore] = useGuestStore();

  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [active, setActive] = useState(null);

  const [showSettings, setShowSettings] = useState(false);
  const [authView, setAuthView] = useState("signin"); // signin | signup

  // Cloud state
  const [favorites, setFavorites] = useState([]);
  const [playlists, setPlaylists] = useState([]);
  const [selectedPlaylistId, setSelectedPlaylistId] = useState(null);
  const [playlistItems, setPlaylistItems] = useState([]);

  const isCloud = !!(supabase && user);

  // Initial cloud/local data load
  useEffect(() => {
    if (!supabase || !user) {
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
      const items =
        (data.items || [])
          .map((it) => ({
            video_id: it.id?.videoId,
            title: it.snippet?.title,
            channel_title: it.snippet?.channelTitle,
            thumbnail_url:
              it.snippet?.thumbnails?.medium?.url || it.snippet?.thumbnails?.high?.url,
            publishedAt: it.snippet?.publishedAt,
          }))
          .filter((v) => v.video_id) || [];
      setResults(items);
      if (items.length) setActive(items[0]);
    } catch (e) {
      console.error(e);
      alert("Błąd podczas wyszukiwania. Sprawdź klucz API i limity.");
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
      const { error } = await supabase.from("favorites").upsert({
        user_id: user.id,
        ...v,
      });
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
      setFavorites((prev) =>
        prev.find((x) => x.video_id === v.video_id) ? prev : [v, ...prev]
      );
    }
  }

  async function createPlaylist(name) {
    if (!name?.trim()) return;
    if (isCloud) {
      const { data, error } = await supabase
        .from("playlists")
        .insert({ user_id: user.id, name })
        .select();
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
      const { error } = await supabase.from("playlist_items").insert({
        playlist_id: playlistId,
        user_id: user.id,
        ...v,
      });
      if (error) return alert("Nie udało się dodać do playlisty (Supabase).");
      if (playlistId === selectedPlaylistId) {
        loadPlaylistItems(playlistId);
      }
    } else {
      setGuestStore((prev) => {
        const pls = prev.playlists.map((p) => {
          if (p.id === playlistId) {
            if (!p.items.find((x) => x.video_id === v.video_id)) {
              p.items = [v, ...p.items];
            }
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

  async function signOut() {
    if (supabase) await supabase.auth.signOut();
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-white to-neutral-50 text-neutral-900">
      <Header
        query={query}
        setQuery={setQuery}
        onSearch={search}
        onOpenSettings={() => setShowSettings(true)}
        userEmail={user?.email}
        onSignOut={signOut}
      />

      <main className="max-w-6xl mx-auto px-4 py-6 grid grid-cols-12 gap-6">
        {/* Left: sidebar */}
        <aside className="col-span-12 lg:col-span-4 flex flex-col gap-4">
          <section className="rounded-2xl border bg-white p-4">
            <div className="flex items-center justify-between">
              <h2 className="font-semibold">Playlisty</h2>
              <button
                onClick={() => {
                  const name = prompt("Nazwa playlisty");
                  if (name) createPlaylist(name);
                }}
                className="text-sm px-3 py-1 rounded-lg border hover:bg-black/5"
              >
                + Nowa
              </button>
            </div>
            <div className="mt-3 space-y-2 max-h-64 overflow-auto pr-1">
              {playlists.length === 0 ? (
                <div className="text-sm text-black/50">Brak playlist. Utwórz pierwszą.</div>
              ) : (
                playlists.map((pl) => (
                  <button
                    key={pl.id}
                    onClick={() => loadPlaylistItems(pl.id)}
                    className={`w-full text-left px-3 py-2 rounded-xl border hover:bg-black/5 ${
                      selectedPlaylistId === pl.id ? "bg-black/5" : ""
                    }`}
                  >
                    {pl.name}
                  </button>
                ))
              )}
            </div>
            <div className="mt-4">
              <label className="text-sm text-black/60">Dodaj aktywny film do:</label>
              <div className="mt-2 flex items-center gap-2">
                <select
                  className="flex-1 px-3 py-2 rounded-xl border"
                  value={selectedPlaylistId || ""}
                  onChange={(e) => setSelectedPlaylistId(e.target.value || null)}
                >
                  <option value="">— wybierz playlistę —</option>
                  {playlists.map((pl) => (
                    <option value={pl.id} key={pl.id}>
                      {pl.name}
                    </option>
                  ))}
                </select>
                <button
                  onClick={() => active && addToPlaylist(selectedPlaylistId, active)}
                  className="px-3 py-2 rounded-xl border hover:bg-black/5"
                >
                  Dodaj
                </button>
              </div>
            </div>
          </section>

          <section className="rounded-2xl border bg-white p-4">
            <div className="flex items-center justify-between">
              <h2 className="font-semibold">Ulubione</h2>
            </div>
            <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-80 overflow-auto pr-1">
              {favorites.length === 0 ? (
                <div className="text-sm text-black/50">Brak ulubionych.</div>
              ) : (
                favorites.map((v) => (
                  <div
                    key={v.video_id}
                    className="flex gap-3 items-center cursor-pointer"
                    onClick={() => setActive(v)}
                  >
                    <img src={v.thumbnail_url} className="w-20 h-12 rounded-lg object-cover border" />
                    <div className="text-sm line-clamp-2">{v.title}</div>
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
            <div className="rounded-2xl border bg-white p-4">
              <div className="font-semibold mb-2">Elementy playlisty</div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-72 overflow-auto pr-1">
                {playlistItems.length === 0 ? (
                  <div className="text-sm text-black/50">Ta playlista jest pusta.</div>
                ) : (
                  playlistItems.map((v) => (
                    <VideoCard
                      key={v.video_id}
                      video={v}
                      onClick={setActive}
                      isActive={active?.video_id === v.video_id}
                      onFav={addToFavorites}
                    />
                  ))
                )}
              </div>
            </div>
          )}

          <div className="rounded-2xl border bg-white p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="font-semibold">Wyniki wyszukiwania</div>
              {loading && <div className="text-sm text-black/50">Szukam...</div>}
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {results.map((v) => (
                <VideoCard
                  key={v.video_id}
                  video={v}
                  onClick={setActive}
                  isActive={active?.video_id === v.video_id}
                  onFav={addToFavorites}
                />
              ))}
            </div>
          </div>
        </section>
      </main>

      {/* SETTINGS & AUTH MODAL */}
      {showSettings && (
        <div
          className="fixed inset-0 z-50 bg-black/40 grid place-items-center p-4"
          onClick={() => setShowSettings(false)}
        >
          <div
            className="w-full max-w-2xl bg-white rounded-2xl border shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-4 border-b flex items-center justify-between">
              <div className="font-semibold">Ustawienia & Konto</div>
              <button className="px-3 py-1 rounded-lg border" onClick={() => setShowSettings(false)}>
                Zamknij
              </button>
            </div>
            <div className="p-4 grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <div className="font-medium">YouTube API</div>
                <label className="text-sm text-black/60">Klucz API</label>
                <input
                  className="mt-1 w-full px-3 py-2 rounded-xl border"
                  placeholder="AIza..."
                  value={settings.youtubeApiKey}
                  onChange={(e) => setSettings({ ...settings, youtubeApiKey: e.target.value })}
                />
                <p className="text-xs text-black/50 mt-2">
                  Używane tylko w przeglądarce. Ogranicz klucz do referera domeny produkcyjnej.
                </p>

                <div className="mt-6 font-medium">Supabase (opcjonalnie)</div>
                <label className="text-sm text-black/60">Project URL</label>
                <input
                  className="mt-1 w-full px-3 py-2 rounded-xl border"
                  placeholder="https://xxxx.supabase.co"
                  value={settings.supabaseUrl}
                  onChange={(e) => setSettings({ ...settings, supabaseUrl: e.target.value })}
                />
                <label className="text-sm text-black/60 mt-2 block">Anon Key</label>
                <input
                  className="mt-1 w-full px-3 py-2 rounded-xl border"
                  placeholder="eyJhbGci..."
                  value={settings.supabaseAnonKey}
                  onChange={(e) => setSettings({ ...settings, supabaseAnonKey: e.target.value })}
                />
                <p className="text-xs text-black/50 mt-2">
                  Po zapisaniu pojawi się logowanie. Włącz RLS i polityki na user_id.
                </p>
              </div>

              <div>
                {supabase ? (
                  <div>
                    {user ? (
                      <div className="rounded-xl border p-3">
                        <div className="text-sm">Zalogowano jako</div>
                        <div className="font-medium">{user.email}</div>
                        <button
                          className="mt-2 px-3 py-2 rounded-xl border"
                          onClick={async () => {
                            await supabase.auth.signOut();
                          }}
                        >
                          Wyloguj
                        </button>
                      </div>
                    ) : (
                      <AuthPanel supabase={supabase} authView={authView} setAuthView={setAuthView} />
                    )}

                    <div className="mt-6">
                      <details className="rounded-xl border p-3">
                        <summary className="cursor-pointer font-medium">SQL – schemat tabel</summary>
                        <pre className="text-xs whitespace-pre-wrap mt-2">{`
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
-- create policy "own rows" on playlists for all using (user_id = auth.uid()) with check (user_id = auth.uid());
-- create policy "own rows" on playlist_items for all using (user_id = auth.uid()) with check (user_id = auth.uid());
-- create policy "own rows" on favorites for all using (user_id = auth.uid()) with check (user_id = auth.uid());
                        `}</pre>
                      </details>
                    </div>
                  </div>
                ) : (
                  <div className="text-sm text-black/70">
                    Dodaj Supabase URL i Anon Key, aby włączyć logowanie oraz zapisywanie w chmurze.
                    <div className="mt-3 rounded-xl border p-3 bg-black/5">
                      <div className="font-medium mb-1">Tryb gościa (LocalStorage)</div>
                      <ul className="list-disc ml-5">
                        <li>Ulubione i Playlisty zapisywane lokalnie w przeglądarce</li>
                        <li>Brak konta/logowania</li>
                      </ul>
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="p-4 border-t flex justify-end">
              <button className="px-4 py-2 rounded-xl bg-black text-white" onClick={() => setShowSettings(false)}>
                Zapisz
              </button>
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
    <div className="rounded-xl border p-3">
      <div className="flex items-center gap-2 mb-2">
        <button
          className={`px-3 py-1 rounded-lg border ${authView === "signin" ? "bg-black text-white" : ""}`}
          onClick={() => setAuthView("signin")}
        >
          Logowanie
        </button>
        <button
          className={`px-3 py-1 rounded-lg border ${authView === "signup" ? "bg-black text-white" : ""}`}
          onClick={() => setAuthView("signup")}
        >
          Rejestracja
        </button>
      </div>
      <label className="text-sm text-black/60">Email</label>
      <input
        className="mt-1 w-full px-3 py-2 rounded-xl border"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="you@example.com"
      />
      <label className="text-sm text-black/60 mt-2 block">Hasło</label>
      <input
        className="mt-1 w-full px-3 py-2 rounded-xl border"
        type="password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        placeholder="••••••••"
      />
      {message ? <div className="mt-2 text-sm text-black/70">{message}</div> : null}
      <button
        disabled={loading}
        onClick={submit}
        className="mt-3 w-full px-3 py-2 rounded-xl bg-black text-white disabled:opacity-60"
      >
        {authView === "signup" ? "Utwórz konto" : "Zaloguj"}
      </button>
    </div>
  );
}
