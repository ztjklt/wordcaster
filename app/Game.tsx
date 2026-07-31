"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type FormEvent,
  type PointerEvent as ReactPointerEvent,
} from "react";
import codexDocument from "./game/codex.json";
import {
  ACTION_ORDER,
  CODEX_ACTIONS,
  MAX_INK,
  STARTING_INK,
  WAVE_DEFINITIONS,
  canLearnCampaignAction,
  effectiveInkCost,
  getWaveScaling,
  type ActionId,
  type CodexActionDefinition,
  type GamePhase,
  type VoiceQuality,
} from "./game/core";
import {
  GameEngine,
  type HudSnapshot,
  type SoundKind,
} from "./game/engine";
import type { VoiceSnapshot } from "./game/voice";
import {
  CodexLearningTransactions,
  CodexQuickAccessTransactions,
  WORD_CASTER_CODEX,
  type CodexLearnRequest,
  type CodexQuickAccessRequest,
} from "./game/codexBridge";
import {
  JOYSTICK_MAX_TRAVEL,
  resolveJoystickVector,
  type JoystickKey,
} from "./game/joystick";
import {
  createIncantationVoice,
  type IncantationRecognizerFactory,
  type IncantationSoundProfile,
  type IncantationVoiceInstance,
  type IncantationWord,
} from "../incantation-voice-kit/src/index";
import { GameIcon } from "./GameIcon";

type GameMode = "menu" | "playing" | "paused" | "victory" | "defeat";
type BookTab = number | "index";

interface CodexWord {
  id: string;
  en: string;
  zh: string;
  category: string;
  cost: number;
  type: string;
  usage: string;
}

const ALL_CODEX_WORDS = (codexDocument.words ?? []) as CodexWord[];
const ACTION_BY_ENGLISH = new Map(
  ACTION_ORDER.map((id) => [CODEX_ACTIONS[id].english.toLowerCase(), id]),
);

const EMPTY_HUD: HudSnapshot = {
  started: false,
  phase: "prep",
  phaseLabel: "初始布防",
  phaseTime: "2:00",
  waveIndex: 0,
  waveTitle: WAVE_DEFINITIONS[0].title,
  enemiesActive: 0,
  enemiesQueued: 0,
  playerHealth: 100,
  playerMaxHealth: 100,
  playerDeadFor: 0,
  coreHealth: 600,
  coreMaxHealth: 600,
  ink: STARTING_INK,
  maxInk: MAX_INK,
  nightInkRegenBonus: 0,
  nightInkRegenRemaining: 0,
  unlockedTier: 0,
  daylight: true,
  quickVoiceAccessEnabled: false,
  learnedActions: {},
  starterLessonsCompleted: 0,
  starterLessonsTotal: 3,
  prepTimerStarted: false,
  dailyLessonsLearned: 0,
  dailyLessonLimit: 8,
  dailyLearnedWordKeys: [],
  archers: 0,
  groundSoldiers: 0,
  occupiedTowers: 0,
  towerSlots: 0,
  activeActionId: null,
  activeActionCost: null,
  tool: "blade",
  scaling: getWaveScaling(0),
  mastery: {},
  toast: null,
};

const IDLE_VOICE: VoiceSnapshot = {
  state: "idle",
  transcript: "",
  message: "按住 M 或底部施法按钮说出英文",
};

function mobileInstruction(value: string): string {
  return value
    .replaceAll("按住 M 或底部施法按钮", "按住底部施法按钮")
    .replaceAll("按住 M", "按住底部施法按钮")
    .replaceAll("松开 M", "松开施法按钮")
    .replaceAll("右键", "点按")
    .replaceAll("Esc", "×");
}

const MUTE_KEY = "word-caster-muted";
const LEGACY_MUTE_KEY = "duskwood-defense-muted";

function actionSoundProfile(action: CodexActionDefinition): IncantationSoundProfile {
  if (action.kind === "structure" || action.kind === "trap") return "metal";
  if (action.kind === "unit") return "nature";
  if (action.kind === "food") return "food";
  if (action.id.includes("lightning")) return "electric";
  if (action.id.includes("frost") || action.id.includes("freeze")) return "water";
  if (action.id === "health-potion") return "food";
  return "mystic";
}

const INCANTATION_WORDS: IncantationWord[] = ACTION_ORDER.map((id) => {
  const action = CODEX_ACTIONS[id];
  return {
    id,
    word: action.english,
    color: action.color,
    soundProfile: actionSoundProfile(action),
  };
});

const SOUND_SETTINGS: Record<
  SoundKind,
  { frequency: number; duration: number; type: OscillatorType; volume: number }
> = {
  swing: { frequency: 260, duration: 0.07, type: "sawtooth", volume: 0.03 },
  hit: { frequency: 92, duration: 0.12, type: "square", volume: 0.06 },
  hurt: { frequency: 72, duration: 0.18, type: "sawtooth", volume: 0.055 },
  place: { frequency: 240, duration: 0.12, type: "square", volume: 0.04 },
  break: { frequency: 105, duration: 0.16, type: "triangle", volume: 0.05 },
  pickup: { frequency: 690, duration: 0.1, type: "sine", volume: 0.045 },
  cast: { frequency: 510, duration: 0.18, type: "triangle", volume: 0.05 },
  unlock: { frequency: 760, duration: 0.38, type: "sine", volume: 0.055 },
  wave: { frequency: 150, duration: 0.45, type: "sawtooth", volume: 0.045 },
  boss: { frequency: 58, duration: 0.85, type: "sawtooth", volume: 0.07 },
  win: { frequency: 820, duration: 0.65, type: "triangle", volume: 0.06 },
  lose: { frequency: 64, duration: 0.75, type: "sawtooth", volume: 0.055 },
};

const INCANTATION_PARTICLES = Array.from({ length: 28 }, (_, index) => ({
  angle: `${Math.round((360 / 28) * index + (index % 3) * 4)}deg`,
  distance: `${86 + (index % 5) * 17}px`,
  delay: `${(index % 7) * 18}ms`,
  size: `${3 + (index % 4)}px`,
}));

const QUALITY_NAMES: Record<VoiceQuality, string> = {
  basic: "基础词",
  standard: "完整指令",
  fluent: "流畅表达",
};

function voiceMatchMessage(
  action: CodexActionDefinition,
  intent: {
    quality: VoiceQuality;
    matchKind: "exact" | "joined" | "tolerant";
    recognizedPhrase: string;
  },
  textMode = false,
): string {
  const suffix = textMode ? "文字模式" : QUALITY_NAMES[intent.quality];
  if (intent.matchKind === "joined") {
    return `${intent.recognizedPhrase} → ${action.english} · 连读识别成功 · ${suffix}`;
  }
  if (intent.matchKind === "tolerant") {
    return `${intent.recognizedPhrase} → ${action.english} · 容错识别 · ${suffix}`;
  }
  return `${action.english} · ${suffix}`;
}

function percent(value: number, max: number): number {
  return Math.max(0, Math.min(100, (value / Math.max(1, max)) * 100));
}

function phaseName(phase: GamePhase): string {
  if (phase === "prep") return "白昼";
  if (phase === "intermission") return "白昼";
  if (phase === "wave") return "夜晚";
  if (phase === "victory") return "胜利";
  return "失败";
}

function ActionGlyph({ action }: { action: CodexActionDefinition }) {
  const foodEmoji =
    action.effect.type === "food" ? action.effect.emoji : null;
  const letters = action.english
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2);
  return (
    <span
      className={`action-glyph action-${action.kind}`}
      style={{ "--action-color": action.color } as React.CSSProperties}
      aria-hidden="true"
    >
      {foodEmoji ?? letters}
    </span>
  );
}

