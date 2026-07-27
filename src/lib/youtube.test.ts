import { describe, expect, it } from "vitest";
import { youtubeEmbedUrl, youtubeVideoId } from "./youtube";

describe("YouTube lecture URLs", () => {
  it.each([
    ["https://www.youtube.com/watch?v=M7lc1UVf-VE", "M7lc1UVf-VE"],
    ["https://youtu.be/M7lc1UVf-VE?t=12", "M7lc1UVf-VE"],
    ["https://youtube.com/shorts/M7lc1UVf-VE", "M7lc1UVf-VE"],
    ["https://www.youtube.com/embed/M7lc1UVf-VE", "M7lc1UVf-VE"],
  ])("extracts %s", (url, id) => expect(youtubeVideoId(url)).toBe(id));
  it("rejects non-YouTube and malformed links", () => {
    expect(youtubeVideoId("https://example.com/watch?v=M7lc1UVf-VE")).toBeNull();
    expect(youtubeVideoId("https://youtube.com/watch?v=too-short")).toBeNull();
  });
  it("uses the privacy-enhanced embed host", () => expect(youtubeEmbedUrl("https://youtu.be/M7lc1UVf-VE")).toContain("youtube-nocookie.com/embed/M7lc1UVf-VE"));
});
