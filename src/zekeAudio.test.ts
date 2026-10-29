import { Player, Settings, Sound, SoundCache, TestRegion, TrainerInstance, Viewport } from "osrs-sdk";
import { installMetronome, installSoundVolumes, savedAudioVolume, setAudioVolume } from "./zekeAudio";

const buffer: AudioBuffer = {
  duration: 1,
  length: 1,
  numberOfChannels: 1,
  sampleRate: 1,
  copyFromChannel: () => {},
  copyToChannel: () => {},
  getChannelData: () => new Float32Array(1),
};

describe("saved encounter audio volumes", () => {
  beforeEach(() => localStorage.clear());
  afterEach(() => vi.restoreAllMocks());

  test("keeps independent levels and the existing music preference", () => {
    expect(savedAudioVolume("effects")).toBe(1);
    expect(savedAudioVolume("area")).toBe(1);
    expect(savedAudioVolume("music")).toBe(0.35);
    expect(savedAudioVolume("metronome")).toBe(0);
    localStorage.setItem("zeke:music-volume", "0.7");
    setAudioVolume("effects", 0.2);
    setAudioVolume("area", 0.5);
    setAudioVolume("metronome", 0.3);
    expect(savedAudioVolume("effects")).toBe(0.2);
    expect(savedAudioVolume("area")).toBe(0.5);
    expect(savedAudioVolume("music")).toBe(0.7);
    expect(savedAudioVolume("metronome")).toBe(0.3);
    expect(localStorage.getItem("zeke:metronome-volume")).toBe("0.3");
    setAudioVolume("music", 0);
    expect(localStorage.getItem("zeke:music-volume")).toBe("0");
  });

  test.each(["", " ", "noise", "NaN", "Infinity", "-0.1", "1.1"])("defaults invalid saved volume %j", (saved) => {
    localStorage.setItem("zeke:effects-volume", saved);
    localStorage.setItem("zeke:music-volume", saved);
    localStorage.setItem("zeke:metronome-volume", saved);
    expect(savedAudioVolume("effects")).toBe(1);
    expect(savedAudioVolume("music")).toBe(0.35);
    expect(savedAudioVolume("metronome")).toBe(0);
  });

  test("defaults when storage is unavailable and rejects invalid writes", () => {
    vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => { throw new Error("Storage unavailable"); });
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => { throw new Error("Storage unavailable"); });
    expect(savedAudioVolume("music")).toBe(0.35);
    expect(() => setAudioVolume("effects", 0.4)).not.toThrow();
    expect(() => setAudioVolume("effects", Number.NaN)).toThrow(RangeError);
    expect(() => setAudioVolume("area", 2)).toThrow(RangeError);
  });
});

class MetronomeRegion extends TestRegion {
  override initialiseRegion(): { player: Player } {
    const player = new Player(this, { x: 4, y: 5 });
    this.addPlayer(player);
    return { player };
  }
}

function metronomeOutput() {
  return {
    frequency: { setValueAtTime: vi.fn<(value: number, at: number) => void>() },
    connect: vi.fn(), disconnect: vi.fn(),
    start: vi.fn<(at: number) => void>(), stop: vi.fn<(at: number) => void>(),
    onended: () => {},
  };
}

function metronomeGain() {
  return {
    gain: {
      setValueAtTime: vi.fn<(value: number, at: number) => void>(),
      exponentialRampToValueAtTime: vi.fn<(value: number, at: number) => void>(),
    },
    connect: vi.fn(), disconnect: vi.fn(),
  };
}

