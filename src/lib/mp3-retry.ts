// Asks the MP3 service for a link, retrying while the file is still "processing".
export type Mp3ApiResponse = {
  status?: string | undefined;
  link?: string | undefined;
  title?: string | undefined;
  msg?: string | undefined;
  filesize?: number | undefined;
};

export const MP3_RETRIES = 3;

export async function resolveMp3Link(
  fetchOnce: () => Promise<Mp3ApiResponse>,
  opts: { retries?: number; delayMs?: number; sleep?: (ms: number) => Promise<void> } = {},
): Promise<{ ok: true; link: string; title: string | null; filesize: number | null } | { ok: false; error: string }> {
  const retries = opts.retries ?? MP3_RETRIES;
  const delayMs = opts.delayMs ?? 3000;
  const sleep = opts.sleep ?? ((ms: number) => new Promise<void>((r) => setTimeout(r, ms)));

  for (let attempt = 0; attempt <= retries; attempt++) {
    const res = await fetchOnce();
    if (res.status === "ok" && res.link) {
      return { ok: true, link: res.link, title: res.title ?? null, filesize: res.filesize ?? null };
    }
    if (res.status !== "processing") {
      return { ok: false, error: res.msg || "Sèvis MP3 a pa rive prepare mizik sa a." };
    }
    if (attempt < retries) await sleep(delayMs);
  }
  return { ok: false, error: "MP3 a toujou ap prepare. Eseye ankò nan kèk minit." };
}

export function safeFileName(title: string): string {
  const clean = title.replace(/[\\/:*?"<>|]+/g, "").replace(/\s+/g, " ").trim().slice(0, 120);
  return `${clean || "mizik"}.mp3`;
}

export const MUSIC_FOLDER = "Music / WESLEY MUSIC DOWNLOAD";
