import { describe, expect, it, vi } from "vitest";
import { resolveMp3Link } from "@/lib/mp3-retry";

const noSleep = () => Promise.resolve();

describe("MP3 link retries", () => {
  it("retries while processing and returns the link once ready", async () => {
    const fetchOnce = vi
      .fn()
      .mockResolvedValueOnce({ status: "processing" })
      .mockResolvedValueOnce({ status: "processing" })
      .mockResolvedValueOnce({ status: "ok", link: "https://x/a.mp3" });
    const r = await resolveMp3Link(fetchOnce, { sleep: noSleep });
    expect(r).toMatchObject({ ok: true, link: "https://x/a.mp3" });
    expect(fetchOnce).toHaveBeenCalledTimes(3);
  });

  it("gives up after 3 retries (4 calls total)", async () => {
    const fetchOnce = vi.fn().mockResolvedValue({ status: "processing" });
    const r = await resolveMp3Link(fetchOnce, { sleep: noSleep });
    expect(r.ok).toBe(false);
    expect(fetchOnce).toHaveBeenCalledTimes(4);
  });

  it("does not retry on fail", async () => {
    const fetchOnce = vi.fn().mockResolvedValue({ status: "fail", msg: "bad" });
    const r = await resolveMp3Link(fetchOnce, { sleep: noSleep });
    expect(r).toEqual({ ok: false, error: "bad" });
    expect(fetchOnce).toHaveBeenCalledTimes(1);
  });
});
