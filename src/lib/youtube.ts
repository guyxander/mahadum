const VIDEO_ID = /^[A-Za-z0-9_-]{11}$/;

export function youtubeVideoId(value: string | null | undefined) {
  const input = value?.trim();
  if (!input) return null;
  if (VIDEO_ID.test(input)) return input;
  try {
    const url = new URL(input);
    const host = url.hostname.toLowerCase().replace(/^www\./, "");
    let candidate: string | null = null;
    if (host === "youtu.be") candidate = url.pathname.split("/").filter(Boolean)[0] || null;
    if (host === "youtube.com" || host === "m.youtube.com" || host === "music.youtube.com") {
      if (url.pathname === "/watch") candidate = url.searchParams.get("v");
      else if (/^\/(embed|shorts|live)\//.test(url.pathname)) candidate = url.pathname.split("/")[2] || null;
    }
    return candidate && VIDEO_ID.test(candidate) ? candidate : null;
  } catch { return null; }
}

export function youtubeEmbedUrl(value: string | null | undefined) {
  const id = youtubeVideoId(value);
  return id ? `https://www.youtube-nocookie.com/embed/${id}?controls=1&disablekb=1&fs=1&playsinline=1&rel=0` : null;
}