describe("tick metronome", () => {
  const originalContext = SoundCache.context;
  const oscillators: ReturnType<typeof metronomeOutput>[] = [];
  const gains: ReturnType<typeof metronomeGain>[] = [];
  const context = {
    currentTime: 4,
    state: "running",
    destination: {},
    createOscillator: () => {
      const oscillator = metronomeOutput();
      oscillators.push(oscillator);
      return oscillator;
    },
    createGain: () => {
      const gain = metronomeGain();
      gains.push(gain);
      return gain;
    },
  };
  let trainer: TrainerInstance;
  let dispose = () => {};

  beforeEach(() => {
    localStorage.clear();
    oscillators.length = 0;
    gains.length = 0;
    context.state = "running";
    Object.defineProperty(SoundCache, "context", { configurable: true, writable: true, value: context });
    Settings.readFromStorage();
    Settings.set({ playsAudio: false, playsAreaAudio: false, metronome: false });
    trainer = new TrainerInstance(new MetronomeRegion(12, 12));
    trainer.mount(document.createElement("canvas"), document.createElement("div"));
    dispose = installMetronome(trainer);
  });

  afterEach(() => {
    dispose();
    trainer.dispose();
    SoundCache.context = originalContext;
    vi.restoreAllMocks();
  });

  test("starts silent and follows the current level independently of effect and area mute", () => {
    trainer.world.tickWorld();
    expect(oscillators).toHaveLength(0);
    setAudioVolume("effects", 0);
    setAudioVolume("area", 0);
    setAudioVolume("metronome", 0.6);
    trainer.world.tickWorld(2);
    expect(oscillators).toHaveLength(2);
    setAudioVolume("metronome", 0.3);
    trainer.world.tickWorld();
    expect(oscillators).toHaveLength(3);
    const loud = gains[0].gain.setValueAtTime.mock.calls[0][0];
    const quiet = gains[2].gain.setValueAtTime.mock.calls[0][0];
    expect(loud).toBeGreaterThan(0);
    expect(quiet).toBeCloseTo(loud / 2);
    setAudioVolume("metronome", 0);
    trainer.world.tickWorld();
    expect(oscillators).toHaveLength(3);
  });

  test("loads its saved preference and releases each completed tick sound", () => {
    dispose();
    localStorage.setItem("zeke:metronome-volume", "0.4");
    dispose = installMetronome(trainer);
    trainer.world.tickWorld();
    expect(oscillators).toHaveLength(1);
    const oscillator = oscillators[0];
    expect(oscillator.start).toHaveBeenCalledOnce();
    expect(oscillator.stop.mock.calls[0][0]).toBeGreaterThan(oscillator.start.mock.calls[0][0]);
    expect(oscillator.stop.mock.calls[0][0] - oscillator.start.mock.calls[0][0]).toBeLessThan(0.1);
    oscillator.onended();
    expect(oscillator.disconnect).toHaveBeenCalledOnce();
    expect(gains[0].disconnect).toHaveBeenCalledOnce();
  });

  test("does not add sounds while paused, and reset does not duplicate tick playback", () => {
    vi.spyOn(window, "requestAnimationFrame").mockReturnValue(0);
    vi.spyOn(Viewport.viewport, "draw").mockImplementation(() => {});
    setAudioVolume("metronome", 0.5);
    trainer.world.tickWorld();
    trainer.stop();
    trainer.world.browserLoop(performance.now() + 1000);
    trainer.world.browserLoop(performance.now() + 2000);
    expect(oscillators).toHaveLength(1);
    const ticksBeforeReset = trainer.world.globalTickCounter;
    const soundsBeforeReset = oscillators.length;
    trainer.reset();
    trainer.world.tickWorld();
    expect(trainer.world.globalTickCounter).toBeGreaterThan(ticksBeforeReset);
    expect(oscillators.length - soundsBeforeReset).toBe(trainer.world.globalTickCounter - ticksBeforeReset);
  });

  test("avoids sounds queued during autoplay suspension", () => {
    setAudioVolume("metronome", 0.5);
    context.state = "suspended";
    trainer.world.tickWorld(3);
    expect(oscillators).toHaveLength(0);
    context.state = "running";
    trainer.world.tickWorld();
    expect(oscillators).toHaveLength(1);
  });

  test("keeps one audible tick when the world contains another region", () => {
    trainer.world.addRegion(new TestRegion(12, 12));
    setAudioVolume("metronome", 0.5);
    trainer.world.tickWorld(2);
    expect(oscillators).toHaveLength(2);
  });

  test("disposal stops metronome playback and restores normal ticks", () => {
    setAudioVolume("metronome", 0.5);
    trainer.world.tickWorld();
    dispose();
    dispose();
    const before = trainer.world.globalTickCounter;
    trainer.world.tickWorld();
    expect(trainer.world.globalTickCounter).toBe(before + 1);
    expect(oscillators).toHaveLength(1);
  });
});

