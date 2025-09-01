# BOXTOX PLAYER
Interaktywny player YouTube z wyszukiwarką + Ulubione/Playlisty. Logowanie i chmura przez Supabase. Deploy: Netlify.


## Szybki start (Netlify + GitHub)
1. Utwórz repo i dodaj pliki z tego katalogu.
2. Połącz Netlify: Add new site → Import from Git → wybierz repo.
3. Build command: `npm run build` | Publish dir: `dist`.
4. Po deployu otwórz stronę → ⚙️ Ustawienia → wklej **YouTube API Key**.
5. (Opcjonalnie) Wklej **Supabase URL** i **Anon key**, zarejestruj konto.


## YouTube API Key
- Google Cloud → APIs & Services → Library → *YouTube Data API v3* → Enable.
- Credentials → Create credentials → **API key**.
- Restrict key:
- Application restrictions: **HTTP referrers (web sites)**.
- Dodaj: `https://<twoja-nazwa>.netlify.app/*` oraz własną domenę.
- (Opcja) API restrictions: **YouTube Data API v3**.


## Supabase (opcjonalnie)
- Authentication → Email włączone.
- SQL: tabele `playlists`, `playlist_items`, `favorites` (patrz instrukcja).
- Włącz RLS + polityki `user_id = auth.uid()`.
