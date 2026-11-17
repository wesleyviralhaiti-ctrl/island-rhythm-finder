// On-device MP3 vault (IndexedDB). Browser-only: call from effects or event handlers.
import type { Song } from "./types";

export type VaultTrack = Song & { fileName: string; size: number; savedAt: number };

const DB_NAME = "wesley-audio-vault";
const META = "meta";
const AUDIO = "audio";

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(META)) db.createObjectStore(META, { keyPath: "id" });
      if (!db.objectStoreNames.contains(AUDIO)) db.createObjectStore(AUDIO);
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

function done(tx: IDBTransaction) {
  return new Promise<void>((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
    tx.onabort = () => reject(tx.error);
  });
}

export async function putTrack(track: VaultTrack, blob: Blob) {
  const db = await openDb();
  const tx = db.transaction([META, AUDIO], "readwrite");
  tx.objectStore(META).put(track);
  tx.objectStore(AUDIO).put(blob, track.id);
  await done(tx);
}

export async function listTracks(): Promise<VaultTrack[]> {
  const db = await openDb();
  const tx = db.transaction(META, "readonly");
  const req = tx.objectStore(META).getAll();
  await done(tx);
  return ((req.result as VaultTrack[]) ?? []).sort((a, b) => b.savedAt - a.savedAt);
}

export async function getAudio(id: string): Promise<Blob | null> {
  const db = await openDb();
  const tx = db.transaction(AUDIO, "readonly");
  const req = tx.objectStore(AUDIO).get(id);
  await done(tx);
  return (req.result as Blob | undefined) ?? null;
}

export async function deleteTrack(id: string) {
  const db = await openDb();
  const tx = db.transaction([META, AUDIO], "readwrite");
  tx.objectStore(META).delete(id);
  tx.objectStore(AUDIO).delete(id);
  await done(tx);
}

export function formatSize(bytes: number) {
  return bytes >= 1024 * 1024 ? `${(bytes / 1024 / 1024).toFixed(1)} MB` : `${Math.round(bytes / 1024)} KB`;
}
