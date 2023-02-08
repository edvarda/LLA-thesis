/*
 * App.ts
 * ===========
 * Entry from Webpack, generates Three.js View
 */

// import View from "./webgl/View";
import * as THREE from "three";
import { OBJLoader } from "three/examples/jsm/loaders/OBJLoader";
import { TrackballControls } from "three/examples/jsm/controls/TrackballControls.js";
import Stats from "three/examples/jsm/libs/stats.module";

import basicVertexShader from "./webgl/glsl/standard.vs";
import depthShader from "./webgl/glsl/depthShader.fs";
import imageShader from "./webgl/glsl/image.fs";
import bilateralFilter from "./webgl/glsl/bilateralFilter.fs";
import { Scene } from "three";

interface SceneInfo {
  scene: THREE.Scene;
  camera: THREE.OrthographicCamera;
  elem?: HTMLElement;
  mesh: THREE.Mesh;
  controls?: TrackballControls;
  material?: THREE.ShaderMaterial;
}

const properties = {
  textureResolution: 512,
  bilateralFilter: {
    SigmaS: 0,
    SigmaR: 1,
  },
};

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

function leftPaneElement(): HTMLElement {
  const element = document.createElement("div");
  element.className = "innerPanelSmall";
  document.getElementById("leftPane").appendChild(element);
  return element;
}

function rightPaneElement(): HTMLElement {
  const element = document.createElement("div");
  element.className = "innerPanelLarge";
  document.getElementById("rightPane").appendChild(element);
  return element;
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

function setupScene(element: HTMLElement, mesh: THREE.Mesh) {
  const scene = new THREE.Scene();
  const camera = new THREE.OrthographicCamera();
  const controls = new TrackballControls(camera, element);
  controls.noPan = true;

  const color = 0xffffff;
  const intensity = 1;
  const light = new THREE.DirectionalLight(color, intensity);
  light.position.set(-1, 2, 4);

  scene.add(camera);
  scene.add(mesh);
  scene.add(light);

  fitViewToModel(camera, mesh);
  return { scene, camera, elem: element, mesh, controls };
}

function getBoundingSphereRadius(mesh: THREE.Mesh): number {
  let boundingBox = new THREE.BoxHelper(mesh);
  return boundingBox.geometry.boundingSphere.radius;
}

function fitViewToModel(camera: THREE.OrthographicCamera, mesh: THREE.Mesh) {
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

function setupRenderTarget(target: THREE.WebGLRenderTarget) {
  if (target) target.dispose();

  const format = THREE.DepthFormat;
  const type = THREE.UnsignedShortType;

  target = new THREE.WebGLRenderTarget(
    properties.textureResolution,
    properties.textureResolution
  );
  target.texture.minFilter = THREE.NearestFilter;
  target.texture.magFilter = THREE.NearestFilter;
  target.stencilBuffer = format === THREE.DepthStencilFormat ? true : false;
  target.depthTexture = new THREE.DepthTexture(
    properties.textureResolution,
    properties.textureResolution
  );
  target.depthTexture.format = format;
  target.depthTexture.type = type;
  return target;
}

function setupDepthTextureScene(fragmentShader: string): SceneInfo {
  let element = rightPaneElement();
  let postMaterial = new THREE.ShaderMaterial({
    vertexShader: basicVertexShader,
    fragmentShader: fragmentShader,
    uniforms: {
      tDiffuse: { value: null },
      tDepth: { value: null },
    },
  });
  let scene = getNewPostProcessingScene(postMaterial);
  return { ...scene, elem: element };
}

function setupFinalPass(): SceneInfo {
  let element = leftPaneElement();
  let imageMaterial = new THREE.ShaderMaterial({
    vertexShader: basicVertexShader,
    fragmentShader: imageShader,
    uniforms: {
      image: { value: null },
    },
  });
  let scene = getNewPostProcessingScene(imageMaterial);
  return { ...scene, elem: element };
}

function setupBilateralFilteringScene(): SceneInfo {
  let bilateralFilterMaterial = new THREE.ShaderMaterial({
    vertexShader: basicVertexShader,
    fragmentShader: bilateralFilter,
    uniforms: {
      tNormal: { value: null },
      tDepth: { value: null },
      sigmaL: { value: properties.bilateralFilter.SigmaR },
      sigmaS: { value: properties.bilateralFilter.SigmaS },
    },
  });

  let scene = getNewPostProcessingScene(bilateralFilterMaterial);
  return scene;
}

function getNewPostProcessingScene(material: THREE.ShaderMaterial): SceneInfo {
  let camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
  let plane = new THREE.PlaneGeometry(2, 2);
  let mesh = new THREE.Mesh(plane, material);
  let scene = new THREE.Scene();
  scene.add(mesh);
  return {
    scene,
    camera,
    mesh,
    material,
  };
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

  renderer.setRenderTarget(target);
  renderer.clear();
  renderer.render(scene1.scene, scene1.camera);

  depthTexture.material.uniforms.tDepth.value = target.depthTexture;
  filteredTexture.material.uniforms.tNormal.value = target.texture;
  filteredTexture.material.uniforms.tDepth.value = target.depthTexture;

  renderer.setRenderTarget(null);

  renderSceneToElement(depthTexture);

  renderer.setRenderTarget(finalTarget);
  renderer.clear();

  renderer.render(filteredTexture.scene, filteredTexture.camera);

  renderer.setRenderTarget(null);

  postScene.material.uniforms.image.value = finalTarget.texture;
  renderSceneToElement(postScene);

  stats.update();
  requestAnimationFrame(render);
}

const renderer = new THREE.WebGLRenderer({
  canvas: document.getElementById("canvas"),
});

let mesh = await loadModel("./models/bunny.obj");
const stats = Stats();
document.body.appendChild(stats.dom);

let target: THREE.WebGLRenderTarget;
let finalTarget: THREE.WebGLRenderTarget;

target = setupRenderTarget(target);
finalTarget = setupRenderTarget(finalTarget);

const scene1 = setupScene(rightPaneElement(), mesh);
const depthTexture = setupDepthTextureScene(depthShader);
const filteredTexture = setupBilateralFilteringScene();
const postScene = setupFinalPass();

requestAnimationFrame(render);
// const app = new App();
