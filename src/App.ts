/*
 * App.ts
 * ===========
 * Entry from Webpack, generates Three.js View
 */

// import View from "./webgl/View";
import * as THREE from "three";
import { OBJLoader } from "three/examples/jsm/loaders/OBJLoader";
import { TrackballControls } from "three/examples/jsm/controls/TrackballControls.js";

import basicVertexShader from "./webgl/glsl/standard.vs";
import depthShader from "./webgl/glsl/depthShader.fs";
import diffuseShader from "./webgl/glsl/diffuse.fs";

interface SceneInfo {
  scene: THREE.Scene;
  camera: THREE.OrthographicCamera;
  elem: HTMLElement;
  mesh: THREE.Mesh;
  controls?: TrackballControls;
}

async function loadModel(url: string): Promise<THREE.Mesh> {
  const loader = new OBJLoader();
  try {
    let result = await loader.loadAsync(url, function (xhr: ProgressEvent) {
      console.log((xhr.loaded / xhr.total) * 100 + "% loaded");
    });
    let mesh = <THREE.Mesh>result.children[0];
    mesh.material = new THREE.MeshNormalMaterial();
    mesh.geometry.center();
    return mesh;
  } catch (error) {
    console.log(`Error caught during model loading: ${error}`);
  }
}

function resizeRendererToDisplaySize(renderer: THREE.WebGLRenderer) {
  const canvas = renderer.domElement;
  const width = canvas.clientWidth;
  const height = canvas.clientHeight;
  const needResize = canvas.width !== width || canvas.height !== height;
  if (needResize) {
    renderer.setSize(width, height, false);
  }
  return needResize;
}

function setupSceneLeft() {
  const element = document.createElement("div");
  element.className = "innerPanelSmall";
  document.getElementById("leftPane").appendChild(element);

  const sceneInfo = makeScene(element);
  setupCameraForModel(sceneInfo.camera, sceneInfo.mesh);
  return sceneInfo;
}

function setupSceneRight() {
  const element = document.createElement("div");
  element.className = "innerPanelLarge";
  document.getElementById("rightPane").appendChild(element);

  const sceneInfo = makeScene(element);
  setupCameraForModel(sceneInfo.camera, sceneInfo.mesh);
  return sceneInfo;
}

function getBoundingSphereRadius(mesh: THREE.Mesh): number {
  let boundingBox = new THREE.BoxHelper(mesh);
  return boundingBox.geometry.boundingSphere.radius;
}

function setupCameraForModel(
  camera: THREE.OrthographicCamera,
  mesh: THREE.Mesh
) {
  let aspect = window.innerWidth / window.innerHeight;
  let frustumHeight = 2 * getBoundingSphereRadius(mesh);
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

function setupRenderTarget() {
  if (target) target.dispose();

  const format = THREE.DepthFormat;
  const type = THREE.UnsignedShortType;

  target = new THREE.WebGLRenderTarget(window.innerWidth, window.innerHeight);
  target.texture.minFilter = THREE.NearestFilter;
  target.texture.magFilter = THREE.NearestFilter;
  target.stencilBuffer = format === THREE.DepthStencilFormat ? true : false;
  target.depthTexture = new THREE.DepthTexture(
    window.innerWidth,
    window.innerHeight
  );
  target.depthTexture.format = format;
  target.depthTexture.type = type;
}

function setupPost(): SceneInfo {
  const element = document.createElement("div");
  element.className = "innerPanelLarge";
  document.getElementById("rightPane").appendChild(element);
  // Setup post processing stage
  let postCamera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
  postMaterial = new THREE.ShaderMaterial({
    vertexShader: basicVertexShader,
    fragmentShader: depthShader,
    uniforms: {
      // tDiffuse: { value: null },
      tDepth: { value: null },
    },
  });
  const postPlane = new THREE.PlaneGeometry(2, 2);
  const postQuad = new THREE.Mesh(postPlane, postMaterial);
  let postScene = new THREE.Scene();
  postScene.add(postQuad);
  return {
    scene: postScene,
    camera: postCamera,
    elem: element,
    mesh: postQuad,
  };
}

function makeScene(elem: HTMLElement): SceneInfo {
  const scene = new THREE.Scene();
  const camera = new THREE.OrthographicCamera();
  scene.add(camera);
  let sceneMesh = mesh.clone();
  scene.add(sceneMesh);
  const controls = new TrackballControls(camera, elem);
  controls.noPan = true;

  {
    const color = 0xffffff;
    const intensity = 1;
    const light = new THREE.DirectionalLight(color, intensity);
    light.position.set(-1, 2, 4);
    scene.add(light);
  }

  return { scene, camera, elem, mesh: sceneMesh, controls };
}

// function onWindowResize(
//   camera: THREE.OrthographicCamera,
//   vpW: number,
//   vpH: number
// ): void {
//   renderer.setSize(vpW, vpH);
//   camera.updateProjectionMatrix();
// }

function renderSceneToElement(sceneInfo: SceneInfo) {
  const { scene, camera, elem, controls } = sceneInfo;

  // get the viewport relative position of this element
  const { left, right, top, bottom, width, height } =
    elem.getBoundingClientRect();

  const isOffscreen =
    bottom < 0 ||
    top > renderer.domElement.clientHeight ||
    right < 0 ||
    left > renderer.domElement.clientWidth;

  if (isOffscreen) {
    return;
  }

  if (!!controls) {
    controls.handleResize();
    controls.update();
  }
  camera.updateProjectionMatrix();

  const positiveYUpBottom = renderer.domElement.clientHeight - bottom;
  renderer.setScissor(left, positiveYUpBottom, width, height);
  renderer.setViewport(left, positiveYUpBottom, width, height);
  renderer.render(scene, camera);
}

function render(time: number) {
  time *= 0.001;

  resizeRendererToDisplaySize(renderer);

  renderer.setScissorTest(false);
  renderer.clear(true, true);
  renderer.setScissorTest(true);

  renderSceneToElement(scene1);
  renderSceneToElement(scene2);
  renderSceneToElement(scene3);
  renderer.setRenderTarget(target);
  console.log(target);
  renderer.render(postScene.scene, postScene.camera);
  console.log(target);

  postMaterial.uniforms.tDiffuse.value = target.texture;
  postMaterial.uniforms.tDepth.value = target.depthTexture;

  renderer.setRenderTarget(null);

  renderSceneToElement(postScene);

  requestAnimationFrame(render);
}

const renderer = new THREE.WebGLRenderer({
  canvas: document.getElementById("canvas"),
});

const mesh = await loadModel("./models/bunny.obj");

let target: THREE.WebGLRenderTarget;
let postMaterial: THREE.ShaderMaterial;

setupRenderTarget();

const scene1 = setupSceneLeft();
const scene2 = setupSceneLeft();
const scene3 = setupSceneRight();
const postScene = setupPost();

requestAnimationFrame(render);
// const app = new App();
