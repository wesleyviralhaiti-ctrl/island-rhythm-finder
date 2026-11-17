import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { isPremiumActive } from "./plans";
import { resolveMp3Link, type Mp3ApiResponse } from "./mp3-retry";

const RAPID_HOST = "youtube-mp36.p.rapidapi.com";

export const getMp3Link = createServerFn({ method: "POST" })
  .inputValidator((d) =>
    z.object({ listenerId: z.string().uuid(), videoId: z.string().regex(/^[A-Za-z0-9_-]{11}$/) }).parse(d),
  )
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: l } = await supabaseAdmin
      .from("listeners")
      .select("premium_until, is_lifetime")
      .eq("id", data.listenerId)
      .maybeSingle();
    if (!l || !isPremiumActive({ isLifetime: l.is_lifetime, premiumUntil: l.premium_until })) {
      return { ok: false as const, error: "Ou bezwen Premium pou telechaje." };
    }

    const { data: setting } = await supabaseAdmin
      .from("app_settings")
      .select("value")
      .eq("key", "rapidapi_key")
      .maybeSingle();
    const key = setting?.value || process.env["RAPIDAPI_KEY"];
    if (!key) return { ok: false as const, error: "Admin lan poko mete kle MP3 a." };

    try {
      return await resolveMp3Link(async () => {
        const r = await fetch(`https://${RAPID_HOST}/dl?id=${data.videoId}`, {
          headers: { "x-rapidapi-key": key, "x-rapidapi-host": RAPID_HOST },
        });
        if (!r.ok) {
          console.error("RapidAPI MP3 failed", r.status, (await r.text()).slice(0, 300));
          return { status: "fail", msg: r.status === 403 || r.status === 401 ? "Kle MP3 a pa bon." : r.status === 429 ? "Limit telechajman sèvis MP3 a fini." : undefined };
        }
        return (await r.json()) as Mp3ApiResponse;
      });
    } catch (e) {
      console.error("RapidAPI MP3 error", e);
      return { ok: false as const, error: "Sèvis MP3 a pa reponn. Eseye ankò." };
    }
  });
