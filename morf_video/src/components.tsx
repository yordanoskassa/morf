import React from "react";
import {
  AbsoluteFill,
  interpolate,
  random,
  spring,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { loadFont } from "@remotion/google-fonts/Jersey15";
import { theme } from "./theme";

export const { fontFamily: pixelFont } = loadFont();

/* -------------------------------------------------------------------------- */
/* Paper background — near-white, faint grid, soft light, gentle vignette      */
/* -------------------------------------------------------------------------- */
export const PaperBackground: React.FC = () => {
  return (
    <AbsoluteFill style={{ backgroundColor: theme.paper }}>
      {/* soft top light */}
      <AbsoluteFill
        style={{
          background: `radial-gradient(120% 80% at 50% 32%, #ffffff 0%, ${theme.paper} 60%, #F1EFE9 100%)`,
        }}
      />
      {/* very soft edge vignette */}
      <AbsoluteFill
        style={{ boxShadow: "inset 0 0 260px 60px rgba(0,0,0,0.05)" }}
      />
    </AbsoluteFill>
  );
};

/* -------------------------------------------------------------------------- */
/* Blinking block cursor                                                       */
/* -------------------------------------------------------------------------- */
export const Cursor: React.FC<{ color?: string; size?: number }> = ({
  color = theme.ink,
  size = 1,
}) => {
  const frame = useCurrentFrame();
  const on = Math.floor(frame / 18) % 2 === 0; // slower blink
  return (
    <span
      style={{
        display: "inline-block",
        width: `${0.7 * size}em`,
        height: `${1.0 * size}em`,
        marginLeft: "0.14em",
        transform: "translateY(0.12em)",
        backgroundColor: color,
        opacity: on ? 0.9 : 0,
      }}
    />
  );
};

/* -------------------------------------------------------------------------- */
/* Logo — big pixel wordmark with a rare, gentle 1-frame flicker               */
/* -------------------------------------------------------------------------- */
export const Wordmark: React.FC<{
  children: string;
  fontSize: number;
  startFrame?: number;
  color?: string;
}> = ({ children, fontSize, startFrame = 0, color = theme.ink }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const s = spring({
    frame: frame - startFrame,
    fps,
    config: { damping: 200, mass: 1.1, stiffness: 60 },
  });
  const rise = interpolate(s, [0, 1], [26, 0]);
  // rare subtle flicker — as if the program is re-writing itself
  const flick = random(`fl${Math.floor(frame / 6)}`) > 0.93 ? 0.82 : 1;
  return (
    <span
      style={{
        fontFamily: pixelFont,
        fontSize,
        color,
        letterSpacing: "0.01em",
        transform: `translateY(${rise}px)`,
        opacity: s * flick,
        display: "inline-block",
      }}
    >
      {children}
    </span>
  );
};

/* -------------------------------------------------------------------------- */
/* Statement — a full-screen line (or lines), slow fade + rise                 */
/* Supports an accent word via {accent:'word'}                                 */
/* -------------------------------------------------------------------------- */
export const Statement: React.FC<{
  lines: (string | { text: string; accent?: boolean; soft?: boolean })[];
  startFrame?: number;
  fontSize?: number;
  gap?: number;
}> = ({ lines, startFrame = 0, fontSize = 46, gap = 22 }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const s = spring({
    frame: frame - startFrame,
    fps,
    config: { damping: 200, mass: 1, stiffness: 55 },
  });
  const rise = interpolate(s, [0, 1], [22, 0]);
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap,
        alignItems: "center",
        textAlign: "center",
        transform: `translateY(${rise}px)`,
      }}
    >
      {lines.map((ln, i) => {
        const obj = typeof ln === "string" ? { text: ln } : ln;
        const color = obj.accent
          ? theme.accent
          : obj.soft
          ? theme.inkSoft
          : theme.ink;
        return (
          <span
            key={i}
            style={{
              fontFamily: pixelFont,
              fontSize: obj.soft ? fontSize * 0.62 : fontSize,
              color,
              lineHeight: 1.5,
              letterSpacing: "0.01em",
              whiteSpace: "nowrap",
            }}
          >
            {obj.text}
          </span>
        );
      })}
    </div>
  );
};
