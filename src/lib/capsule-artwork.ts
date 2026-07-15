/** Pack card & hero artwork paths (v3 = cache-busted filenames) */
export const CAPSULE_ARTWORK: Record<string, string> = {
  ai: "/graphics/capsule-ai-v3.png",
  mag7: "/graphics/capsule-mag7-v3.png",
  dividend: "/graphics/capsule-dividend-v3.png",
  healthcare: "/graphics/capsule-healthcare-v3.png",
  "future-tech": "/graphics/capsule-future-tech-v3.png",
};

export const HERO_GRAPHICS = {
  pack: "/graphics/hero-pack-v3.png",
  capsule: "/graphics/hero-capsule-v3.png",
  texture: "/graphics/hero-bg-texture.png",
  logo: "/graphics/stockpackz-logo-v4.png",
  icon: "/graphics/stockpackz-icon-v4.png",
} as const;

export function getCapsuleArtwork(capsuleId: string): string {
  return CAPSULE_ARTWORK[capsuleId] ?? HERO_GRAPHICS.pack;
}
