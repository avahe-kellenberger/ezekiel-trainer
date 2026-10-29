import { SoundCache } from "osrs-sdk";
import type { TrainerInstance } from "osrs-sdk";

export type AudioChannel = "effects" | "area" | "music" | "metronome";

const CHANNELS: Readonly<Record<AudioChannel, Readonly<{ storageKey: string; defaultVolume: number }>>> = {
  effects: { storageKey: "zeke:effects-volume", defaultVolume: 1 },
  area: { storageKey: "zeke:area-volume", defaultVolume: 1 },
  music: { storageKey: "zeke:music-volume", defaultVolume: 0.35 },
  metronome: { storageKey: "zeke:metronome-volume", defaultVolume: 0 },
};

const volumes: Record<AudioChannel, number> = { effects: 1, area: 1, music: 0.35, metronome: 0 };

export function savedAudioVolume(channel: AudioChannel): number {
  const { storageKey, defaultVolume } = CHANNELS[channel];
  try {
    const saved = localStorage.getItem(storageKey);
    const volume = Number(saved);
    return saved !== null && saved.trim() !== "" && Number.isFinite(volume) && volume >= 0 && volume <= 1 ? volume : defaultVolume;
  } catch {
    return defaultVolume;
  }
}

export function setAudioVolume(channel: AudioChannel, volume: number): void {
  if (!Number.isFinite(volume) || volume < 0 || volume > 1) throw new RangeError("Audio volume must be between 0 and 1.");
  volumes[channel] = volume;
  try { localStorage.setItem(CHANNELS[channel].storageKey, String(volume)); } catch {}
}

export function installSoundVolumes(): () => void {
  volumes.effects = savedAudioVolume("effects");
  volumes.area = savedAudioVolume("area");
  const originalPlay = SoundCache.play;
  const play: typeof SoundCache.play = (sound, isAreaSound = Boolean(sound.area)) => {
    const src: unknown = sound.src;
    // Loading and delayed playback recurse into the SDK, so scale only the final playback.
    if (typeof src !== "string" || !SoundCache.cachedSounds[src] || sound.delayMs > 0) {
      return originalPlay.call(SoundCache, sound, isAreaSound);
    }
    const volume = sound.volume * volumes[isAreaSound ? "area" : "effects"];
    return originalPlay.call(SoundCache, { ...sound, volume }, isAreaSound);
  };
  SoundCache.play = play;
  return () => {
    if (SoundCache.play === play) SoundCache.play = originalPlay;
  };
}

export function installMetronome(trainer: TrainerInstance): () => void {
  volumes.metronome = savedAudioVolume("metronome");
  const world = trainer.world;
  const originalTickRegion = world.tickRegion;
  const tickRegion: typeof world.tickRegion = (region) => {
    originalTickRegion.call(world, region);
    const context = SoundCache.context;
    const volume = volumes.metronome;
    if (region !== trainer.region || volume === 0 || !context || context.state !== "running") return;
    const oscillator = context.createOscillator();
    const gain = context.createGain();
    const now = context.currentTime;
    oscillator.frequency.setValueAtTime(1000, now);
    gain.gain.setValueAtTime(volume * 0.15, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.035);
    oscillator.connect(gain);
    gain.connect(context.destination);
    oscillator.onended = () => {
      oscillator.disconnect();
      gain.disconnect();
    };
    oscillator.start(now);
    oscillator.stop(now + 0.04);
  };
  world.tickRegion = tickRegion;
  return () => {
    if (world.tickRegion === tickRegion) world.tickRegion = originalTickRegion;
  };
}
