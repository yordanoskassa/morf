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
/* Logo — big pixel wordmark, letters assemble one by one                      */
/* -------------------------------------------------------------------------- */
export const Wordmark: React.FC<{
  children: string;
  fontSize: number;
  startFrame?: number;
  color?: string;
}> = ({ children, fontSize, startFrame = 0, color = theme.ink }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  // rare subtle flicker — as if the program is re-writing itself
  const flick = random(`fl${Math.floor(frame / 6)}`) > 0.93 ? 0.82 : 1;
  return (
    <span style={{ display: "inline-flex", opacity: flick }}>
      {children.split("").map((ch, i) => {
        const s = spring({
          frame: frame - startFrame - i * 5,
          fps,
          config: { damping: 16, mass: 0.7, stiffness: 120 },
        });
        const rise = interpolate(s, [0, 1], [50, 0]);
        const sc = interpolate(s, [0, 1], [1.35, 1]);
        return (
          <span
            key={i}
            style={{
              fontFamily: pixelFont,
              fontSize,
              color,
              letterSpacing: "0.01em",
              transform: `translateY(${rise}px) scale(${sc})`,
              opacity: Math.min(1, s * 1.4),
              display: "inline-block",
            }}
          >
            {ch}
          </span>
        );
      })}
    </span>
  );
};

/* -------------------------------------------------------------------------- */
/* WordPop — words spring in one at a time with a little overshoot            */
/* -------------------------------------------------------------------------- */
export const WordPop: React.FC<{
  lines: (string | { text: string; accent?: boolean; soft?: boolean })[];
  fontSize?: number;
  startFrame?: number;
  gap?: number;
  wordStagger?: number;
}> = ({ lines, fontSize = 90, startFrame = 0, gap = 22, wordStagger = 7 }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  let wordIndex = 0;
  return (
    <div style={{ display: "flex", flexDirection: "column", gap, alignItems: "center", textAlign: "center" }}>
      {lines.map((ln, li) => {
        const obj = typeof ln === "string" ? { text: ln } : ln;
        const color = obj.accent ? theme.accent : obj.soft ? theme.inkSoft : theme.ink;
        const words = obj.text.split(" ");
        return (
          <div key={li} style={{ display: "flex", gap: "0.32em", whiteSpace: "nowrap" }}>
            {words.map((w, wi) => {
              const idx = wordIndex++;
              const s = spring({
                frame: frame - startFrame - idx * wordStagger,
                fps,
                config: { damping: 13, mass: 0.6, stiffness: 130 },
              });
              const sc = interpolate(s, [0, 1], [0.55, 1]);
              const rise = interpolate(s, [0, 1], [26, 0]);
              return (
                <span
                  key={wi}
                  style={{
                    fontFamily: pixelFont,
                    fontSize: obj.soft ? fontSize * 0.62 : fontSize,
                    color,
                    lineHeight: 1.5,
                    display: "inline-block",
                    transform: `translateY(${rise}px) scale(${sc})`,
                    opacity: Math.min(1, s * 1.5),
                  }}
                >
                  {w}
                </span>
              );
            })}
          </div>
        );
      })}
    </div>
  );
};

/* -------------------------------------------------------------------------- */
/* TypeOn — typewriter reveal with blinking block cursor                       */
/* -------------------------------------------------------------------------- */
export const TypeOn: React.FC<{
  lines: (string | { text: string; accent?: boolean })[];
  fontSize?: number;
  startFrame?: number;
  cps?: number;
  gap?: number;
}> = ({ lines, fontSize = 90, startFrame = 0, cps = 24, gap = 22 }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const chars = Math.max(0, Math.floor(((frame - startFrame) / fps) * cps));
  let used = 0;
  const total = lines.reduce(
    (n, ln) => n + (typeof ln === "string" ? ln : ln.text).length,
    0
  );
  return (
    <div style={{ display: "flex", flexDirection: "column", gap, alignItems: "center", textAlign: "center" }}>
      {lines.map((ln, li) => {
        const obj = typeof ln === "string" ? { text: ln } : ln;
        const color = obj.accent ? theme.accent : theme.ink;
        const avail = Math.max(0, Math.min(obj.text.length, chars - used));
        const isTypingHere = chars >= used && chars < used + obj.text.length;
        const isLastLine = li === lines.length - 1;
        used += obj.text.length;
        return (
          <div
            key={li}
            style={{
              fontFamily: pixelFont,
              fontSize,
              color,
              lineHeight: 1.5,
              whiteSpace: "nowrap",
              minHeight: fontSize * 1.5,
            }}
          >
            {obj.text.slice(0, avail)}
            {(isTypingHere || (isLastLine && chars >= total)) && <Cursor color={color} />}
          </div>
        );
      })}
    </div>
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
