import { Composition } from "remotion";
import { MorphAd } from "./MorphAd";

export const RemotionRoot: React.FC = () => {
  return (
    <>
      <Composition
        id="MorphAd"
        component={MorphAd}
        durationInFrames={1314}
        fps={30}
        width={1920}
        height={1080}
      />
    </>
  );
};
