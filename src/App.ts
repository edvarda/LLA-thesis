/*
 * App.ts
 * ===========
 * Entry from Webpack, generates Three.js View
 */

// import View from "./webgl/View";
import * as THREE from "three";
import { OBJLoader } from "three/examples/jsm/loaders/OBJLoader";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { mergeVertices } from "three/examples/jsm/utils/BufferGeometryUtils.js";

import Stats from "three/examples/jsm/libs/stats.module";
import GUI from "lil-gui";

import basicVertexShader from "./webgl/glsl/basicVertexShader.vs";
import LLAVertexShader from "./webgl/glsl/LLAVertexShader.vs";
import depthShader from "./webgl/glsl/depthShader.fs";
import bilateralFilter from "./webgl/glsl/bilateralFilter.fs";
import localLightAlignment from "./webgl/glsl/localLightAlignment.fs";
import imageShader from "./webgl/glsl/image.fs";
import normalVertexShader from "./webgl/glsl/normalVertexShader.vs";
import normalFragmentShader from "./webgl/glsl/normalFragmentShader.fs";

interface SceneInfo {
  scene: THREE.Scene;
  camera: THREE.PerspectiveCamera | THREE.OrthographicCamera;
  elem?: HTMLElement;
  mesh: THREE.Mesh;
  controls?: OrbitControls;
  material?: THREE.ShaderMaterial;
  light?: THREE.DirectionalLight;
}

const properties = {
  textureResolution: 512,
  lightPosition: {
    x: 0,
    y: 1,
    z: 0.5,
  },
  bilateralFilter: {
    SigmaS: 5,
    SigmaR: 0.01,
  },
  localLightAlignment: {
    Sigma: 0.5,
    Epsilon: 1e-6,
    Gamma: 3,
  },
};

async function loadModel(url: string): Promise<THREE.Mesh> {
  const loader = new OBJLoader();
  try {
    let result = await loader.loadAsync(url, function (xhr: ProgressEvent) {
      console.log((xhr.loaded / xhr.total) * 100 + "% loaded");
    });
    let mesh = <THREE.Mesh>result.children[0];
    mesh.material = new THREE.ShaderMaterial({
      vertexShader: normalVertexShader,
      fragmentShader: normalFragmentShader,
    });
    mesh.geometry.deleteAttribute("normal");
    mesh.geometry = mergeVertices(mesh.geometry);
    mesh.geometry.center();
    mesh.geometry.computeVertexNormals();
    return mesh;
  } catch (error) {
    console.log(`Error caught during model loading: ${error}`);
  }
}

function onGuiChange() {
  bilateralFilterMaterial.uniforms.sigmaS.value =
    properties.bilateralFilter.SigmaS;
  bilateralFilterMaterial.uniforms.sigmaR.value =
    properties.bilateralFilter.SigmaR;
  LLAMaterial.uniforms.sigma.value = properties.localLightAlignment.Sigma;
  LLAMaterial.uniforms.gamma.value = properties.localLightAlignment.Gamma;
  LLAMaterial.uniforms.epsilon.value = properties.localLightAlignment.Epsilon;
  LLAMaterial.uniforms.lightDirection.value = properties.lightPosition;
}

function setupGUI() {
  const gui = new GUI();
  const lightFolder = gui.addFolder("Light position");
  lightFolder.add(properties.lightPosition, "x", -1, 1).onChange(onGuiChange);
  lightFolder.add(properties.lightPosition, "y", -1, 1).onChange(onGuiChange);
  lightFolder.add(properties.lightPosition, "z", -1, 1).onChange(onGuiChange);
  const filterFolder = gui.addFolder("Bilateral Filter");
  filterFolder
    .add(properties.bilateralFilter, "SigmaS", 0, 10)
    .onChange(onGuiChange);
  filterFolder
    .add(properties.bilateralFilter, "SigmaR", 0, 0.5)
    .onChange(onGuiChange);
  filterFolder.open();
  const llaFolder = gui.addFolder("Local Light Alignment");
  llaFolder
    .add(properties.localLightAlignment, "Sigma", 0, 1)
    .onChange(onGuiChange);
  llaFolder
    .add(properties.localLightAlignment, "Epsilon", 1e-10, 1e-4)
    .onChange(onGuiChange);
  llaFolder
    .add(properties.localLightAlignment, "Gamma", 0.5, 6)
    .onChange(onGuiChange);
}