function Meter({
  value,
  max,
  tone,
}: {
  value: number;
  max: number;
  tone: "health" | "core";
}) {
  return (
    <span className={`meter meter-${tone}`} aria-hidden="true">
      <i style={{ width: `${percent(value, max)}%` }} />
    </span>
  );
}

function ActionCard({
  action,
  mastery,
}: {
  action: CodexActionDefinition;
  mastery?: HudSnapshot["mastery"][ActionId];
}) {
  const effect = action.effect;
  const footprint =
    effect.type === "structure"
      ? `${effect.footprint.width}×${effect.footprint.height}格`
      : null;
  const healing =
    effect.type === "food" && effect.supplyType === "food"
      ? effect.healing
      : null;
  const drinkBoost =
    effect.type === "food" && effect.supplyType === "drink"
      ? `夜晚 +${effect.nightInkRegen.toFixed(2)}墨/秒 · ${effect.duration}秒`
      : null;
  return (
    <article className="spell-entry">
      <div className="spell-entry-head">
        <ActionGlyph action={action} />
        <div>
          <strong>{action.english}</strong>
          <span>{action.chinese}</span>
        </div>
        <b>{action.inkCost} 墨</b>
      </div>
      <p>{action.description}</p>
      <div className="spell-stats">
        <span>
          {action.kind === "structure" || action.kind === "trap"
            ? "建造"
            : action.kind === "food"
              ? "投掷补给"
              : "言灵"}
        </span>
        {footprint ? <span>{footprint}</span> : null}
        {healing ? <span>治疗 {healing}</span> : null}
        {drinkBoost ? <span>{drinkBoost}</span> : null}
        <span>使用 {mastery?.uses ?? 0}</span>
      </div>
      <blockquote>{action.example}</blockquote>
      {action.english.includes(" ") ? (
        <small className="pronunciation-hint">
          可分开读，也可自然连读；空格不影响识别
        </small>
      ) : null}
    </article>
  );
}

