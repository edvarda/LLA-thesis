/*
 * View.ts
 * ===========
 * Topmost Three.js class.
 * Controls scene, cam, renderer, and objects in scene.
 */

import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls";
import Stats from "three/examples/jsm/libs/stats.module";
import GUI from "lil-gui";

import Shape from "./Shape";
import { Vector3 } from "three";
import { SourceMapDevToolPlugin } from "webpack";

export default class View {
  private renderer: THREE.WebGLRenderer;
  private scene: THREE.Scene;
  private camera: THREE.OrthographicCamera;
  private model: Shape;
  private gui: GUI;
  private controls: OrbitControls;
  private statsPanel: Stats;

  constructor(canvasElem: HTMLCanvasElement) {
    this.renderer = new THREE.WebGLRenderer({
      canvas: canvasElem,
      antialias: true,
    });

    this.scene = new THREE.Scene();
    this.scene.background = new THREE.TextureLoader().load(
      "./textures/bgnd.png"
    );

    this.camera = new THREE.OrthographicCamera();
    this.model = new Shape(this.scene, this.camera);
    this.controls = new OrbitControls(this.camera, this.renderer.domElement);

    this.statsPanel = Stats();
    document.body.appendChild(this.statsPanel.dom);
    this.gui = new GUI();

    const axesHelper = new THREE.AxesHelper(1);
    this.scene.add(axesHelper);

    const light = new THREE.PointLight(0xff0000, 1, 100);
    light.position.set(1, 1, 1);
    this.scene.add(light);

    // Set initial sizes
    this.onWindowResize(window.innerWidth, window.innerHeight);
  }

  public onWindowResize(vpW: number, vpH: number): void {
    this.renderer.setSize(vpW, vpH);
    this.camera.updateProjectionMatrix();
  }

  public update(secs: number): void {
    this.model.update(secs);
    this.statsPanel.update();
    this.renderer.render(this.scene, this.camera);
  }
}