describe("SDK sound volumes", () => {
  const originalContext = SoundCache.context;
  const originalPlay = SoundCache.play;
  const gains: { gain: { value: number }; connect: ReturnType<typeof vi.fn> }[] = [];
  const starts = vi.fn();
  let dispose = () => {};

  beforeEach(() => {
    localStorage.clear();
    gains.length = 0;
    starts.mockClear();
    SoundCache.cachedSounds = { tone: buffer };
    SoundCache.setAudioListener(null);
    Object.defineProperty(SoundCache, "context", { configurable: true, writable: true, value: {
      destination: {},
      createBufferSource: () => ({ buffer: null, connect: vi.fn(), start: starts }),
      createGain: () => {
        const gain = { gain: { value: 1 }, connect: vi.fn() };
        gains.push(gain);
        return gain;
      },
    } });
    Settings.set({ playsAudio: true, playsAreaAudio: true });
    dispose = installSoundVolumes();
  });

  afterEach(() => {
    dispose();
    SoundCache.play = originalPlay;
    SoundCache.context = originalContext;
    SoundCache.cachedSounds = {};
    SoundCache.setAudioListener(null);
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  test("mixes effects and spatial area sounds independently without changing the original sound", () => {
    setAudioVolume("effects", 0.25);
    setAudioVolume("area", 0.5);
    const sound = new Sound("tone", 0.8);
    SoundCache.play(sound);
    SoundCache.setAudioListener({ location: { x: 0, y: 0 } });
    SoundCache.play(new Sound("tone", 0.8, 0, { location: { x: 3, y: 0 }, range: 4, retain: 1 }));
    expect(gains.map((gain) => gain.gain.value)).toEqual([0.2, 0.2]);
    expect(starts).toHaveBeenCalledTimes(2);
    expect(sound.volume).toBe(0.8);
  });

  test("uses an explicit area override and keeps the SDK mute controls", () => {
    setAudioVolume("effects", 0.25);
    setAudioVolume("area", 0.5);
    SoundCache.play(new Sound("tone", 0.8), true);
    SoundCache.play(new Sound("tone", 0.8, 0, { location: { x: 0, y: 0 }, range: 4, retain: 1 }), false);
    expect(gains.map((gain) => gain.gain.value)).toEqual([0.4, 0.2]);
    Settings.set({ playsAudio: false, playsAreaAudio: false });
    SoundCache.play(new Sound("tone", 0.8));
    SoundCache.play(new Sound("tone", 0.8), true);
    expect(starts).toHaveBeenCalledTimes(2);
  });

  test("attenuates delayed playback once using the current slider value", () => {
    vi.useFakeTimers();
    setAudioVolume("effects", 0.5);
    SoundCache.play(new Sound("tone", 0.8, 100));
    setAudioVolume("effects", 0.25);
    expect(starts).not.toHaveBeenCalled();
    vi.advanceTimersByTime(100);
    expect(gains.map((gain) => gain.gain.value)).toEqual([0.2]);
    expect(starts).toHaveBeenCalledTimes(1);
  });

  test("attenuates once after loading and delaying an area sound", async () => {
    vi.useFakeTimers();
    delete SoundCache.cachedSounds.tone;
    vi.spyOn(SoundCache, "preload").mockImplementation(async (src) => {
      SoundCache.cachedSounds[src] = buffer;
      return buffer;
    });
    setAudioVolume("area", 0.5);
    SoundCache.play(new Sound("tone", 0.8, 100), true);
    await vi.runAllTimersAsync();
    expect(gains.map((gain) => gain.gain.value)).toEqual([0.4]);
    expect(starts).toHaveBeenCalledTimes(1);
  });

  test("loads saved levels on install and restores SDK playback on disposal", () => {
    dispose();
    expect(SoundCache.play).toBe(originalPlay);
    localStorage.setItem("zeke:effects-volume", "0.25");
    dispose = installSoundVolumes();
    SoundCache.play(new Sound("tone", 0.8));
    dispose();
    dispose();
    SoundCache.play(new Sound("tone", 0.8));
    expect(gains.map((gain) => gain.gain.value)).toEqual([0.2, 0.8]);
    expect(starts).toHaveBeenCalledTimes(2);
  });

  test("silences one channel at zero while the other remains audible", () => {
    setAudioVolume("effects", 0);
    setAudioVolume("area", 0.5);
    SoundCache.play(new Sound("tone", 0.8));
    SoundCache.play(new Sound("tone", 0.8), true);
    expect(gains.map((gain) => gain.gain.value)).toEqual([0.4]);
    expect(starts).toHaveBeenCalledTimes(1);
  });

  test("keeps volume changes audible when storage writes fail", () => {
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => { throw new Error("Storage unavailable"); });
    setAudioVolume("effects", 0.25);
    SoundCache.play(new Sound("tone", 0.8));
    expect(gains.map((gain) => gain.gain.value)).toEqual([0.2]);
  });
});
