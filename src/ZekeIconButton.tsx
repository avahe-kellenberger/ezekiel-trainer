import React from "react";

type ButtonIcon = "restart" | "minimize" | "close";

const ICON_PATHS: Readonly<Record<ButtonIcon, string>> = {
  restart: "M4 10a8 8 0 1 1 0 5M4 4v6h6",
  minimize: "M5 18h14",
  close: "M6 6l12 12M18 6L6 18",
};

export function IconButton({ id, label, icon, disabled, onClick }: Readonly<{ id: string; label: string; icon: ButtonIcon; disabled: boolean; onClick: () => void }>) {
  return (
    <button id={id} className="icon_button" type="button" aria-label={label} title={label} disabled={disabled} onClick={onClick}>
      <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false">
        <path d={ICON_PATHS[icon]} />
      </svg>
    </button>
  );
}
