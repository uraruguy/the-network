import "./styles/app.css";
import { Composition } from "remotion";
import { FontGate } from "./kit/FontGate";
import { Pocket } from "./videos/Pocket";
import { Studio } from "./videos/Studio";
import { KitPreview } from "./videos/KitPreview";
import { GlobePreview } from "./videos/previews/GlobePreview";
import { GraphPreview } from "./videos/previews/GraphPreview";

const FPS = 60;
const gated = (C: React.ComponentType) => () => (
  <FontGate>
    <C />
  </FontGate>
);

export function Root() {
  return (
    <>
      <Composition id="Pocket" component={gated(Pocket)} durationInFrames={30 * FPS} fps={FPS} width={1080} height={1350} />
      <Composition id="Studio" component={gated(Studio)} durationInFrames={30 * FPS} fps={FPS} width={1920} height={1080} />
      <Composition id="GlobePreview" component={gated(GlobePreview)} durationInFrames={8 * FPS} fps={FPS} width={1920} height={1080} />
      <Composition id="GraphPreview" component={gated(GraphPreview)} durationInFrames={8 * FPS} fps={FPS} width={1920} height={1080} />
      <Composition id="KitPreview" component={gated(KitPreview)} durationInFrames={4 * FPS} fps={FPS} width={1920} height={1080} />
    </>
  );
}
