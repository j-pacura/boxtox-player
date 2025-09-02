// netlify/functions/youtube-search.js
exports.handler = async (event) => {
  const YT_API_KEY = process.env.YT_API_KEY;
  const q = new URLSearchParams(event.queryStringParameters || {}).get("q") || "";

  if (!YT_API_KEY) {
    return {
      statusCode: 500,
      headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
      body: JSON.stringify({ error: "Missing YT_API_KEY" }),
    };
  }

  if (!q.trim()) {
    return {
      statusCode: 200,
      headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
      body: JSON.stringify({ items: [] }),
    };
  }

  const url = new URL("https://www.googleapis.com/youtube/v3/search");
  url.searchParams.set("part", "snippet");
  url.searchParams.set("type", "video");
  url.searchParams.set("maxResults", "24");
  url.searchParams.set("q", q);
  url.searchParams.set("key", YT_API_KEY);

  try {
    const resp = await fetch(url.toString());
    if (!resp.ok) throw new Error("YouTube API error");
    const data = await resp.json();

    const items = (data.items || []).map((it) => ({
      video_id: it.id?.videoId,
      title: it.snippet?.title,
      channel_title: it.snippet?.channelTitle,
      thumbnail_url:
        it.snippet?.thumbnails?.medium?.url || it.snippet?.thumbnails?.high?.url,
      publishedAt: it.snippet?.publishedAt,
    }));

    return {
      statusCode: 200,
      headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
      body: JSON.stringify({ items }),
    };
  } catch (e) {
    return {
      statusCode: 500,
      headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
      body: JSON.stringify({ error: "Fetch failed" }),
    };
  }
};
