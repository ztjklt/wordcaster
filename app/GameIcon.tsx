export type GameIconName =
  | "book"
  | "shield"
  | "heart"
  | "drop"
  | "hourglass"
  | "sword"
  | "hammer"
  | "volume"
  | "volume-off"
  | "mic"
  | "chevron-left"
  | "chevron-right"
  | "jump"
  | "place"
  | "close"
  | "pause"
  | "info"
  | "tower"
  | "troops"
  | "sparkles"
  | "sun"
  | "moon"
  | "rotate"
  | "menu";

export function GameIcon({
  name,
  className,
}: {
  name: GameIconName;
  className?: string;
}) {
  return (
    <svg
      className={className ? `game-icon ${className}` : "game-icon"}
      aria-hidden="true"
      focusable="false"
    >
      <use href={`./ui/icons.svg#${name}`} />
    </svg>
  );
}
