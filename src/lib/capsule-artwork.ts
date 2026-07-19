/** Pack card & hero artwork paths (v5 = anime/TCG art direction, cache-busted filenames) */
export const CAPSULE_ARTWORK: Record<string, string> = {
  ai: "/graphics/capsule-ai-v5.png",
  mag7: "/graphics/capsule-mag7-v5.png",
  index: "/graphics/capsule-index-v5.png",
  dividend: "/graphics/capsule-dividend-v5.png",
  healthcare: "/graphics/capsule-healthcare-v5.png",
  "future-tech": "/graphics/capsule-future-tech-v5.png",
};

export const HERO_GRAPHICS = {
  pack: "/graphics/capsule-ai-v5.png",
  capsule: "/graphics/hero-capsule-v3.png",
  texture: "/graphics/hero-bg-texture.png",
  logo: "/graphics/stockpackz-logo-v5.png",
  icon: "/graphics/stockpackz-icon-v5.png",
} as const;

export function getCapsuleArtwork(capsuleId: string): string {
  return CAPSULE_ARTWORK[capsuleId] ?? HERO_GRAPHICS.pack;
}
