import { BaseControls, ControlPanelController, KeyBindingButton, Settings, ToggleButton } from "osrs-sdk";
import type { Component } from "osrs-sdk";

export function installZekeSettingsControls(): () => void {
  const control = ControlPanelController.controls.SETTINGS;
  const originalDraw = control.draw;
  const originalClick = control.panelClickDown;
  const components: readonly Component[] = [
    new KeyBindingButton(() => Settings.inventory_key, 22, 170, () => control.bindingKey === "inventory", () => control.startKeyBinding("inventory"), control.inventoryImage),
    new KeyBindingButton(() => Settings.spellbook_key, 82, 170, () => control.bindingKey === "spellbook", () => control.startKeyBinding("spellbook"), control.spellbookImage),
    new KeyBindingButton(() => Settings.prayer_key, 142, 170, () => control.bindingKey === "prayer", () => control.startKeyBinding("prayer"), control.prayerImage),
    new KeyBindingButton(() => Settings.equipment_key, 22, 220, () => control.bindingKey === "equipment", () => control.startKeyBinding("equipment"), control.equipmentImage),
    new KeyBindingButton(() => Settings.combat_key, 82, 220, () => control.bindingKey === "combat", () => control.startKeyBinding("combat"), control.combatImage),
    new ToggleButton("Menu", 142, 220, () => Settings.menuVisible, () => Settings.setMenuVisible(!Settings.menuVisible)),
  ];

  control.panelClickDown = (panelX: number, panelY: number): void => {
    const x = panelX / Settings.controlPanelScale;
    const y = panelY / Settings.controlPanelScale;
    if (x > 74 && x < 89 && y > 20 && y < 36) Settings.maxUiScale += 0.05;
    else if (x > 75 && x < 89 && y > 51 && y < 67) Settings.maxUiScale -= 0.05;
    else if (x > 100 && x < 115 && y > 20 && y < 36) Settings.inputDelay += 20;
    else if (x > 100 && x < 115 && y > 51 && y < 67) Settings.inputDelay -= 20;
    else for (const component of components) component.onPanelClick(x, y);
    Settings.inputDelay = Math.max(0, Settings.inputDelay);
    Settings.maxUiScale = Math.max(0.5, Math.min(2, Settings.maxUiScale));
    Settings.persistToStorage();
  };

  control.draw = (context: CanvasRenderingContext2D, controller: ControlPanelController, x: number, y: number): void => {
    BaseControls.prototype.draw.call(control, context, controller, x, y);
    const scale = Settings.controlPanelScale;
    context.drawImage(control.redUpImage, x + 74 * scale, y + 20 * scale, control.redUpImage.width * scale, control.redUpImage.height * scale);
    context.fillStyle = "#FFFF00";
    context.font = `${16 * scale}px OSRS`;
    context.textAlign = "center";
    context.fillText(`${Math.round((Settings.maxUiScale - 1) * 100)}%`, x + 79 * scale, y + 48 * scale);
    context.drawImage(control.greenDownImage, x + 74 * scale, y + 51 * scale, control.greenDownImage.width * scale, control.greenDownImage.height * scale);
    context.fillText("UI", x + 80 * scale, y + 81 * scale);
    context.drawImage(control.redUpImage, x + 100 * scale, y + 20 * scale, control.redUpImage.width * scale, control.redUpImage.height * scale);
    context.fillText(String(Settings.inputDelay), x + 106 * scale, y + 48 * scale);
    context.drawImage(control.greenDownImage, x + 100 * scale, y + 51 * scale, control.greenDownImage.width * scale, control.greenDownImage.height * scale);
    context.fillText("Ping", x + 107 * scale, y + 81 * scale);
    context.fillText(control.bindingKey ? "Press Key To Bind" : "Key Bindings", x + 100 * scale, y + 163 * scale);
    for (const component of components) component.draw(context, scale, x, y);
  };

  return () => {
    control.draw = originalDraw;
    control.panelClickDown = originalClick;
  };
}
