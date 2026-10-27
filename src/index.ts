import React from "react";
import { createRoot } from "react-dom/client";

const root = document.getElementById("root");
if (!root) throw new Error("Missing #root element");

const reactRoot = createRoot(root);
if (new URL(window.location.href).searchParams.get("encounter") === "ocellus") {
  void import("./ArchiveOcellusApp").then(({ ArchiveOcellusApp }) => reactRoot.render(React.createElement(ArchiveOcellusApp)));
} else {
  void import("./ZekeApp").then(({ ZekeApp }) => reactRoot.render(React.createElement(ZekeApp)));
}
