import React from "react";
import {
  AbsoluteFill,
  Img,
  interpolate,
  Sequence,
  spring,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { theme } from "./theme";
import { Cursor, PaperBackground, pixelFont, Statement, Wordmark } from "./components";

/* -------------------------------------------------------------------------- */
/* Beat — fade in/out envelope for one full-screen moment                      */
/* -------------------------------------------------------------------------- */
const Beat: React.FC<{
  children: React.ReactNode;
  durationInFrames: number;
  fadeIn?: number;
  fadeOut?: number;
}> = ({ children, durationInFrames, fadeIn = 22, fadeOut = 22 }) => {
  const frame = useCurrentFrame();
  const opacity = interpolate(
    frame,
    [0, fadeIn, durationInFrames - fadeOut, durationInFrames],
    [0, 1, 1, 0],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
  );
  return (
    <AbsoluteFill
      style={{ opacity, justifyContent: "center", alignItems: "center", padding: 120 }}
    >
      {children}
    </AbsoluteFill>
  );
};

/* thin rule that draws itself from the centre */
const Rule: React.FC<{ startFrame: number; width?: number }> = ({
  startFrame,
  width = 320,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const s = spring({ frame: frame - startFrame, fps, config: { damping: 200 } });
  return <div style={{ width: s * width, height: 3, backgroundColor: theme.ink, opacity: 0.75 }} />;
};

/* ========================================================================== */
/* STATUE BEAT (landscape) — statue anchored left, caption right              */
/* ========================================================================== */
const StatueBeat: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const s = spring({ frame, fps, config: { damping: 200, mass: 1.4, stiffness: 45 } });
  const scale = interpolate(s, [0, 1], [1.05, 1]);
  const textS = spring({ frame: frame - 40, fps, config: { damping: 200 } });
  const textX = interpolate(textS, [0, 1], [26, 0]);
  return (
    <AbsoluteFill>
      {/* statue */}
      <AbsoluteFill style={{ justifyContent: "flex-end", alignItems: "flex-start" }}>
        <Img
          src={staticFile("statue.png")}
          style={{
            height: "112%",
            marginLeft: "3%",
            transform: `scale(${scale})`,
            transformOrigin: "bottom left",
            mixBlendMode: "multiply",
            filter: "grayscale(1) contrast(1.16) brightness(1.03)",
            WebkitMaskImage:
              "linear-gradient(90deg, #000 46%, transparent 82%), linear-gradient(0deg, #000 78%, transparent 100%)",
            WebkitMaskComposite: "source-in",
            maskImage:
              "linear-gradient(90deg, #000 46%, transparent 82%), linear-gradient(0deg, #000 78%, transparent 100%)",
            maskComposite: "intersect",
          }}
        />
      </AbsoluteFill>
      {/* soft top wash so the grainy sky lifts toward paper */}
      <AbsoluteFill
        style={{
          background: `linear-gradient(180deg, ${theme.paper} 0%, transparent 26%)`,
        }}
      />
      {/* caption on the right */}
      <AbsoluteFill style={{ justifyContent: "center", alignItems: "flex-end", paddingRight: "9%" }}>
        <div
          style={{
            textAlign: "right",
            opacity: textS,
            transform: `translateX(${textX}px)`,
            maxWidth: 720,
          }}
        >
          <div style={{ fontFamily: pixelFont, fontSize: 96, color: theme.ink, lineHeight: 1.05 }}>
            software that
          </div>
          <div style={{ fontFamily: pixelFont, fontSize: 96, color: theme.ink, lineHeight: 1.05 }}>
            builds itself.
          </div>
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

/* ========================================================================== */
/* TOOLS BEAT — the four real tools + how morf uses each                      */
/* ========================================================================== */
type Tool = { img: string; name: string; use: string; h: number };
const TOOLS: Tool[] = [
  { img: "logos/fireworks.png", name: "Fireworks", use: "3 open models race", h: 84 },
  { img: "logos/daytona.svg", name: "Daytona", use: "each build in a sandbox", h: 92 },
  { img: "logos/braintrust.png", name: "Braintrust", use: "scores it so nothing breaks", h: 90 },
  { img: "logos/elevenlabs.svg", name: "ElevenLabs", use: "talk to it out loud", h: 74 },
];

const ToolsBeat: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const headS = spring({ frame, fps, config: { damping: 200 } });
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 96 }}>
      <div style={{ textAlign: "center", opacity: headS }}>
        <div style={{ fontFamily: pixelFont, fontSize: 64, color: theme.ink }}>four tools, one loop</div>
        <div style={{ fontFamily: pixelFont, fontSize: 34, color: theme.inkSoft, marginTop: 8 }}>
          this is how morf builds
        </div>
      </div>
      <div style={{ display: "flex", gap: 92, alignItems: "flex-end" }}>
        {TOOLS.map((t, i) => {
          const start = 18 + i * 16;
          const s = spring({ frame: frame - start, fps, config: { damping: 200, stiffness: 60 } });
          const rise = interpolate(s, [0, 1], [24, 0]);
          return (
            <div
              key={t.name}
              style={{
                width: 300,
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: 26,
                opacity: s,
                transform: `translateY(${rise}px)`,
              }}
            >
              <div style={{ height: 110, display: "flex", alignItems: "center" }}>
                <Img
                  src={staticFile(t.img)}
                  style={{ height: t.h, imageRendering: "auto" }}
                />
              </div>
              <div style={{ fontFamily: pixelFont, fontSize: 40, color: theme.ink }}>{t.name}</div>
              <div
                style={{
                  fontFamily: pixelFont,
                  fontSize: 27,
                  color: theme.inkSoft,
                  lineHeight: 1.25,
                  textAlign: "center",
                }}
              >
                {t.use}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

/* ========================================================================== */
/* INTRO + OUTRO                                                              */
/* ========================================================================== */
const IntroBeat: React.FC = () => (
  <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 46 }}>
    <Wordmark fontSize={230} startFrame={6}>
      morf
    </Wordmark>
  </div>
);

const OutroBeat: React.FC = () => {
  const frame = useCurrentFrame();
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 40 }}>
      <Wordmark fontSize={230} startFrame={4}>
        morf
      </Wordmark>
      {frame > 34 && (
        <div style={{ fontFamily: pixelFont, fontSize: 52, color: theme.ink }}>
          the app that builds itself
        </div>
      )}
      {frame > 60 && (
        <div style={{ fontFamily: pixelFont, fontSize: 34, color: theme.inkSoft, marginTop: 12 }}>
          ~/ becoming
          <Cursor color={theme.ink} />
        </div>
      )}
    </div>
  );
};

