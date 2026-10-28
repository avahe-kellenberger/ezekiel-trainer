import { useEffect } from "react";
import type { TrainerInstance } from "osrs-sdk";
import { useTrainerSnapshot } from "osrs-sdk-react";
import { routeGroundOverlay } from "./content/zeke/RouteGroundOverlay";
import type { ZekeRouteScenario } from "./content/zeke/ZekeRoutePlans";

export function ZekeRouteOverlay({ trainer, scenario }: Readonly<{ trainer: TrainerInstance; scenario: ZekeRouteScenario }>) {
  const player = useTrainerSnapshot((snapshot) => snapshot.player);
  useEffect(() => {
    if (player === null) return;
    const markers = routeGroundOverlay(trainer.region, scenario);
    markers.forEach((marker) => trainer.region.addEntity(marker));
    return () => { markers.forEach((marker) => trainer.region.removeEntity(marker)); };
  }, [trainer, scenario, player]);
  return null;
}
