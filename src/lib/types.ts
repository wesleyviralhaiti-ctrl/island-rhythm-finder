export type Song = {
  id: string;
  title: string;
  channel: string;
  thumbnail: string;
  durationSec: number;
  /** Play from the on-device MP3 vault instead of YouTube. */
  offline?: boolean;
};
