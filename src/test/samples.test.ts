import { describe, expect, it } from "vitest";
import { GENRES } from "@/lib/genres";
import { SAMPLE_TRACKS, sampleTracksFor } from "@/lib/sample-tracks";
import { isIndividualSong } from "@/lib/song-filter";

describe("fallback sample tracks", () => {
  it("every genre button has sample songs", () => {
    for (const g of GENRES) expect(sampleTracksFor(g.id).length).toBeGreaterThan(0);
  });
  it("no sample is a mixtape over 15 minutes", () => {
    for (const s of Object.values(SAMPLE_TRACKS).flat()) expect(isIndividualSong(s.title, s.durationSec)).toBe(true);
  });
});
