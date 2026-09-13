import { useRef, useState } from 'react';
import AdventureCompanion from './AdventureCompanion';
import { createLearningGuide } from '../game/learning-guide';
import { destinationId, type GuideRegion } from '../game/adventure';

type Props = {
  region: Exclude<GuideRegion, 'marina-bay'>;
  hud: { x: number; z: number; collected: number[] };
  stops: { name: string; x: number; z: number }[];
};
export default function RegionGuide(props: Props) {
  const current = useRef(props); current.current = props;
  const [game] = useState(() => createLearningGuide(props.region, () => {
    const { hud, stops } = current.current;
    return { position: { x: hud.x, z: hud.z }, destinations: stops.map(s => ({ ...s, id: destinationId(s.name) })),
      collected: hud.collected.map(index => destinationId(stops[index].name)) };
  }));
  return <AdventureCompanion game={game} educationOnly regionName={props.region === 'queenstown' ? 'Queenstown' : 'Raffles Place'} />;
}
