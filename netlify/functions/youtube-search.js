// netlify/functions/youtube-search.js
export const handler = async (event) => {
  const YT_API_KEY = process.env.YT_API_KEY;
  const q = new URLSearchParams(event.queryStringParameters || {}).get("q") || "";

  const json = (code, data) => ({
    statusCode: code,
    headers: {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": "*", // dla frontu
    },
    body: JSON.stringify(data),
  });

  if (!YT_API_KEY) return json(500, { error: "Missing YT_API_KEY" });
  if (!q.trim()) return json(200, { items: [] });

  const url = new URL("https://www.googleapis.com/youtube/v3/search");
  url.searchParams.set("part", "snippet");
  url.searchParams.set("type", "video");
  url.searchParams.set("maxResults", "24");
  url.searchParams.set("q", q);
  url.searchParams.set("key", YT_API_KEY);

  try {
    const resp = await fetch(url.toString());

    // Jeśli YT zwróci błąd (np. 400/403), zwrócimy szczegóły do debugowania:
    if (!resp.ok) {
      const text = await resp.text();
      console.error("YouTube API error", resp.status, text); // zobaczysz w Netlify → Functions → Logs
      return json(resp.status, {
        error: "YouTube API error",
        status: resp.status,
        details: safeParse(text),
      });
    }

    const data = await resp.json();
    const items = (data.items || []).map((it) => ({
      video_id: it.id?.videoId,
      title: it.snippet?.title,
      channel_title: it.snippet?.channelTitle,
      thumbnail_url:
        it.snippet?.thumbnails?.medium?.url || it.snippet?.thumbnails?.high?.url,
      publishedAt: it.snippet?.publishedAt,
    }));

    return json(200, { items });
  } catch (e) {
    console.error("Fetch failed", e);
    return json(500, { error: "Fetch failed" });
  }
};

function safeParse(text) {
  try { return JSON.parse(text); } catch { return { raw: text }; }
}
