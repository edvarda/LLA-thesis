/*
 * Shape.ts
 * ===========
 * Placeholder shape to demonstrate setup works.
 * Has capacity to import custom .glsl shader files
 */

import * as THREE from "three";
import { OBJLoader } from "three/examples/jsm/loaders/OBJLoader";

import vertShader from "./glsl/torus.vs";
import fragShader from "./glsl/torus.fs";

export default class Shape {
  object: THREE.Mesh;
  timeU: THREE.IUniform;

  constructor(parentScene: THREE.Scene, camera: THREE.OrthographicCamera) {
    const loader = new OBJLoader();
    loader.load(
      "./models/bunny.obj",
      // called when resource is loaded
      (loadedGroup) => {
        console.log(loadedGroup.children[0]);
        this.object = <THREE.Mesh>loadedGroup.children[0];
        this.object.material = new THREE.MeshNormalMaterial();
        this.object.geometry.center();
        parentScene.add(this.object);

        const box = new THREE.BoxHelper(this.object, 0xffff00);
        parentScene.add(box);
        this.setupCamera(camera);
        console.log(`pos: ${this.object.position.toArray()}`);
      },
      // called when loading is in progresses
      function (xhr) {
        console.log((xhr.loaded / xhr.total) * 100 + "% loaded");
      },
      // called when loading has errors
      function (error) {
        console.log(`An error happened: ${error}`);
      }
    );
  }

  public getBoundingSphereRadius(): number {
    let boundingBox = new THREE.BoxHelper(this.object);
    return boundingBox.geometry.boundingSphere.radius;
  }

  public setupCamera(camera: THREE.OrthographicCamera) {
    let aspect = window.innerWidth / window.innerHeight;
    let frustumHeight = 2 * this.getBoundingSphereRadius();
    camera.left = (frustumHeight * aspect) / -2;
    camera.right = (frustumHeight * aspect) / 2;
    camera.top = frustumHeight / 2;
    camera.bottom = frustumHeight / -2;
    camera.near = 0.1;
    camera.far = 10;
    camera.lookAt(0, 0, 0);
    camera.position.z = 1;
    camera.updateProjectionMatrix();
  }

  public update(secs: number): void {}
}
