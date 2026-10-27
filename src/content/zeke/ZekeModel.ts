import * as THREE from "three";
import { CacheRenderModel, CacheRenderReferences, Settings } from "osrs-sdk";
import type { Location3, Renderable } from "osrs-sdk";
import { ZEKE_PRESENTATION } from "./assets";

export class ZekeModel extends CacheRenderModel {
  private readonly southwest = new THREE.LineLoop(
    new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(0, 0, 0), new THREE.Vector3(1, 0, 0),
      new THREE.Vector3(1, 0, -1), new THREE.Vector3(0, 0, -1),
    ]),
    new THREE.LineBasicMaterial({ color: "#ffe566", depthTest: false, depthWrite: false, transparent: true }),
  );

  constructor(private readonly actor: Renderable) {
    super(actor, CacheRenderReferences.npc(ZEKE_PRESENTATION.npc));
    // The SDK's true-tile outline uses order 200 at ground height -0.49.
    this.southwest.renderOrder = 201;
  }

  override draw(scene: THREE.Scene, delta: number, percent: number, location: Location3, angle: number, pitch: number, visible: boolean, offsets: Location3[], clientTickFraction = 0): void {
    super.draw(scene, delta, percent, location, angle, pitch, visible, offsets, clientTickFraction);
    if (this.southwest.parent !== scene) scene.add(this.southwest);
    const at = this.actor.getTrueLocation();
    this.southwest.position.set(at.x, -0.49, at.y);
    this.southwest.visible = visible && Settings.trueTileEnabled;
  }

  override destroy(scene: THREE.Scene): void {
    super.destroy(scene);
    scene.remove(this.southwest);
    this.southwest.geometry.dispose();
    this.southwest.material.dispose();
  }
}