/* ========================================================================== */
/* ROOT — slow, one thought at a time                                        */
/* ========================================================================== */
export const MorphAd: React.FC = () => {
  let t = 0;
  const at = (len: number) => {
    const from = t;
    t += len;
    return { from, len };
  };

  const intro = at(120);
  const s1 = at(118);
  const statue = at(180);
  const s2 = at(118);
  const s3 = at(118);
  const s4 = at(122);
  const tools = at(190); // real logos + how we use them
  const s5 = at(124);
  const s6 = at(124);
  const outro = at(150);

  const H = 92; // headline size for Jersey15 landscape

  return (
    <AbsoluteFill style={{ backgroundColor: theme.paper }}>
      <PaperBackground />

      <Sequence from={intro.from} durationInFrames={intro.len}>
        <Beat durationInFrames={intro.len}>
          <IntroBeat />
        </Beat>
      </Sequence>

      <Sequence from={s1.from} durationInFrames={s1.len}>
        <Beat durationInFrames={s1.len}>
          <Statement lines={["asking for a feature", "used to mean waiting."]} fontSize={H} />
        </Beat>
      </Sequence>

      <Sequence from={statue.from} durationInFrames={statue.len}>
        <Beat durationInFrames={statue.len} fadeIn={26} fadeOut={26}>
          <StatueBeat />
        </Beat>
      </Sequence>

      <Sequence from={s2.from} durationInFrames={s2.len}>
        <Beat durationInFrames={s2.len}>
          <Statement lines={["now you just", "describe it."]} fontSize={H} />
        </Beat>
      </Sequence>

      <Sequence from={s3.from} durationInFrames={s3.len}>
        <Beat durationInFrames={s3.len}>
          <Statement lines={["3 AI models race", "to build it."]} fontSize={H} />
        </Beat>
      </Sequence>

      <Sequence from={s4.from} durationInFrames={s4.len}>
        <Beat durationInFrames={s4.len}>
          <Statement lines={["every version is scored,", { text: "so nothing breaks.", accent: true }]} fontSize={H} />
        </Beat>
      </Sequence>

      <Sequence from={tools.from} durationInFrames={tools.len}>
        <Beat durationInFrames={tools.len} fadeIn={24} fadeOut={22}>
          <ToolsBeat />
        </Beat>
      </Sequence>

      <Sequence from={s5.from} durationInFrames={s5.len}>
        <Beat durationInFrames={s5.len}>
          <Statement lines={["try it live —", "keep it or toss it."]} fontSize={H} />
        </Beat>
      </Sequence>

      <Sequence from={s6.from} durationInFrames={s6.len}>
        <Beat durationInFrames={s6.len}>
          <Statement lines={["your app", { text: "evolves itself.", accent: true }]} fontSize={H} />
        </Beat>
      </Sequence>

      <Sequence from={outro.from} durationInFrames={outro.len}>
        <Beat durationInFrames={outro.len} fadeOut={10}>
          <OutroBeat />
        </Beat>
      </Sequence>
    </AbsoluteFill>
  );
};
