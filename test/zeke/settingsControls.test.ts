import { ControlPanelController, SETTINGS_STORAGE_KEY, Settings } from "osrs-sdk";
import { installZekeSettingsControls } from "../../src/content/zeke/settingsControls";

const control = ControlPanelController.controls.SETTINGS;
let uninstall = () => {};
let originalScale = 1;

beforeEach(() => {
  vi.useFakeTimers();
  localStorage.clear();
  Settings.readFromStorage();
  Settings.set({ maxUiScale: 1, inputDelay: 0, playsAudio: false, playsAreaAudio: false, metronome: false, menuVisible: true });
  originalScale = Settings.controlPanelScale;
  Settings.controlPanelScale = 2;
  control.bindingKey = undefined;
  Settings.is_keybinding = false;
  uninstall = installZekeSettingsControls();
});

afterEach(() => {
  uninstall();
  control.bindingKey = undefined;
  Settings.is_keybinding = false;
  Settings.controlPanelScale = originalScale;
  vi.runOnlyPendingTimers();
  vi.useRealTimers();
  vi.restoreAllMocks();
});

function click(x: number, y: number): void {
  control.panelClickDown(x * Settings.controlPanelScale, y * Settings.controlPanelScale);
}

it.each([false, true])("removed audio controls leave sound settings unchanged when enabled is %s", (enabled) => {
  Settings.set({ playsAudio: enabled, playsAreaAudio: enabled, metronome: enabled });
  click(20, 20);
  click(20, 60);
  click(140, 20);
  expect(Settings.getSnapshot()).toMatchObject({ playsAudio: enabled, playsAreaAudio: enabled, metronome: enabled });
});

it("retains scaled UI and ping controls, their limits, and saved changes", () => {
  click(80, 25);
  expect(Settings.maxUiScale).toBeCloseTo(1.05);
  click(80, 55);
  expect(Settings.maxUiScale).toBeCloseTo(1);
  click(105, 25);
  expect(Settings.inputDelay).toBe(20);
  click(105, 55);
  click(105, 55);
  expect(Settings.inputDelay).toBe(0);
  Settings.maxUiScale = 2;
  click(80, 25);
  expect(Settings.maxUiScale).toBe(2);
  Settings.maxUiScale = 0.5;
  click(80, 55);
  expect(Settings.maxUiScale).toBe(0.5);
  Settings.set({ maxUiScale: 1, inputDelay: 0 });
  click(80, 25);
  click(105, 25);
  Settings.maxUiScale = 1;
  Settings.inputDelay = 0;
  Settings.readFromStorage();
  expect(Settings.maxUiScale).toBeCloseTo(1.05);
  expect(Settings.inputDelay).toBe(20);
});

it.each([
  { x: 22, y: 170, field: "inventory_key" },
  { x: 82, y: 170, field: "spellbook_key" },
  { x: 142, y: 170, field: "prayer_key" },
  { x: 22, y: 220, field: "equipment_key" },
  { x: 82, y: 220, field: "combat_key" },
] as const)("retains the $field binding button and SDK key capture", ({ x, y, field }) => {
  click(x, y);
  expect(Settings.is_keybinding).toBe(true);
  const event = new KeyboardEvent("keydown", { key: "q", cancelable: true });
  document.dispatchEvent(event);
  expect(event.defaultPrevented).toBe(true);
  expect(Settings.getSnapshot()[field]).toBe("q");
  expect(localStorage.getItem(SETTINGS_STORAGE_KEY)).toContain('"q"');
  vi.advanceTimersByTime(20);
  expect(Settings.is_keybinding).toBe(false);
});

it("retains the Menu toggle", () => {
  click(142, 220);
  expect(Settings.menuVisible).toBe(false);
  click(142, 220);
  expect(Settings.menuVisible).toBe(true);
});

it("draws the remaining settings and binding prompt without sound icons or metronome", () => {
  const drawing = { drawImage: vi.fn(), fillText: vi.fn(), save: vi.fn(), restore: vi.fn() };
  const context = drawing as unknown as CanvasRenderingContext2D;
  control.draw(context, ControlPanelController.controller, 10, 30);
  const labels = drawing.fillText.mock.calls.map(([label]) => label);
  expect(labels).toEqual(expect.arrayContaining(["UI", "Ping", "Key Bindings", "Menu"]));
  expect(labels).not.toContain("Metronome");
  const images = drawing.drawImage.mock.calls.map(([image]) => image);
  expect(images).toEqual(expect.arrayContaining([control.panelImage, control.redUpImage, control.greenDownImage, control.inventoryImage, control.spellbookImage, control.prayerImage, control.equipmentImage, control.combatImage]));
  expect(images).not.toContain(control.soundImage);
  expect(images).not.toContain(control.areaSoundImage);
  click(22, 170);
  drawing.fillText.mockClear();
  control.draw(context, ControlPanelController.controller, 10, 30);
  expect(drawing.fillText).toHaveBeenCalledWith("Press Key To Bind", 210, 356);
});

it("restores SDK audio control behavior when uninstalled", () => {
  uninstall();
  click(20, 20);
  expect(Settings.playsAudio).toBe(true);
});
