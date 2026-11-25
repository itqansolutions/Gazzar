export const PRESET_AVATARS = [
  "bolt", "dumbbell", "kettlebell", "flame", "trophy", "pulse", "mountain", "shield"
].map((n) => ({ id: n, src: `/avatars/${n}.svg` }));

export const DEFAULT_AVATAR = "/avatars/default.svg";

const LEGACY_DEFAULTS = ["images.unsplash.com/photo-1534528741775", "/coach_dark_hero.jpg"];

/** The picture to show: the user's own upload/preset, else the default avatar (old stock default photo counts as none). */
export function resolveAvatar(url?: string | null): string {
  if (!url) return DEFAULT_AVATAR;
  if (LEGACY_DEFAULTS.some((l) => url.includes(l))) return DEFAULT_AVATAR;
  return url;
}

export function isPresetAvatar(url: string): boolean {
  return PRESET_AVATARS.some((a) => a.src === url);
}
