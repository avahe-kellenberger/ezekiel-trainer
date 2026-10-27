// Match the SDK's cache-animation sound level.
export const ZEKE_SOUND_VOLUME = 0.1;

export const ZEKE_DIALOGUE = {
  engage: [
    "You choose to stand against me? Fall then.",
    "To stand against good is to be evil, regardless of reason.",
    "Your defence of this place ends with me.",
  ],
  star: ["Divine consequence!", "Divine judgement!", "Your evil plots end at me!"],
  weakened: "Agh!",
  heal: "Saradomin, give me strength.",
  death: "...Formidable.",
  source: "https://github.com/MRobertEvers/oldschool-clientc/blob/687bd99a0d7fb93992dff059aa103d9bc0873c98/docs/rsprox-analysis/guthixian_archive/ezekiel_plan.md",
} as const;

// Cache 2746 headbar 87 uses these two solid-colour 45x5 sprites.
export const SWORD_COUNTDOWN_LOOK = {
  foregroundSprite: 8571,
  backgroundSprite: 8572,
  width: 45,
  height: 5,
  foreground: "#780b0b",
  background: "#140101",
  gap: 2,
} as const;

// Cache 2746 headbar 42 uses these solid-colour 70x5 sprites.
export const SWORD_CHARGE_LOOK = {
  foregroundSprite: 2977,
  backgroundSprite: 2978,
  width: 70,
  height: 5,
  foreground: "#dbd300",
  background: "#2d2b00",
  gap: 2,
} as const;
