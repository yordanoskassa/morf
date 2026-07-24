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
import {
  Cursor,
  monoFont,
  PaperBackground,
  pixelFont,
  sansFont,
  Statement,
  TypeOn,
  Wordmark,
  WordPop,
} from "./components";

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
          <div style={{ fontFamily: pixelFont, fontSize: 104, color: theme.ink, lineHeight: 1.04 }}>
            what if the app
          </div>
          <div style={{ fontFamily: pixelFont, fontSize: 104, color: theme.ink, lineHeight: 1.16 }}>
            built it instead?
          </div>
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

/* ========================================================================== */
/* PER-TOOL BEATS — each tool shown one at a time, in the flow                */
/* ========================================================================== */
const ToolBeat: React.FC<{
  img: string;
  logoH: number;
  lines: (string | { text: string; accent?: boolean; soft?: boolean; sans?: boolean })[];
  fontSize: number;
}> = ({ img, logoH, lines, fontSize }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const s = spring({ frame, fps, config: { damping: 200, stiffness: 60 } });
  const rise = interpolate(s, [0, 1], [26, 0]);
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 54 }}>
      <div
        style={{
          opacity: s,
          transform: `translateY(${rise}px)`,
          height: logoH,
          display: "flex",
          alignItems: "center",
        }}
      >
        <Img src={staticFile(img)} style={{ height: logoH }} />
      </div>
      <Statement lines={lines} fontSize={fontSize} startFrame={8} />
    </div>
  );
};

/* Embed beat — code card showing morf wrapping an existing app */
type CodeSeg = { t: string; c?: string; italic?: boolean; bold?: boolean };
const STR_COLOR = "#5B7A5B"; // muted string green, editor-style

const EmbedBeat: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const s = spring({ frame, fps, config: { damping: 200, stiffness: 55 } });
  const rise = interpolate(s, [0, 1], [30, 0]);

  const K = theme.accent; // keyword / tag-name color
  const P = theme.inkSoft; // punctuation
  const CODE: (CodeSeg[] | null)[] = [
    [{ t: "// npm install morf", c: theme.inkSoft, italic: true }],
    null,
    [
      { t: "import", c: K },
      { t: " { ", c: P },
      { t: "MorfProvider", c: theme.ink, bold: true },
      { t: " } ", c: P },
      { t: "from", c: K },
      { t: " 'morf'", c: STR_COLOR },
      { t: ";", c: P },
    ],
    null,
    [
      { t: "<", c: P },
      { t: "MorfProvider", c: K, bold: true },
      { t: ">", c: P },
    ],
    [
      { t: "  <", c: P },
      { t: "YourApp", c: K, bold: true },
      { t: " />", c: P },
    ],
    [
      { t: "</", c: P },
      { t: "MorfProvider", c: K, bold: true },
      { t: ">", c: P },
    ],
  ];

  const dot = (o: number) => (
    <span style={{ width: 14, height: 14, borderRadius: 99, background: theme.ink, opacity: o }} />
  );

  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 54 }}>
      <div
        style={{
          opacity: s,
          transform: `translateY(${rise}px)`,
          border: `3px solid ${theme.ink}`,
          borderRadius: 16,
          background: "#ffffff",
          boxShadow: "0 26px 70px rgba(0,0,0,0.12)",
          overflow: "hidden",
          minWidth: 780,
        }}
      >
        {/* editor tab bar */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 12,
            padding: "16px 22px",
            borderBottom: `3px solid ${theme.ink}`,
          }}
        >
          {dot(0.16)}
          {dot(0.16)}
          {dot(0.16)}
          <div
            style={{
              marginLeft: 18,
              display: "flex",
              alignItems: "center",
              gap: 10,
              padding: "6px 14px",
              borderRadius: 7,
              background: "rgba(178,58,46,0.08)",
            }}
          >
            <span style={{ width: 10, height: 10, borderRadius: 3, background: theme.accent }} />
            <span style={{ fontFamily: sansFont, fontWeight: 600, fontSize: 22, color: theme.inkSoft }}>
              App.tsx
            </span>
          </div>
        </div>

        {/* code body: gutter + syntax-highlighted lines */}
        <div style={{ display: "flex", padding: "30px 0" }}>
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              padding: "0 22px",
              borderRight: `2px solid ${theme.hair}`,
              marginRight: 30,
            }}
          >
            {CODE.map((_, i) => (
              <div
                key={i}
                style={{
                  fontFamily: monoFont,
                  fontSize: 32,
                  lineHeight: 1.55,
                  color: theme.inkSoft,
                  opacity: 0.55,
                  textAlign: "right",
                }}
              >
                {i + 1}
              </div>
            ))}
          </div>
          <div style={{ paddingRight: 60 }}>
            {CODE.map((segs, i) => {
              const on = frame > 12 + i * 8;
              return (
                <div
                  key={i}
                  style={{
                    fontFamily: monoFont,
                    fontSize: 32,
                    lineHeight: 1.55,
                    whiteSpace: "pre",
                    opacity: on ? 1 : 0,
                  }}
                >
                  {segs
                    ? segs.map((seg, si) => (
                        <span
                          key={si}
                          style={{
                            color: seg.c ?? theme.ink,
                            fontStyle: seg.italic ? "italic" : undefined,
                            fontWeight: seg.bold ? 700 : 500,
                          }}
                        >
                          {seg.t}
                        </span>
                      ))
                    : " "}
                </div>
              );
            })}
          </div>
        </div>
      </div>
      <Statement
        lines={[{ text: "wraps any site.", sans: true }, "two lines. done."]}
        fontSize={76}
        startFrame={16}
      />
    </div>
  );
};