function leftPaneElement(label: string): HTMLElement {
  const element = document.createElement("div");
  const renderFrame = document.createElement("div");
  const labelDiv = document.createElement("div");
  labelDiv.innerText = label;
  element.className = "innerPanelSmall";
  renderFrame.className = "renderFrame";
  labelDiv.className = "label";
  element.appendChild(renderFrame);
  element.appendChild(labelDiv);
  document.getElementById("leftPane").appendChild(element);
  return renderFrame;
}

function rightPaneElement(label: string): HTMLElement {
  const element = document.createElement("div");
  const renderFrame = document.createElement("div");
  const labelDiv = document.createElement("div");
  labelDiv.innerText = label;
  element.className = "innerPanelLarge";
  renderFrame.className = "renderFrame";
  labelDiv.className = "label";
  element.appendChild(renderFrame);
  element.appendChild(labelDiv);
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
  const camera = new THREE.PerspectiveCamera();
  const controls = new OrbitControls(camera, element);

  const color = 0xffffff;
  const intensity = 1;
  const axesHelper = new THREE.AxesHelper(1);
  scene.add(axesHelper);
  scene.add(camera);
  scene.add(mesh);

  fitViewToModel(camera, mesh);
  return { scene, camera, elem: element, mesh, controls };
}

function getBoundingSphereRadius(mesh: THREE.Mesh): number {
  let boundingBox = new THREE.BoxHelper(mesh);
  // console.log(
  //   `boundingsphere radius: ${boundingBox.geometry.boundingSphere.radius}`
  // );
  return boundingBox.geometry.boundingSphere.radius;
}

function fitViewToModel(camera: THREE.PerspectiveCamera, mesh: THREE.Mesh) {
  let height = 2 * getBoundingSphereRadius(mesh);
  let fov = 60;
  let dist = height / 2 / Math.tan((Math.PI * fov) / 360);
  camera.near = 0.01;
  camera.far = 10;
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.fov = fov;
  camera.lookAt(0, 0, 0);
  camera.position.z = dist;
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

function setupDepthTextureScene(): SceneInfo {
  let element = leftPaneElement("Depth texture");
  let postMaterial = new THREE.ShaderMaterial({
    vertexShader: basicVertexShader,
    fragmentShader: depthShader,
    uniforms: {
      tDiffuse: { value: null },
      tDepth: { value: null },
    },
  });
  let scene = getNewPostProcessingScene(postMaterial);
  return { ...scene, elem: element };
}

function setupLLAPass(): SceneInfo {
  let element = rightPaneElement("LLA Shader");
  let scene = getNewPostProcessingScene(LLAMaterial);
  return { ...scene, elem: element };
}

function setupBilateralFilteringScene(label: string): SceneInfo {
  let element = leftPaneElement(label);
  let scene = getNewPostProcessingScene(bilateralFilterMaterial);
  return { ...scene, elem: element };
}

function setupPostScene(label: string): SceneInfo {
  let element = leftPaneElement(label);
  let scene = getNewPostProcessingScene(postMaterial);
  return { ...scene, elem: element };
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
    controls.update();
  }
  camera.updateProjectionMatrix();

  const positiveYUpBottom = renderer.domElement.clientHeight - bottom;
  renderer.setScissor(left, positiveYUpBottom, width, height);
  renderer.setViewport(left, positiveYUpBottom, width, height);
  renderer.render(scene, camera);
}

function renderFilterPass(
  pass: SceneInfo,
  source: THREE.WebGLRenderTarget,
  target: THREE.WebGLRenderTarget,
  depthTexture: THREE.DepthTexture
) {
  // Set uniforms for pass
  pass.material.uniforms.tNormal.value = source.texture;
  pass.material.uniforms.tDepth.value = depthTexture;

  // Render filterpass to target
  renderer.setRenderTarget(target);
  renderer.clear();
  renderer.render(pass.scene, pass.camera);

  renderer.setRenderTarget(null);
  renderSceneToElement(pass);
}

