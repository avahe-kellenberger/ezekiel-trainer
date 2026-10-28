import * as THREE from "three";
import { CollisionType, Entity, GROUND_OVERLAY_Y, GroundOverlayRenderOrder, LineOfSightMask, TileMarker, drawLineOnTop } from "osrs-sdk";
import type { Location3, Model, Region, UILayerProjector } from "osrs-sdk";
import type { Tile } from "../../sim/brands";
import type { ZekeRouteScenario } from "./ZekeRoutePlans";

class RoutePathModel implements Model {
  private readonly geometry: THREE.BufferGeometry;
  private readonly material = new THREE.LineBasicMaterial({ color: "#66d9ef", transparent: true, opacity: 0.85 });
  private readonly line: THREE.Line;

  constructor(trace: readonly Tile[]) {
    this.geometry = new THREE.BufferGeometry().setFromPoints(trace.map((at) => new THREE.Vector3(at.x + 0.5 - 5, 0, at.y - 0.5 - 5)));
    this.line = new THREE.Line(this.geometry, this.material);
    drawLineOnTop(this.line, GroundOverlayRenderOrder.MARKED_TILE);
  }

  draw(scene: THREE.Scene, _delta: number, _percent: number, location: Location3, _angle: number, _pitch: number, visible: boolean): void {
    if (this.line.parent !== scene) scene.add(this.line);
    this.line.position.set(location.x, GROUND_OVERLAY_Y, location.y);
    this.line.visible = visible;
  }

  destroy(scene: THREE.Scene): void {
    scene.remove(this.line);
    this.geometry.dispose();
    this.material.dispose();
  }

  getWorldPosition(): THREE.Vector3 { return this.line.getWorldPosition(new THREE.Vector3()); }
  async preload(): Promise<void> {}
}

class RoutePath extends Entity {
  constructor(region: Region, private readonly trace: readonly Tile[]) { super(region, { x: 5, y: 5 }); }
  override get collisionType(): CollisionType { return CollisionType.NONE; }
  override get lineOfSight(): LineOfSightMask { return LineOfSightMask.NONE; }
  override get selectable(): boolean { return false; }
  override get drawOutline(): boolean { return false; }
  override create3dModel(): Model { return new RoutePathModel(this.trace); }
}

class RouteGroundTile extends TileMarker {
  constructor(region: Region, at: Tile, color: string, private readonly label: string) { super(region, at, color, 1, false); }
  override get selectable(): boolean { return false; }
  override drawUILayer(_percent: number, projector: UILayerProjector, context: OffscreenCanvasRenderingContext2D): void {
    if (!projector.visible || this.label === "") return;
    const at = projector.atHeight(0.04);
    context.save();
    context.font = "bold 14px sans-serif";
    context.textAlign = "center";
    context.textBaseline = "middle";
    context.lineWidth = 3;
    context.strokeStyle = "#171b20";
    context.fillStyle = "#ffe4a0";
    context.strokeText(this.label, at.x, at.y);
    context.fillText(this.label, at.x, at.y);
    context.restore();
  }
}

export function routeGroundOverlay(region: Region, scenario: ZekeRouteScenario): readonly Entity[] {
  const clicks = new Map<string, { at: Tile; numbers: number[] }>();
  scenario.clicks.forEach((click, index) => {
    const key = `${click.to.x},${click.to.y}`;
    const group = clicks.get(key);
    if (group) group.numbers.push(index + 1);
    else clicks.set(key, { at: click.to, numbers: [index + 1] });
  });
  const markers: Entity[] = [new RoutePath(region, scenario.trace)];
  const seen = new Set<string>();
  for (const at of scenario.trace) {
    const key = `${at.x},${at.y}`;
    if (!seen.has(key) && !clicks.has(key)) markers.push(new RouteGroundTile(region, at, "#66d9ef", ""));
    seen.add(key);
  }
  for (const click of clicks.values()) markers.push(new RouteGroundTile(region, click.at, "#ffd166", click.numbers.join("·")));
  return markers;
}
