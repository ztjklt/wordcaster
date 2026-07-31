"use client";

import Game from "./Game";
import { createArkRecognizer } from "./game/arkRecognizer";

export default function HostedGame() {
  return <Game recognizerFactory={createArkRecognizer} />;
}
