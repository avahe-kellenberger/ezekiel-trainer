import { ControlPanelController, ImageLoader, Settings, StandardSpellbookControls, Trainer } from "osrs-sdk";
import { ZEKE_PRESENTATION } from "./assets";
import { WindSurge } from "./WindSurge";

const icon = ZEKE_PRESENTATION.windSurge.sprite;

export class WindSurgeControls extends StandardSpellbookControls {
  private readonly windSurgeIcon = ImageLoader.createImage(`osrs-assets/sprites/${icon.archive}-${icon.frame}.png`);
  override get keyBinding(): string { return Settings.spellbook_key; }
  override get isAvailable(): boolean { return true; }

  private overSpell(x: number, y: number): boolean {
    const scale = Settings.controlPanelScale;
    return x / scale >= 16 && x / scale <= 188 && y / scale >= 44 && y / scale <= 76;
  }

  override panelClickDown(x: number, y: number): void {
    if (this.overSpell(x, y) && Trainer.player.currentStats.magic >= 81) Trainer.player.manualSpellCastSelection = new WindSurge();
  }

  override hoverAction(x: number, y: number) {
    if (!this.overSpell(x, y)) return null;
    const level = Trainer.player.currentStats.magic;
    return level >= 81 ? [{ text: "Cast Wind Surge", fillStyle: "#00ff00" }]
      : [{ text: `Requires 81 Magic (current ${level}).`, fillStyle: "#ff5555" }];
  }

  override draw(context: CanvasRenderingContext2D, controller: ControlPanelController, x: number, y: number): void {
    super.draw(context, controller, x, y);
    const scale = Settings.controlPanelScale;
    context.save();
    context.translate(x, y);
    context.scale(scale, scale);
    context.font = "16px RuneScape";
    context.fillStyle = "#ff981f";
    context.fillText("Standard spellbook", 16, 27);
    if (Trainer.player.manualSpellCastSelection instanceof WindSurge) {
      context.fillStyle = "#D1BB7773";
      context.fillRect(16, 44, 172, 32);
    }
    if (this.windSurgeIcon.complete && this.windSurgeIcon.naturalWidth) context.drawImage(this.windSurgeIcon, 19, 47);
    context.fillStyle = "#ff981f";
    context.fillText("Wind Surge", 55, 65);
    context.font = "14px RuneScape";
    const level = Trainer.player.currentStats.magic;
    context.fillStyle = level >= 81 ? "#ffffff" : "#ff5555";
    context.fillText(level >= 81 ? "Level 81" : `Magic ${level} / 81 required`, 16, 105);
    context.fillStyle = "#ffffff";
    context.fillText("Select, then click a target.", 16, 128);
    context.fillText("Runes supplied for practice.", 16, 151);
    context.fillText("Wind Surge always hits", 16, 180);
    context.fillText("chargeable swords.", 16, 199);
    context.restore();
  }
}

export function installWindSurgeControls(): void {
  const controller = ControlPanelController.controller;
  const previous = ControlPanelController.controls.ANCIENTSSPELLBOOK;
  const control = new WindSurgeControls();
  for (const list of [controller.desktopControls, controller.mobileControls, controller.controls]) {
    const index = list.indexOf(previous);
    if (index >= 0) list[index] = control;
  }
  if (controller.selectedControl === previous) controller.selectedControl = control;
}