/* Daytona spotlight — logo inside a live "sandbox" window with a running dot */
const DaytonaBeat: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const s = spring({ frame, fps, config: { damping: 200, stiffness: 55 } });
  const rise = interpolate(s, [0, 1], [30, 0]);
  const running = Math.floor(frame / 18) % 2 === 0;
  const dot = (o: number) => (
    <span style={{ width: 16, height: 16, borderRadius: 99, background: theme.ink, opacity: o }} />
  );
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 58 }}>
      <div style={{ opacity: s, transform: `translateY(${rise}px)` }}>
        <div
          style={{
            border: `3px solid ${theme.ink}`,
            borderRadius: 16,
            overflow: "hidden",
            background: "#ffffff",
            boxShadow: "0 26px 70px rgba(0,0,0,0.12)",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 12,
              padding: "18px 24px",
              borderBottom: `3px solid ${theme.ink}`,
            }}
          >
            {dot(0.22)}
            {dot(0.22)}
            {dot(0.22)}
            <span style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 12 }}>
              <span
                style={{
                  width: 15,
                  height: 15,
                  borderRadius: 99,
                  background: theme.accent,
                  opacity: running ? 1 : 0.25,
                }}
              />
              <span style={{ fontFamily: sansFont, fontWeight: 600, fontSize: 24, color: theme.inkSoft }}>
                running
              </span>
            </span>
          </div>
          <div style={{ padding: "58px 120px", display: "flex", justifyContent: "center" }}>
            <Img src={staticFile("logos/daytona.svg")} style={{ height: 150 }} />
          </div>
        </div>
      </div>
      <Statement
        lines={[{ text: "every build boots live.", sans: true }, "a real app in seconds."]}
        fontSize={78}
        startFrame={10}
      />
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
        <div style={{ fontFamily: sansFont, fontWeight: 600, fontSize: 48, color: theme.ink }}>
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

  // ---- the arc ----------------------------------------------------------
  const intro = at(115); //  morf
  const req = at(148); //  your users want more / waiting time kills it / they always do (hook)
  const waste = at(122); //  devs guess, build, it flops           (the waste)
  const statue = at(180); //  morf lets the feature prove itself     (the flip)
  const embed = at(175); //  wraps any existing site               (integration)
  const desc = at(108); //  someone types a wish                  (self-serve)
  const fw = at(120); //  Fireworks: 3 models race               (tool)
  const day = at(168); //  Daytona: every build boots live        (tool, spotlight)
  const bt = at(120); //  Braintrust: scored, nothing breaks     (tool)
  const test = at(124); //  real users hit it                      (validation)
  const ship = at(130); //  winners get polished and shipped       (payoff)
  const outro = at(150); //  morf / the app that builds itself

  const H = 90; // headline size for Jersey15 landscape

  return (
    <AbsoluteFill style={{ backgroundColor: theme.paper }}>
      <PaperBackground />

      <Sequence from={intro.from} durationInFrames={intro.len}>
        <Beat durationInFrames={intro.len}>
          <IntroBeat />
        </Beat>
      </Sequence>

      <Sequence from={req.from} durationInFrames={req.len}>
        <Beat durationInFrames={req.len}>
          <WordPop
            lines={[
              "your users want more.",
              { text: "waiting time kills it.", sans: true },
              "they always do.",
            ]}
            fontSize={H}
          />
        </Beat>
      </Sequence>

      <Sequence from={waste.from} durationInFrames={waste.len}>
        <Beat durationInFrames={waste.len}>
          <WordPop
            lines={[
              { text: "so devs guess, build,", sans: true },
              { text: "and watch it flop.", accent: true },
            ]}
            fontSize={H}
            wordStagger={9}
          />
        </Beat>
      </Sequence>

      <Sequence from={statue.from} durationInFrames={statue.len}>
        <Beat durationInFrames={statue.len} fadeIn={26} fadeOut={26}>
          <StatueBeat />
        </Beat>
      </Sequence>

      <Sequence from={embed.from} durationInFrames={embed.len}>
        <Beat durationInFrames={embed.len} fadeIn={24} fadeOut={22}>
          <EmbedBeat />
        </Beat>
      </Sequence>

      <Sequence from={desc.from} durationInFrames={desc.len}>
        <Beat durationInFrames={desc.len}>
          <TypeOn lines={["now a user", "types a wish."]} fontSize={H} cps={26} />
        </Beat>
      </Sequence>

      <Sequence from={fw.from} durationInFrames={fw.len}>
        <Beat durationInFrames={fw.len}>
          <ToolBeat
            img="logos/fireworks.png"
            logoH={96}
            lines={[{ text: "3 AI models race", sans: true }, "to build it."]}
            fontSize={H}
          />
        </Beat>
      </Sequence>

      <Sequence from={day.from} durationInFrames={day.len}>
        <Beat durationInFrames={day.len} fadeIn={24} fadeOut={22}>
          <DaytonaBeat />
        </Beat>
      </Sequence>

      <Sequence from={bt.from} durationInFrames={bt.len}>
        <Beat durationInFrames={bt.len}>
          <ToolBeat
            img="logos/braintrust.png"
            logoH={104}
            lines={[
              { text: "every attempt scored.", sans: true },
              { text: "nothing ships broken.", accent: true },
            ]}
            fontSize={H}
          />
        </Beat>
      </Sequence>

      <Sequence from={test.from} durationInFrames={test.len}>
        <Beat durationInFrames={test.len}>
          <WordPop
            lines={["real users hit it.", { text: "data picks the winners.", sans: true }]}
            fontSize={H}
          />
        </Beat>
      </Sequence>

      <Sequence from={ship.from} durationInFrames={ship.len}>
        <Beat durationInFrames={ship.len}>
          <WordPop
            lines={[
              { text: "the keepers get polished,", sans: true },
              { text: "secured, and shipped.", accent: true },
            ]}
            fontSize={H}
            wordStagger={8}
          />
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