export default function Game({
  recognizerFactory,
}: {
  recognizerFactory?: IncantationRecognizerFactory;
} = {}) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const gameShellRef = useRef<HTMLElement | null>(null);
  const bookFrameRef = useRef<HTMLIFrameElement | null>(null);
  const voiceKitHostRef = useRef<HTMLDivElement | null>(null);
  const bookReadyRef = useRef(false);
  const voiceConsoleRef = useRef<HTMLElement | null>(null);
  const engineRef = useRef<GameEngine | null>(null);
  const voiceRef = useRef<IncantationVoiceInstance | null>(null);
  const codexTransactionsRef = useRef(new CodexLearningTransactions());
  const quickAccessTransactionsRef = useRef(
    new CodexQuickAccessTransactions(),
  );
  const audioRef = useRef<AudioContext | null>(null);
  const modeRef = useRef<GameMode>("menu");
  const bookOpenRef = useRef(false);
  const mutedRef = useRef(false);
  const [mode, setMode] = useState<GameMode>("menu");
  const [hud, setHud] = useState<HudSnapshot>(EMPTY_HUD);
  const [hasSave, setHasSave] = useState(false);
  const [bookOpen, setBookOpen] = useState(false);
  const [bookTab, setBookTab] = useState<BookTab>(0);
  const [bookSearch, setBookSearch] = useState("");
  const [textCommand, setTextCommand] = useState("");
  const [voice, setVoice] = useState<VoiceSnapshot>(IDLE_VOICE);
  const [muted, setMuted] = useState(false);
  const [confirmReset, setConfirmReset] = useState(false);
  const [coarsePointer, setCoarsePointer] = useState(false);
  const [portraitBlocked, setPortraitBlocked] = useState(false);
  const portraitResumeRef = useRef(false);
  const joystickRef = useRef<HTMLDivElement | null>(null);
  const joystickPointerRef = useRef<number | null>(null);
  const joystickKeysRef = useRef(new Set<JoystickKey>());
  const touchActionPointersRef = useRef(new Map<number, 0 | 2>());
  const touchCastingPointerRef = useRef<number | null>(null);
  const canvasFoodPointerRef = useRef<number | null>(null);
  const [incantationEffect, setIncantationEffect] = useState<{
    label: string;
    color: string;
    success: boolean;
  } | null>(null);
  const incantationTimerRef = useRef<number | null>(null);

  const unlockAudio = useCallback(() => {
    if (mutedRef.current) return null;
    if (!audioRef.current || audioRef.current.state === "closed") {
      audioRef.current = new AudioContext();
    }
    if (audioRef.current.state === "suspended") {
      void audioRef.current.resume().catch(() => undefined);
    }
    return audioRef.current;
  }, []);

  const playSound = useCallback(
    (kind: SoundKind) => {
      if (mutedRef.current) return;
      const audio = unlockAudio();
      if (!audio) return;
      const setting = SOUND_SETTINGS[kind];
      const oscillator = audio.createOscillator();
      const gain = audio.createGain();
      const now = audio.currentTime;
      oscillator.type = setting.type;
      oscillator.frequency.setValueAtTime(setting.frequency, now);
      oscillator.frequency.exponentialRampToValueAtTime(
        Math.max(
          38,
          setting.frequency *
            (kind === "pickup" || kind === "unlock" || kind === "win"
              ? 1.5
              : 0.62),
        ),
        now + setting.duration,
      );
      gain.gain.setValueAtTime(setting.volume, now);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + setting.duration);
      oscillator.connect(gain);
      gain.connect(audio.destination);
      oscillator.start();
      oscillator.stop(now + setting.duration);
    },
    [unlockAudio],
  );

  const playIncantationEffect = useCallback(
    (
      success: boolean,
      action?: CodexActionDefinition,
      label?: string,
    ) => {
      if (incantationTimerRef.current !== null) {
        window.clearTimeout(incantationTimerRef.current);
      }
      const color = action?.color ?? (success ? "#63f0d4" : "#e36f7d");
      const effectLabel =
        label ?? action?.english ?? (success ? "INCANTATION" : "NO MATCH");
      setIncantationEffect({ label: effectLabel, color, success });
      incantationTimerRef.current = window.setTimeout(() => {
        setIncantationEffect(null);
        incantationTimerRef.current = null;
      }, success ? 1_850 : 800);
    },
    [],
  );

  const resetJoystick = useCallback(() => {
    const engine = engineRef.current;
    for (const code of joystickKeysRef.current) {
      engine?.keyUp(code);
    }
    joystickKeysRef.current.clear();
    joystickPointerRef.current = null;
    if (joystickRef.current) {
      joystickRef.current.dataset.active = "false";
      joystickRef.current.style.setProperty("--joystick-x", "0px");
      joystickRef.current.style.setProperty("--joystick-y", "0px");
    }
  }, []);

  const releaseTouchControls = useCallback(() => {
    const engine = engineRef.current;
    resetJoystick();
    for (const button of new Set(touchActionPointersRef.current.values())) {
      if (button === 2) engine?.pointerUp(button);
    }
    touchActionPointersRef.current.clear();
    canvasFoodPointerRef.current = null;
    if (touchCastingPointerRef.current !== null) {
      touchCastingPointerRef.current = null;
      voiceRef.current?.cancel();
    }
  }, [resetJoystick]);

  const setBook = useCallback(
    (open: boolean) => {
      bookOpenRef.current = open;
      setBookOpen(open);
      engineRef.current?.releaseInput();
      releaseTouchControls();
      if (!open && modeRef.current === "playing") {
        window.requestAnimationFrame(() => {
          gameShellRef.current?.focus({ preventScroll: true });
        });
      }
    },
    [releaseTouchControls],
  );

  const changeMode = useCallback(
    (next: GameMode) => {
      modeRef.current = next;
      setMode(next);
      engineRef.current?.setPaused(next !== "playing");
      if (next !== "playing") {
        releaseTouchControls();
        voiceRef.current?.cancel();
      }
    },
    [releaseTouchControls],
  );

  useEffect(() => {
    const savedMute =
      window.localStorage.getItem(MUTE_KEY) === "true" ||
      (window.localStorage.getItem(MUTE_KEY) === null &&
        window.localStorage.getItem(LEGACY_MUTE_KEY) === "true");
    if (window.localStorage.getItem(MUTE_KEY) === null) {
      window.localStorage.setItem(MUTE_KEY, String(savedMute));
    }
    mutedRef.current = savedMute;
    // Persisted browser state is intentionally hydrated after the client mounts.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMuted(savedMute);
    setHasSave(GameEngine.hasValidSave());

    let voiceController: IncantationVoiceInstance | null = null;
    const engine = new GameEngine({
      onHud: setHud,
      onSound: playSound,
      onWin: () => changeMode("victory"),
      onLose: () => changeMode("defeat"),
      onBookUnlock: (tier) => {
        setBookTab(tier);
        setBook(true);
      },
      onCastEffect: ({ actionId }) => {
        const action = CODEX_ACTIONS[actionId];
        voiceController?.playSuccess({
          wordId: actionId,
          label: `${action.english} · CAST`,
          color: action.color,
          soundProfile: actionSoundProfile(action),
        });
        playIncantationEffect(true, action);
      },
    });
    engineRef.current = engine;
    engine.emitHud(true);
    const showcase = new URLSearchParams(window.location.search).get("showcase");
    if (showcase === "prep" || showcase === "wave4" || showcase === "wave6") {
      engine.loadShowcase(showcase);
      modeRef.current = "playing";
      setMode("playing");
      if (showcase === "wave4") {
        setBookTab(3);
        setBook(true);
        setVoice({
          state: "listening",
          transcript: "Build a frost ward on the left…",
          message: "正在聆听 · 松开 M 后解析",
        });
      } else {
        setBook(false);
      }
    }

    const reportResolution = (transcript: string) => {
      const command = engine.handleTranscript(transcript, "voice");
      const resolution = command.resolution;
      if (command.status === "rejected") {
        setVoice({
          state: "no-match",
          transcript,
          message: command.reason ?? "言灵未能执行，墨水没有消耗",
        });
        voiceController?.playFailure(
          resolution.kind === "ambiguous" ? "ambiguous" : "unknown",
        );
        playIncantationEffect(false);
        return;
      }
      if (resolution.kind === "action") {
        const action = CODEX_ACTIONS[resolution.intent.actionId];
        setVoice({
          state: "matched",
          transcript,
          message:
            command.status === "blueprint-ready"
              ? `${voiceMatchMessage(action, resolution.intent)} · 请在战场确认位置`
              : voiceMatchMessage(action, resolution.intent),
        });
        if (command.status === "blueprint-ready") {
          voiceController?.playSuccess({
            wordId: action.id,
            label: action.english,
            color: action.color,
            soundProfile: actionSoundProfile(action),
          });
          playIncantationEffect(true, action);
        }
        return;
      }
      if (resolution.kind === "begin-wave") {
        setVoice({
          state: "matched",
          transcript,
          message: "Begin the wave · 召唤门开始涌动",
        });
        voiceController?.playSuccess({
          label: "BEGIN THE WAVE",
          color: "#f4d66d",
          soundProfile: "mystic",
        });
        playIncantationEffect(true, undefined, "BEGIN THE WAVE");
      }
    };
    voiceController = createIncantationVoice({
      target: voiceKitHostRef.current ?? document.body,
      words: INCANTATION_WORDS,
      language: "en-US",
      recognizerFactory,
      volume: savedMute ? 0 : 0.72,
      feedbackMode: "manual",
      shortcuts: false,
      renderUI: false,
      haptics: true,
      onCandidate: (candidate) => {
        if (!candidate.transcript) return;
        setVoice({
          state: "listening",
          transcript: candidate.transcript,
          message: "正在聆听 · 松开后解析",
        });
      },
      onFinalTranscript: ({ transcript }) => {
        if (transcript) reportResolution(transcript);
      },
      onNoMatch: (failure) => {
        const failureMessage = (() => {
          if (failure.message) return failure.message;
          if (failure.reason === "permission") {
            return "麦克风权限未开启 · 请使用文字输入";
          }
          if (failure.reason === "audio-capture") {
            return "无法访问麦克风 · 请检查设备或使用文字输入";
          }
          if (failure.reason === "unsupported") {
            return "当前环境不支持语音识别 · 请使用文字输入";
          }
          if (failure.reason === "network") {
            return "火山语音识别暂时不可用 · 请再试一次";
          }
          return "没有听到清晰的英语";
        })();
        setVoice({
          state:
            failure.reason === "permission" ||
            failure.reason === "unsupported" ||
            failure.reason === "audio-capture"
              ? "unsupported"
              : "no-match",
          transcript: failure.transcript,
          message: failureMessage,
        });
        playIncantationEffect(false);
      },
      onStateChange: ({ state, message }) => {
        if (state === "listening") {
          setVoice((current) => ({
            state: "listening",
            transcript: current.transcript,
            message: "正在聆听 · 松开后解析",
          }));
        } else if (state === "transcribing") {
          setVoice((current) => ({
            state: "processing",
            transcript: current.transcript,
            message,
          }));
        } else if (state === "connecting") {
          setVoice({
            state: "requesting-permission",
            transcript: "",
            message,
          });
        } else if (state === "processing") {
          setVoice((current) => ({
            state: "processing",
            transcript: current.transcript,
            message,
          }));
        } else if (state === "fallback") {
          setVoice({
            state: "unsupported",
            transcript: "",
            message,
          });
        } else if (state === "idle") {
          setVoice((current) =>
            current.state === "matched" || current.state === "no-match"
              ? current
              : { state: "idle", transcript: "", message },
          );
        }
      },
    });
    voiceRef.current = voiceController;

    let frameId = 0;
    let previous = performance.now();
    let accumulator = 0;
    const fixedStep = 1 / 60;
    const animate = (now: number) => {
      accumulator += Math.min(0.1, Math.max(0, (now - previous) / 1000));
      previous = now;
      while (accumulator >= fixedStep) {
        engine.update(fixedStep);
        accumulator -= fixedStep;
      }
      if (canvasRef.current) engine.render(canvasRef.current);
      frameId = requestAnimationFrame(animate);
    };
    frameId = requestAnimationFrame(animate);

    const isTyping = (target: EventTarget | null) =>
      target instanceof HTMLInputElement ||
      target instanceof HTMLTextAreaElement ||
      (target instanceof HTMLElement && target.isContentEditable);

    const onKeyDown = (event: KeyboardEvent) => {
      if (
        ["Space", "ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown", "Tab"].includes(
          event.code,
        ) &&
        !isTyping(event.target)
      ) {
        event.preventDefault();
      }
      if (isTyping(event.target)) return;
      const currentMode = modeRef.current;
      if (event.code === "KeyM") {
        event.preventDefault();
        if (!event.repeat && currentMode === "playing") {
          unlockAudio();
          voiceController?.beginHold();
        }
        return;
      }
      if (
        (event.code === "KeyE" || event.code === "Tab") &&
        currentMode === "playing" &&
        !event.repeat
      ) {
        setBook(!bookOpenRef.current);
        return;
      }
      if (event.code === "Escape" && !event.repeat) {
        if (engine.cancelPlacement()) return;
        if (bookOpenRef.current) {
          setBook(false);
          return;
        }
        if (currentMode === "playing") changeMode("paused");
        else if (currentMode === "paused") changeMode("playing");
        return;
      }
      if (currentMode === "playing") engine.keyDown(event.code);
    };
    const onKeyUp = (event: KeyboardEvent) => {
      if (event.code === "KeyM") {
        event.preventDefault();
        voiceController?.finishHold();
      }
      engine.keyUp(event.code);
    };
    const onPointerUp = (event: PointerEvent) => {
      if (event.pointerType !== "touch") engine.pointerUp(event.button);
    };
    const onBlur = () => {
      engine.releaseInput();
      /*
       * Focusing the same-origin codex iframe also emits a window blur event in
       * Chromium. Wait until focus settles so entering a lesson is not mistaken
       * for leaving the game. The browser's microphone permission panel also
       * temporarily takes focus; cancelling at that point would make the first
       * push-to-talk attempt impossible to finish.
       */
      window.setTimeout(() => {
        if (voiceController?.isRequestingPermission) return;
        const focusIsInsideBook =
          bookOpenRef.current &&
          document.activeElement === bookFrameRef.current &&
          document.hasFocus();
        if (focusIsInsideBook) return;
        engine.save();
        voiceController?.cancel();
        if (modeRef.current === "playing") changeMode("paused");
      }, 0);
    };
    const onBeforeUnload = () => engine.save();
    const onPageHide = () => {
      releaseTouchControls();
      engine.save();
    };
    const onVisibilityChange = () => {
      if (document.visibilityState !== "hidden") return;
      releaseTouchControls();
      engine.save();
      if (modeRef.current === "playing") changeMode("paused");
    };

    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);
    window.addEventListener("pointerup", onPointerUp);
    window.addEventListener("blur", onBlur);
    window.addEventListener("beforeunload", onBeforeUnload);
    window.addEventListener("pagehide", onPageHide);
    document.addEventListener("visibilitychange", onVisibilityChange);

    return () => {
      cancelAnimationFrame(frameId);
      engine.save();
      voiceController?.destroy();
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
      window.removeEventListener("pointerup", onPointerUp);
      window.removeEventListener("blur", onBlur);
      window.removeEventListener("beforeunload", onBeforeUnload);
      window.removeEventListener("pagehide", onPageHide);
      document.removeEventListener("visibilitychange", onVisibilityChange);
      if (incantationTimerRef.current !== null) {
        window.clearTimeout(incantationTimerRef.current);
      }
      const audio = audioRef.current;
      audioRef.current = null;
      if (audio && audio.state !== "closed") {
        void audio.close().catch(() => undefined);
      }
    };
  }, [
    changeMode,
    playIncantationEffect,
    playSound,
    recognizerFactory,
    releaseTouchControls,
    setBook,
    unlockAudio,
  ]);

  useEffect(() => {
    const coarse = window.matchMedia("(pointer: coarse)");
    const refresh = () => {
      const touchPreview =
        new URLSearchParams(window.location.search).get("touch") === "1";
      const isCoarse =
        coarse.matches || navigator.maxTouchPoints > 0 || touchPreview;
      const viewportWidth = window.visualViewport?.width ?? window.innerWidth;
      const viewportHeight =
        window.visualViewport?.height ?? window.innerHeight;
      const portrait = isCoarse && viewportHeight > viewportWidth;
      document.documentElement.style.setProperty(
        "--app-height",
        `${Math.round(viewportHeight)}px`,
      );
      setCoarsePointer(isCoarse);
      setPortraitBlocked(portrait);
      if (portrait) {
        releaseTouchControls();
        if (modeRef.current === "playing") {
          portraitResumeRef.current = true;
          engineRef.current?.setPaused(true);
        }
        voiceRef.current?.cancel();
      } else if (portraitResumeRef.current) {
        portraitResumeRef.current = false;
        if (modeRef.current === "playing") {
          engineRef.current?.setPaused(false);
        }
      }
    };
    refresh();
    coarse.addEventListener?.("change", refresh);
    window.addEventListener("resize", refresh);
    window.addEventListener("orientationchange", refresh);
    window.visualViewport?.addEventListener("resize", refresh);
    return () => {
      coarse.removeEventListener?.("change", refresh);
      window.removeEventListener("resize", refresh);
      window.removeEventListener("orientationchange", refresh);
      window.visualViewport?.removeEventListener("resize", refresh);
    };
  }, [releaseTouchControls]);

  const startNewGame = useCallback(() => {
    unlockAudio();
    codexTransactionsRef.current.clear();
    quickAccessTransactionsRef.current.clear();
    engineRef.current?.newGame();
    setHasSave(true);
    setConfirmReset(false);
    setBook(true);
    setBookTab(0);
    changeMode("playing");
  }, [changeMode, setBook, unlockAudio]);

  const requestNewGame = useCallback(() => {
    if (hasSave) setConfirmReset(true);
    else startNewGame();
  }, [hasSave, startNewGame]);

  const continueGame = useCallback(() => {
    unlockAudio();
    const loaded = engineRef.current?.loadFromStorage() ?? false;
    if (loaded) {
      setBookTab(engineRef.current?.unlockedTier ?? 0);
      setBook(engineRef.current?.needsStarterLessons() ?? false);
      changeMode("playing");
    } else {
      setHasSave(false);
      startNewGame();
    }
  }, [changeMode, setBook, startNewGame, unlockAudio]);

  const returnToMenu = useCallback(() => {
    engineRef.current?.save();
    engineRef.current?.disableQuickVoiceAccess();
    quickAccessTransactionsRef.current.clear();
    setHasSave(GameEngine.hasValidSave());
    setBook(false);
    changeMode("menu");
  }, [changeMode, setBook]);

  const toggleMute = useCallback(() => {
    const next = !mutedRef.current;
    mutedRef.current = next;
    setMuted(next);
    window.localStorage.setItem(MUTE_KEY, String(next));
    voiceRef.current?.setVolume(next ? 0 : 0.72);
    if (!next) playSound("pickup");
  }, [playSound]);

  const pointerPosition = useCallback(
    (event: ReactPointerEvent<HTMLCanvasElement>) => {
      const rect = event.currentTarget.getBoundingClientRect();
      engineRef.current?.pointerMove(
        event.clientX - rect.left,
        event.clientY - rect.top,
      );
    },
    [],
  );

  const syncJoystick = useCallback(
    (element: HTMLDivElement, clientX: number, clientY: number) => {
      const rect = element.getBoundingClientRect();
      const resolved = resolveJoystickVector(
        clientX - (rect.left + rect.width / 2),
        clientY - (rect.top + rect.height / 2),
        JOYSTICK_MAX_TRAVEL,
      );
      element.style.setProperty(
        "--joystick-x",
        `${resolved.x.toFixed(2)}px`,
      );
      element.style.setProperty(
        "--joystick-y",
        `${resolved.y.toFixed(2)}px`,
      );

      const nextKeys = new Set(resolved.keys);
      const engine = engineRef.current;
      for (const code of joystickKeysRef.current) {
        if (!nextKeys.has(code)) engine?.keyUp(code);
      }
      for (const code of nextKeys) {
        if (!joystickKeysRef.current.has(code)) engine?.keyDown(code);
      }
      joystickKeysRef.current = nextKeys;
    },
    [],
  );

  const startJoystick = useCallback(
    (event: ReactPointerEvent<HTMLDivElement>) => {
      event.preventDefault();
      if (joystickPointerRef.current !== null) return;
      joystickPointerRef.current = event.pointerId;
      joystickRef.current = event.currentTarget;
      event.currentTarget.setPointerCapture(event.pointerId);
      event.currentTarget.dataset.active = "true";
      unlockAudio();
      syncJoystick(event.currentTarget, event.clientX, event.clientY);
    },
    [syncJoystick, unlockAudio],
  );

  const moveJoystick = useCallback(
    (event: ReactPointerEvent<HTMLDivElement>) => {
      if (joystickPointerRef.current !== event.pointerId) return;
      event.preventDefault();
      syncJoystick(event.currentTarget, event.clientX, event.clientY);
    },
    [syncJoystick],
  );

  const finishJoystick = useCallback(
    (
      event: ReactPointerEvent<HTMLDivElement>,
      releaseCapture = true,
    ) => {
      event.preventDefault();
      if (joystickPointerRef.current !== event.pointerId) return;
      const element = event.currentTarget;
      resetJoystick();
      if (
        releaseCapture &&
        element.hasPointerCapture(event.pointerId)
      ) {
        element.releasePointerCapture(event.pointerId);
      }
    },
    [resetJoystick],
  );

  const startTouchAction = useCallback(
    (event: ReactPointerEvent<HTMLButtonElement>, button: 0 | 2) => {
      event.preventDefault();
      if (touchActionPointersRef.current.has(event.pointerId)) return;
      touchActionPointersRef.current.set(event.pointerId, button);
      event.currentTarget.setPointerCapture(event.pointerId);
      unlockAudio();
      if (button === 0) {
        engineRef.current?.triggerMobilePrimaryAction();
      } else {
        engineRef.current?.pointerDown(button);
      }
    },
    [unlockAudio],
  );

  const finishTouchAction = useCallback(
    (
      event: ReactPointerEvent<HTMLButtonElement>,
      button: 0 | 2,
      releaseCapture = true,
    ) => {
      event.preventDefault();
      if (touchActionPointersRef.current.get(event.pointerId) !== button) return;
      touchActionPointersRef.current.delete(event.pointerId);
      if (button === 2) engineRef.current?.pointerUp(button);
      if (
        releaseCapture &&
        event.currentTarget.hasPointerCapture(event.pointerId)
      ) {
        event.currentTarget.releasePointerCapture(event.pointerId);
      }
    },
    [],
  );

  const startTouchCasting = useCallback(
    (event: ReactPointerEvent<HTMLButtonElement>) => {
      event.preventDefault();
      if (touchCastingPointerRef.current !== null) return;
      touchCastingPointerRef.current = event.pointerId;
      event.currentTarget.setPointerCapture(event.pointerId);
      unlockAudio();
      voiceRef.current?.beginHold();
    },
    [unlockAudio],
  );

  const finishTouchCasting = useCallback(
    (
      event: ReactPointerEvent<HTMLButtonElement>,
      cancel = false,
      releaseCapture = true,
    ) => {
      event.preventDefault();
      if (touchCastingPointerRef.current !== event.pointerId) return;
      touchCastingPointerRef.current = null;
      if (cancel) voiceRef.current?.cancel();
      else voiceRef.current?.finishHold();
      if (
        releaseCapture &&
        event.currentTarget.hasPointerCapture(event.pointerId)
      ) {
        event.currentTarget.releasePointerCapture(event.pointerId);
      }
    },
    [],
  );

  const handlePointerDown = useCallback(
    (event: ReactPointerEvent<HTMLCanvasElement>) => {
      event.preventDefault();
      pointerPosition(event);
      unlockAudio();
      if (event.pointerType === "touch") {
        const engine = engineRef.current;
        if (engine?.canInteractWithFood()) {
          canvasFoodPointerRef.current = event.pointerId;
          event.currentTarget.setPointerCapture(event.pointerId);
          engine.pointerDown(0);
        } else if (engine?.hasActivePlacement()) {
          engine.pointerDown(2);
          engine.pointerUp(2);
        }
        return;
      }
      engineRef.current?.pointerDown(event.button);
    },
    [pointerPosition, unlockAudio],
  );

  const finishCanvasPointer = useCallback(
    (
      event: ReactPointerEvent<HTMLCanvasElement>,
      releaseCapture = true,
    ) => {
      if (canvasFoodPointerRef.current !== event.pointerId) return;
      event.preventDefault();
      pointerPosition(event);
      canvasFoodPointerRef.current = null;
      engineRef.current?.pointerUp(0);
      if (
        releaseCapture &&
        event.currentTarget.hasPointerCapture(event.pointerId)
      ) {
        event.currentTarget.releasePointerCapture(event.pointerId);
      }
    },
    [pointerPosition],
  );

  const submitTextCommand = useCallback(
    (event: FormEvent) => {
      event.preventDefault();
      const text = textCommand.trim();
      if (!text) return;
      const command = engineRef.current?.handleTranscript(text, "text");
      const resolution = command?.resolution;
      if (command?.status === "rejected") {
        voiceRef.current?.playFailure(
          resolution?.kind === "ambiguous" ? "ambiguous" : "unknown",
        );
        playIncantationEffect(false);
      } else if (resolution?.kind === "begin-wave") {
        voiceRef.current?.playSuccess({
          label: "BEGIN THE WAVE",
          color: "#f4d66d",
          soundProfile: "mystic",
        });
        playIncantationEffect(true, undefined, "BEGIN THE WAVE");
      }
      setVoice({
        state:
          command && command.status !== "rejected"
            ? "matched"
            : "no-match",
        transcript: text,
        message:
          resolution?.kind === "action"
            ? voiceMatchMessage(
                CODEX_ACTIONS[resolution.intent.actionId],
                resolution.intent,
                true,
              )
            : resolution?.kind === "begin-wave"
              ? "Begin the wave · 指令成立"
              : command?.reason ?? "没有找到唯一可执行词条",
      });
      setTextCommand("");
    },
    [playIncantationEffect, textCommand],
  );

  const sendBookState = useCallback(() => {
    if (!bookReadyRef.current) return;
    bookFrameRef.current?.contentWindow?.postMessage(
      {
        type: WORD_CASTER_CODEX.state,
        daylight: hud.daylight,
        waveIndex: hud.waveIndex,
        currentDay: hud.waveIndex + 1,
        unlockedTier: hud.unlockedTier,
        quickVoiceAccessEnabled: hud.quickVoiceAccessEnabled,
        starterLessonsCompleted: hud.starterLessonsCompleted,
        starterLessonsTotal: hud.starterLessonsTotal,
        prepTimerStarted: hud.prepTimerStarted,
        dailyLessonsLearned: hud.dailyLessonsLearned,
        dailyLessonLimit: hud.dailyLessonLimit,
        dailyLearnedWordKeys: hud.dailyLearnedWordKeys,
        requiredStarter: ["Tower", "Archer", "Barricade"],
        learningLockedReason: !hud.daylight
          ? "夜晚只能浏览已学内容，黎明后才能开始新课程"
          : hud.dailyLessonsLearned >= hud.dailyLessonLimit
            ? "今日8个新词已经学满，下一次黎明继续"
            : null,
        campaignActions: ACTION_ORDER.map((id) => ({
          english: CODEX_ACTIONS[id].english,
          chinese: CODEX_ACTIONS[id].chinese,
          tier: CODEX_ACTIONS[id].tier,
          availableFromDay: CODEX_ACTIONS[id].availableFromDay,
          inkCost: CODEX_ACTIONS[id].inkCost,
          kind: CODEX_ACTIONS[id].kind,
          learned: hud.learnedActions[id] ?? 0,
        })),
      },
      window.location.protocol === "file:" ? "*" : window.location.origin,
    );
  }, [
    hud.daylight,
    hud.dailyLearnedWordKeys,
    hud.dailyLessonLimit,
    hud.dailyLessonsLearned,
    hud.learnedActions,
    hud.prepTimerStarted,
    hud.quickVoiceAccessEnabled,
    hud.starterLessonsCompleted,
    hud.starterLessonsTotal,
    hud.unlockedTier,
    hud.waveIndex,
  ]);

  useEffect(() => {
    const onBookMessage = (event: MessageEvent) => {
      if (
        window.location.protocol !== "file:" &&
        event.origin !== window.location.origin
      ) {
        return;
      }
      const data = event.data as
        | {
            type?: string;
            requestId?: string;
            english?: string;
            stars?: number;
            newlyLearned?: boolean;
          }
        | undefined;
      if (!data?.type) return;
      if (
        data.type === WORD_CASTER_CODEX.ready ||
        data.type === "DUSKWOOD_CODEX_READY"
      ) {
        bookReadyRef.current = true;
        sendBookState();
        return;
      }
      if (
        data.type === WORD_CASTER_CODEX.close ||
        data.type === "DUSKWOOD_CODEX_CLOSE"
      ) {
        setBook(false);
        return;
      }
      if (
        data.type === WORD_CASTER_CODEX.reset ||
        data.type === "DUSKWOOD_CODEX_RESET"
      ) {
        engineRef.current?.resetLearnedActions();
        codexTransactionsRef.current.clear();
        quickAccessTransactionsRef.current.clear();
        return;
      }
      if (
        data.type === WORD_CASTER_CODEX.quickAccessRequest &&
        typeof data.requestId === "string"
      ) {
        const request: CodexQuickAccessRequest = {
          type: WORD_CASTER_CODEX.quickAccessRequest,
          requestId: data.requestId,
        };
        const result = quickAccessTransactionsRef.current.process(request, () => {
          const enabled =
            engineRef.current?.enableQuickVoiceAccess() ?? false;
          return {
            accepted: enabled,
            enabled,
            reason: enabled ? undefined : "当前无法开启快速访问",
          };
        });
        bookFrameRef.current?.contentWindow?.postMessage(
          result,
          window.location.protocol === "file:" ? "*" : window.location.origin,
        );
        if (result.accepted && result.enabled) {
          setVoice({
            state: "idle",
            transcript: "",
            message: "常用言灵已授权 · 按住 M 念出英文",
          });
          setBook(false);
        } else {
          setVoice({
            state: "no-match",
            transcript: "",
            message: result.reason ?? "当前无法开启快速访问",
          });
        }
        return;
      }
      if (
        data.type === WORD_CASTER_CODEX.learnRequest &&
        typeof data.requestId === "string" &&
        typeof data.english === "string"
      ) {
        const request: CodexLearnRequest = {
          type: WORD_CASTER_CODEX.learnRequest,
          requestId: data.requestId,
          english: data.english,
          stars: data.stars ?? 1,
          newlyLearned: Boolean(data.newlyLearned),
        };
        const actionId = ACTION_BY_ENGLISH.get(data.english.toLowerCase());
        const result = codexTransactionsRef.current.process(
          request,
          () =>
            engineRef.current?.learnBookWordWithResult(
              request.english,
              request.stars,
              {
                actionId,
                newlyLearned: request.newlyLearned,
              },
            ) ?? {
              accepted: false,
              reason: "战役尚未开始",
              dailyLessonsLearned: hud.dailyLessonsLearned,
              dailyLessonLimit: hud.dailyLessonLimit,
            },
        );
        bookFrameRef.current?.contentWindow?.postMessage(
          result,
          window.location.protocol === "file:" ? "*" : window.location.origin,
        );
        if (result.accepted) {
          playIncantationEffect(
            true,
            actionId ? CODEX_ACTIONS[actionId] : undefined,
            `${data.english} LEARNED`,
          );
        } else {
          voiceRef.current?.playFailure("unknown");
        }
      }
    };
    window.addEventListener("message", onBookMessage);
    return () => window.removeEventListener("message", onBookMessage);
  }, [
    hud.dailyLessonLimit,
    hud.dailyLessonsLearned,
    playIncantationEffect,
    sendBookState,
    setBook,
  ]);

  useEffect(() => {
    if (bookOpen) sendBookState();
  }, [bookOpen, sendBookState]);

  const tierActions = useMemo(
    () =>
      ACTION_ORDER.filter(
        (id) =>
          CODEX_ACTIONS[id].tier === bookTab &&
          typeof bookTab === "number" &&
          bookTab <= hud.unlockedTier,
      ),
    [bookTab, hud.unlockedTier],
  );

  const indexResults = useMemo(() => {
    const query = bookSearch.trim().toLowerCase();
    const results = query
      ? ALL_CODEX_WORDS.filter(
          (word) =>
            word.en.toLowerCase().includes(query) ||
            word.zh.includes(bookSearch.trim()) ||
            word.category.toLowerCase().includes(query),
        )
      : ALL_CODEX_WORDS;
    return results.slice(0, 48);
  }, [bookSearch]);

  const mastered = ACTION_ORDER.filter((id) => (hud.mastery[id]?.uses ?? 0) > 0)
    .sort(
      (a, b) =>
        (hud.mastery[b]?.spokenUses ?? 0) -
        (hud.mastery[a]?.spokenUses ?? 0),
    )
    .slice(0, 8);

  const bookActions = ACTION_ORDER.filter(
    (id) => canLearnCampaignAction(id, hud.waveIndex),
  );
  const nextTierActions = ACTION_ORDER.filter(
    (id) =>
      !canLearnCampaignAction(id, hud.waveIndex) &&
      CODEX_ACTIONS[id].availableFromDay === 4,
  );

  return (
    <main
      ref={gameShellRef}
      tabIndex={-1}
      className={`game-shell mode-${mode} ${bookOpen ? "book-is-open" : ""} ${
        coarsePointer ? "touch-enabled" : ""
      }`}
    >
      <div ref={voiceKitHostRef} className="voice-kit-host" aria-hidden="true" />
      <canvas
        ref={canvasRef}
        className="game-canvas"
        aria-label="Word Caster 言灵守城游戏画面"
        onPointerMove={pointerPosition}
        onPointerDown={handlePointerDown}
        onPointerUp={(event) => finishCanvasPointer(event)}
        onPointerCancel={(event) => finishCanvasPointer(event)}
        onLostPointerCapture={(event) =>
          finishCanvasPointer(event, false)
        }
        onContextMenu={(event) => event.preventDefault()}
      />

      {mode === "menu" ? (
        <section className="menu-overlay">
          <div className="menu-moon" aria-hidden="true" />
          <div className="menu-logo" aria-hidden="true">
            <GameIcon name="book" />
            <b />
            <span>言</span>
          </div>
          <div className="title-block">
            <p className="eyebrow">WORDS BECOME MAGIC</p>
            <h1>Word Caster</h1>
            <h2>言 灵 法 师</h2>
            <p>
              白天在施法魔典学习英语咒词，夜晚念出词语召唤士兵、筑起防线，
              阻挡邪恶法师从召唤门释放的怪物。
            </p>
          </div>
          <div className="menu-actions">
            {hasSave ? (
              <button className="primary-button" type="button" onClick={continueGame}>
                <strong><GameIcon name="shield" />继续守城</strong>
                <span>恢复言灵封印前的战役</span>
              </button>
            ) : null}
            <button
              className={hasSave ? "secondary-button" : "primary-button"}
              type="button"
              onClick={requestNewGame}
            >
              <strong><GameIcon name="sparkles" />开始新战役</strong>
              <span>六关 · 约二十分钟</span>
            </button>
            <button className="quiet-button" type="button" onClick={toggleMute}>
              <GameIcon name={muted ? "volume-off" : "volume"} />
              {muted ? "开启声音" : "静音"}
            </button>
          </div>
          <div className="menu-tips">
            {coarsePointer ? (
              <>
                <span><GameIcon name="mic" />按住中间按钮施法</span>
                <span><GameIcon name="chevron-left" /><GameIcon name="chevron-right" />移动与跳跃</span>
                <span><GameIcon name="sword" /><GameIcon name="place" />战斗与放置</span>
              </>
            ) : (
              <>
                <span><kbd>M</kbd> 按住说话</span>
                <span><kbd>A D</kbd> 移动</span>
                <span><kbd>E</kbd> 施法魔典</span>
              </>
            )}
          </div>
        </section>
      ) : null}

      {mode !== "menu" ? (
        <>
          <section className="top-hud" aria-label="战斗状态">
            <div className="status-card player-status">
              <div className="status-title">
                <span><GameIcon name="heart" />言灵法师</span>
                <strong>{hud.playerHealth}/{hud.playerMaxHealth}</strong>
              </div>
              <Meter value={hud.playerHealth} max={hud.playerMaxHealth} tone="health" />
              <div className="tool-row">
                <button
                  type="button"
                  className={hud.tool === "blade" ? "selected" : ""}
                  onClick={() => engineRef.current?.selectTool("blade")}
                >
                  <kbd>1</kbd><i className="tool-blade" />旧短刀
                </button>
                <button
                  type="button"
                  className={hud.tool === "hammer" ? "selected" : ""}
                  onClick={() => engineRef.current?.selectTool("hammer")}
                >
                  <kbd>2</kbd><i className="tool-hammer" />工匠锤
                </button>
              </div>
            </div>

            <div className="wave-card">
              <span>
                <GameIcon name={hud.daylight ? "sun" : "moon"} />
                {phaseName(hud.phase)} · 第 {hud.waveIndex + 1}/6 关
              </span>
              <strong>{hud.waveTitle.replace(/^第.+?·\s*/, "")}</strong>
              <div>
                <b><GameIcon name="hourglass" />{hud.phaseTime}</b>
                <small>
                  敌人 {hud.enemiesActive}
                  {hud.enemiesQueued ? ` ＋ 队列${hud.enemiesQueued}` : ""}
                </small>
              </div>
            </div>

            <div className="status-card core-status">
              <div className="status-title">
                <span><GameIcon name="shield" />言灵封印</span>
                <strong>{hud.coreHealth}/{hud.coreMaxHealth}</strong>
              </div>
              <Meter value={hud.coreHealth} max={hud.coreMaxHealth} tone="core" />
              <div className="battle-details">
                <p>
                  {hud.waveIndex >= 5 ? "本关" : "下一关"}：生命 ×
                  {(hud.waveIndex >= 5
                    ? hud.scaling.healthMultiplier
                    : hud.scaling.healthMultiplier * 1.18
                  ).toFixed(2)}
                  {" · "}攻击 ×
                  {(hud.waveIndex >= 5
                    ? hud.scaling.damageMultiplier
                    : hud.scaling.damageMultiplier * 1.12
                  ).toFixed(2)}
                </p>
                <p>
                  <GameIcon name="tower" />塔位 {hud.occupiedTowers}/{hud.towerSlots}
                  {" · "}<GameIcon name="troops" />守军{" "}
                  {Math.max(0, hud.archers - hud.occupiedTowers) + hud.groundSoldiers}
                </p>
              </div>
            </div>
          </section>

          <section className="ink-bottle-wrap" aria-label={`墨水 ${hud.ink}/${hud.maxInk}`}>
            <div className="ink-bottle">
              <i
                className="ink-liquid"
                style={{ height: `${percent(hud.ink, hud.maxInk) * 0.72}%` }}
              />
              <span className="bottle-shine" />
            </div>
            <div>
              <span><GameIcon name="drop" />INK</span>
              <strong>{hud.ink}<small>/{hud.maxInk}</small></strong>
              {hud.nightInkRegenBonus > 0 ? (
                <small className="ink-regen">
                  ☕ +{hud.nightInkRegenBonus.toFixed(2)}/秒 · {Math.ceil(hud.nightInkRegenRemaining)}秒
                </small>
              ) : null}
            </div>
          </section>

          <section
            ref={voiceConsoleRef}
            className={`voice-console voice-${voice.state}`}
            aria-live="polite"
          >
            <div className="mic-rune" aria-hidden="true">
              <GameIcon name="mic" />
              <i />
              <b />
            </div>
            <div>
              <span>
                {voice.transcript ||
                  (coarsePointer
                    ? mobileInstruction(voice.message)
                    : voice.message)}
              </span>
              {voice.transcript ? (
                <strong>
                  {coarsePointer
                    ? mobileInstruction(voice.message)
                    : voice.message}
                </strong>
              ) : null}
            </div>
            <kbd>M</kbd>
          </section>

          {voice.state === "unsupported" || voice.state === "no-match" ? (
            <form className="voice-text-fallback" onSubmit={submitTextCommand}>
              <input
                value={textCommand}
                onChange={(event) => setTextCommand(event.target.value)}
                placeholder="输入已学会的英文言灵"
                aria-label="输入已学会的英文言灵"
              />
              <button type="submit">写入</button>
            </form>
          ) : null}

          {incantationEffect ||
          voice.state === "listening" ||
          voice.state === "processing" ? (
            <div
              className={`incantation-feedback ${
                incantationEffect
                  ? incantationEffect.success
                    ? "success"
                    : "failure"
                  : voice.state
              }`}
              style={
                {
                  "--incantation-color":
                    incantationEffect?.color ?? "#f2d47c",
                } as React.CSSProperties
              }
              role="status"
              aria-live="assertive"
            >
              <div className="incantation-feedback-aura" aria-hidden="true">
                <i />
                <i />
                <i />
              </div>
              <strong>
                {incantationEffect?.label ??
                  (voice.transcript.trim() || "…")}
              </strong>
              {incantationEffect?.success ? (
                <div className="incantation-particles" aria-hidden="true">
                  {INCANTATION_PARTICLES.map((particle, index) => (
                    <i
                      key={index}
                      style={
                        {
                          "--particle-angle": particle.angle,
                          "--particle-distance": particle.distance,
                          "--particle-delay": particle.delay,
                          "--particle-size": particle.size,
                        } as React.CSSProperties
                      }
                    />
                  ))}
                </div>
              ) : null}
            </div>
          ) : null}

          {hud.activeActionId ? (
            <div className="blueprint-banner">
              <ActionGlyph action={CODEX_ACTIONS[hud.activeActionId]} />
              <div>
                <span>蓝图已激活</span>
                <strong>{CODEX_ACTIONS[hud.activeActionId].chinese}</strong>
              </div>
              <b>{hud.activeActionCost} 墨</b>
              <small>
                {coarsePointer
                  ? "点战场直接放置 · 点 × 取消"
                  : "右键放置 · Esc取消"}
              </small>
            </div>
          ) : null}

          {hud.toast ? (
            <div className="game-toast">
              {coarsePointer ? mobileInstruction(hud.toast) : hud.toast}
            </div>
          ) : null}

          {hud.playerDeadFor > 0 ? (
            <div className="respawn-banner">
              <strong>言灵法师倒下了</strong>
              <span>{hud.playerDeadFor.toFixed(1)} 秒后在言灵封印旁复活</span>
            </div>
          ) : null}

          <button
            className={`book-button ${bookOpen ? "open" : ""}`}
            type="button"
            onClick={() => setBook(!bookOpen)}
            aria-label={bookOpen ? "合上施法魔典" : "打开施法魔典"}
          >
            <GameIcon name="book" />
            <span>施法魔典</span>
            <b>
              {
                bookActions.filter(
                  (id) => (hud.learnedActions[id] ?? 0) > 0,
                ).length
              }
            </b>
          </button>

          <aside
            className={`codex-portal ${bookOpen ? "open" : ""}`}
            aria-hidden={!bookOpen}
          >
            <div className="codex-portal-frame">
              <div className="codex-portal-status">
                <span>
                  {hud.daylight
                    ? hud.prepTimerStarted
                      ? `☀ 白昼 · 剩余 ${hud.phaseTime} · 可学习`
                      : `☀ 首日必修 ${hud.starterLessonsCompleted}/${hud.starterLessonsTotal} · 计时尚未开始`
                    : `☾ 第${hud.waveIndex + 1}夜 · 只读浏览`}
                </span>
                <small>世界时间仍在流动</small>
                <button
                  type="button"
                  onClick={() => setBook(false)}
                  aria-label="合上施法魔典"
                >
                  <GameIcon name="close" />
                </button>
              </div>
              <iframe
                ref={bookFrameRef}
                src="./book/index.html"
                title="Caster’s Grimoire 施法魔典学习页面"
              />
            </div>
          </aside>

          {coarsePointer && mode === "playing" && !bookOpen && !portraitBlocked ? (
            <section className="touch-controls" aria-label="手机战斗控制">
              <div
                ref={joystickRef}
                className="touch-joystick"
                role="group"
                aria-label="四向移动摇杆：上跳，下落，左右移动"
                data-active="false"
                onPointerDown={startJoystick}
                onPointerMove={moveJoystick}
                onPointerUp={(event) => finishJoystick(event)}
                onPointerCancel={(event) => finishJoystick(event)}
                onLostPointerCapture={(event) =>
                  finishJoystick(event, false)
                }
              >
                <span
                  className="joystick-guide joystick-guide-horizontal"
                  aria-hidden="true"
                />
                <span
                  className="joystick-guide joystick-guide-vertical"
                  aria-hidden="true"
                />
                <span className="joystick-knob" aria-hidden="true" />
              </div>
              <button
                type="button"
                className={`touch-cast voice-${voice.state}`}
                aria-label="按住施法"
                onPointerDown={startTouchCasting}
                onPointerUp={(event) => finishTouchCasting(event)}
                onPointerCancel={(event) => finishTouchCasting(event, true)}
                onLostPointerCapture={(event) =>
                  finishTouchCasting(event, true, false)
                }
              >
                <GameIcon name="mic" />
                <strong>{voice.state === "listening" ? "松开施法" : "按住施法"}</strong>
              </button>
              <div className="touch-actions">
                <button
                  type="button"
                  className="touch-primary"
                  aria-label={
                    hud.tool === "blade" ? "向前近战攻击" : "拆除选中的建筑"
                  }
                  onPointerDown={(event) => startTouchAction(event, 0)}
                  onPointerUp={(event) => finishTouchAction(event, 0)}
                  onPointerCancel={(event) => finishTouchAction(event, 0)}
                  onLostPointerCapture={(event) =>
                    finishTouchAction(event, 0, false)
                  }
                >
                  <GameIcon name={hud.tool === "blade" ? "sword" : "hammer"} />
                </button>
                <button
                  type="button"
                  className="touch-place"
                  aria-label="放置或确认"
                  onPointerDown={(event) => startTouchAction(event, 2)}
                  onPointerUp={(event) => finishTouchAction(event, 2)}
                  onPointerCancel={(event) => finishTouchAction(event, 2)}
                  onLostPointerCapture={(event) =>
                    finishTouchAction(event, 2, false)
                  }
                >
                  <GameIcon name="place" />
                </button>
                <button
                  type="button"
                  className="touch-tool"
                  aria-label={
                    hud.activeActionId ? "取消当前放置" : "切换工具"
                  }
                  onPointerDown={(event) => event.preventDefault()}
                  onClick={() =>
                    hud.activeActionId
                      ? engineRef.current?.cancelPlacement()
                      : engineRef.current?.selectTool(
                          hud.tool === "blade" ? "hammer" : "blade",
                        )
                  }
                >
                  {hud.activeActionId
                    ? <GameIcon name="close" />
                    : hud.tool === "blade"
                      ? <GameIcon name="hammer" />
                      : <GameIcon name="sword" />}
                </button>
                <button
                  type="button"
                  className="touch-pause"
                  aria-label="暂停"
                  onPointerDown={(event) => event.preventDefault()}
                  onClick={() => changeMode("paused")}
                >
                  <GameIcon name="pause" />
                </button>
              </div>
            </section>
          ) : null}
        </>
      ) : null}

      {mode === "paused" ? (
        <section className="modal-backdrop">
          <article className="pause-card">
            <p className="eyebrow">THE WORDS REST</p>
            <div className="modal-sigil"><GameIcon name="moon" /></div>
            <h2>战斗已暂停</h2>
            <p>麦克风已经关闭，怪物和关卡时间不会前进。</p>
            <button className="primary-button" type="button" onClick={() => changeMode("playing")}>
              <strong>继续守护封印</strong>
            </button>
            <button className="secondary-button" type="button" onClick={returnToMenu}>
              返回主菜单
            </button>
          </article>
        </section>
      ) : null}

      {mode === "victory" || mode === "defeat" ? (
        <section className="modal-backdrop">
          <article className={`outcome-card ${mode}`}>
            <p className="eyebrow">
              {mode === "victory" ? "THE PORTAL CLOSES" : "THE SEAL SHATTERS"}
            </p>
            <div className="modal-sigil">
              <GameIcon name={mode === "victory" ? "sparkles" : "shield"} />
            </div>
            <h2>{mode === "victory" ? "召唤门终于关闭" : "言灵封印破碎了"}</h2>
            <p>
              {mode === "victory"
                ? "六个夜晚的怪潮已经结束。邪恶法师的传送门失去力量，你熟悉的英语词语都已成为真正的魔法。"
                : `邪恶法师在第${hud.waveIndex + 1}夜击碎了封印。重新学习并筑起防线，再试一次。`}
            </p>
            {mastered.length > 0 ? (
              <div className="mastery-summary">
                <span>本次最熟悉的言灵</span>
                {mastered.map((id) => (
                  <div key={id}>
                    <strong>{CODEX_ACTIONS[id].english}</strong>
                    <small>
                      口语 {hud.mastery[id]?.spokenUses ?? 0} · 流畅{" "}
                      {hud.mastery[id]?.fluentUses ?? 0}
                    </small>
                  </div>
                ))}
              </div>
            ) : null}
            <button className="primary-button" type="button" onClick={startNewGame}>
              <strong>重新开始战役</strong>
            </button>
            <button className="secondary-button" type="button" onClick={returnToMenu}>
              返回主菜单
            </button>
          </article>
        </section>
      ) : null}

      {confirmReset ? (
        <section className="modal-backdrop confirm-layer">
          <article className="pause-card">
            <p className="eyebrow">REWRITE THE BOOK</p>
            <h2>覆盖当前战役？</h2>
            <p>现有的六关进度、建筑和熟练度会被新的战役替换。</p>
            <button
              className="danger-button"
              type="button"
              onClick={() => {
                engineRef.current?.clearSave();
                startNewGame();
              }}
            >
              确认重新开始
            </button>
            <button className="secondary-button" type="button" onClick={() => setConfirmReset(false)}>
              保留当前存档
            </button>
          </article>
        </section>
      ) : null}

      {mode !== "menu" ? (
        <button
          className="sound-button"
          type="button"
          onClick={toggleMute}
          aria-label={muted ? "开启声音" : "关闭声音"}
        >
          <GameIcon name={muted ? "volume-off" : "volume"} />
        </button>
      ) : null}

      {portraitBlocked ? (
        <section className="rotate-device" role="dialog" aria-live="assertive">
          <div className="rotate-phone" aria-hidden="true">
            <GameIcon name="rotate" />
          </div>
          <h2>请横置手机</h2>
          <p>Word Caster 已暂停并关闭麦克风。旋转到横屏后继续守护言灵封印。</p>
        </section>
      ) : null}
    </main>
  );
}
