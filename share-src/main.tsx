import { createRoot } from "react-dom/client";
import Game from "../app/Game";
import "../app/globals.css";

const root = document.getElementById("root");

if (!root) {
  throw new Error("无法找到游戏挂载节点");
}

createRoot(root).render(<Game />);