function render(time: number) {
  time *= 0.001;

  // let scaleSpace: THREE.Texture[] = [];

  resizeRendererToDisplaySize(renderer);

  renderer.setScissorTest(false);
  renderer.clear();
  renderer.setScissorTest(true);

  // Render scene with mesh to canvas
  renderSceneToElement(scene);

  // Render scene with mesh to texture
  renderer.setRenderTarget(firstRender);
  renderer.clear();
  renderer.render(scene.scene, scene.camera);

  // Render depth texture
  depthTextureScene.material.uniforms.tDepth.value = firstRender.depthTexture;
  renderer.setRenderTarget(null);
  renderSceneToElement(depthTextureScene);

  // scaleSpace.push(firstRender.texture.clone());
  renderFilterPass(filterPass1, firstRender, targetA, firstRender.depthTexture);
  // scaleSpace.push(targetA.texture.clone());
  renderFilterPass(filterPass2, targetA, targetB, firstRender.depthTexture);
  // scaleSpace.push(targetB.texture.clone());
  // renderFilterPass(filterPass3, targetB, targetA, firstRender.depthTexture);
  // scaleSpace.push(targetA.texture.clone());
  // renderFilterPass(filterPass4, targetA, targetB, firstRender.depthTexture);
  // scaleSpace.push(targetB.texture.clone());

  LLAPass.material.uniforms.tScaleFine.value = firstRender.texture;
  LLAPass.material.uniforms.tScaleCoarse.value = targetB.texture;
  if (first) {
    // console.log(scaleSpace);
    // console.log(filterPass4.material.uniforms.tNormal.value);
    // console.log(LLAPass.material.uniforms.tScaleCoarse.value);
    // console.log(LLAPass.material.uniforms.tScaleFine.value);
  }
  first = false;

  renderSceneToElement(LLAPass);
  // renderSceneToElement(postPass);

  stats.update();
  requestAnimationFrame(render);
}

// Script part below

const renderer = new THREE.WebGLRenderer({
  alpha: true,
  canvas: document.getElementById("canvas"),
});
const stats = Stats();
document.body.appendChild(stats.dom);
// await loadGLTFModel("./model.gltf");
let mesh = await loadModel("./models/stanford-bunny.obj");
console.log(mesh);
let bilateralFilterMaterial = new THREE.ShaderMaterial({
  vertexShader: basicVertexShader,
  fragmentShader: bilateralFilter,
  uniforms: {
    tNormal: { value: null },
    tDepth: { value: null },
    sigmaR: { value: properties.bilateralFilter.SigmaR },
    sigmaS: { value: properties.bilateralFilter.SigmaS },
  },
});

let LLAMaterial = new THREE.ShaderMaterial({
  vertexShader: LLAVertexShader,
  fragmentShader: localLightAlignment,
  uniforms: {
    tScaleFine: { value: null },
    tScaleCoarse: { value: null },
    sigma: { value: properties.localLightAlignment.Sigma },
    gamma: { value: properties.localLightAlignment.Gamma },
    epsilon: { value: properties.localLightAlignment.Epsilon },
    lightDirection: {
      value: properties.lightPosition,
    },
  },
});

let postMaterial = new THREE.ShaderMaterial({
  vertexShader: basicVertexShader,
  fragmentShader: imageShader,
  uniforms: {
    image: { value: null },
  },
});

let targetA: THREE.WebGLRenderTarget,
  targetB: THREE.WebGLRenderTarget,
  firstRender: THREE.WebGLRenderTarget;

firstRender = setupRenderTarget(firstRender);
targetA = setupRenderTarget(targetA);
targetB = setupRenderTarget(targetB);

const scene = setupScene(rightPaneElement("Original Scene"), mesh);
const depthTextureScene = setupDepthTextureScene();
const filterPass1 = setupBilateralFilteringScene(
  "bilateral filter: first pass"
);
const filterPass2 = setupBilateralFilteringScene(
  "bilateral filter: second pass"
);
const filterPass3 = setupBilateralFilteringScene(
  "bilateral filter: third pass"
);
const filterPass4 = setupBilateralFilteringScene(
  "bilateral filter: fourth pass"
);
const LLAPass = setupLLAPass();
// const postPass = setupPostScene("Imageshader");

setupGUI();

let first = true;
requestAnimationFrame(render);
// const app = new App();
