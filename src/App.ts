/*
 * App.ts
 * ===========
 * Entry from Webpack, generates Three.js View
 */

// import View from "./webgl/View";
import { LocalLightAlignmentApp } from "./LLA";
import * as THREE from "three";
import canvasToImage from "canvas-to-image";
import { OBJLoader } from "three/examples/jsm/loaders/OBJLoader";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { mergeVertices } from "three/examples/jsm/utils/BufferGeometryUtils.js";

import Stats from "three/examples/jsm/libs/stats.module";
import GUI from "lil-gui";

import basicVS from "./webgl/glsl/basicVertexShader.vs";
import localLightAlignmentVS from "./webgl/glsl/localLightAlignment.vs";
import normalsVS from "./webgl/glsl/normals.vs";

import depthFS from "./webgl/glsl/depth.fs";
import bilateralFilteringFS from "./webgl/glsl/bilateralFiltering.fs";
import localLightAlignmentFS from "./webgl/glsl/localLightAlignment.fs";
import normalsFS from "./webgl/glsl/normals.fs";
import lambertShadingSimpleFS from "./webgl/glsl/lambertShadingSimple.fs";
import lambertShadingLightDirectionTextureFS from "./webgl/glsl/lambertShadingLightDirectionTexture.fs";

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
  downloadPrompt: downloadHQRendersPrompt,
  textureResolution: 256,
  textureResolutionHigh: 2048,
  lightPosition: {
    x: 0,
    y: 1,
    z: 0.5,
  },
  bilateralFilter: {
    SigmaS: 1.5,
    SigmaSMultiplier: 1.7,
    SigmaR: 0.01,
  },
  localLightAlignment: {
    Sigma_0: 0.5,
    Sigma_1: 0.5,
    Sigma_2: 0.5,
    Sigma_3: 0.5,
    Sigma_all: 0.5,
    Epsilon: 1e-6,
    Gamma: 3,
  },
};

function downloadHQRendersPrompt() {
  let filenamePrefix = prompt(
    "Please enter a prefix for the images",
    "LLA_render"
  );
  if (filenamePrefix == null || filenamePrefix == "") {
    return;
  } else {
    renderAndDownloadHQImages(filenamePrefix);
  }
}

//Done
async function loadModel(url: string): Promise<THREE.Mesh> {
  const loader = new OBJLoader();
  try {
    let result = await loader.loadAsync(url, function (xhr: ProgressEvent) {
      console.log((xhr.loaded / xhr.total) * 100 + "% loaded");
    });
    let mesh = <THREE.Mesh>result.children[0];
    mesh.material = new THREE.ShaderMaterial({
      vertexShader: normalsVS,
      fragmentShader: normalsFS,
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
//Done
function onGuiChange() {
  bilateralFilterMaterial.uniforms.sigmaS.value =
    properties.bilateralFilter.SigmaS;
  bilateralFilterMaterial.uniforms.sigmaR.value =
    properties.bilateralFilter.SigmaR;
  LLAMaterial.uniforms.sigma.value = [
    properties.localLightAlignment.Sigma_0,
    properties.localLightAlignment.Sigma_1,
    properties.localLightAlignment.Sigma_2,
    properties.localLightAlignment.Sigma_3,
  ];
  LLAMaterial.uniforms.gamma.value = properties.localLightAlignment.Gamma;
  LLAMaterial.uniforms.epsilon.value = properties.localLightAlignment.Epsilon;
  LLAMaterial.uniforms.lightDirection.value = properties.lightPosition;
}
//Done
function onAllSigmaChange(newVal: number) {
  properties.localLightAlignment.Sigma_0 = newVal;
  properties.localLightAlignment.Sigma_1 = newVal;
  properties.localLightAlignment.Sigma_2 = newVal;
  properties.localLightAlignment.Sigma_3 = newVal;
  onGuiChange();
}
//Done
function setupGUI() {
  const gui = new GUI();
  gui.add(properties, "downloadPrompt").name("Save high-res renders");
  const lightFolder = gui.addFolder("Light position");
  lightFolder.add(properties.lightPosition, "x", -1, 1).onChange(onGuiChange);
  lightFolder.add(properties.lightPosition, "y", -1, 1).onChange(onGuiChange);
  lightFolder.add(properties.lightPosition, "z", -1, 1).onChange(onGuiChange);
  const filterFolder = gui.addFolder("Bilateral Filter");
  filterFolder
    .add(properties.bilateralFilter, "SigmaS", 0, 10)
    .onChange(onGuiChange);
  filterFolder
    .add(properties.bilateralFilter, "SigmaSMultiplier", 1, 2.5)
    .onChange(onGuiChange);
  filterFolder
    .add(properties.bilateralFilter, "SigmaR", 0, 0.5)
    .onChange(onGuiChange);

  filterFolder.open();
  const llaFolder = gui.addFolder("Local Light Alignment");
  llaFolder
    .add(properties.localLightAlignment, "Sigma_0", 0, 1)
    .onChange(onGuiChange)
    .listen();
  llaFolder
    .add(properties.localLightAlignment, "Sigma_1", 0, 1)
    .onChange(onGuiChange)
    .listen();
  llaFolder
    .add(properties.localLightAlignment, "Sigma_2", 0, 1)
    .onChange(onGuiChange)
    .listen();
  llaFolder
    .add(properties.localLightAlignment, "Sigma_3", 0, 1)
    .onChange(onGuiChange)
    .listen();
  llaFolder
    .add(properties.localLightAlignment, "Sigma_all", 0, 1)
    .onChange(onAllSigmaChange);

  llaFolder
    .add(properties.localLightAlignment, "Epsilon", 1e-10, 1e-4)
    .onChange(onGuiChange);
  llaFolder
    .add(properties.localLightAlignment, "Gamma", 0.5, 6)
    .onChange(onGuiChange);
}
//Done
function leftPaneElement(label: string): HTMLElement {
  const element = document.createElement("div");
  const renderFrame = document.createElement("div");
  const labelDiv = document.createElement("div");
  labelDiv.innerText = label;
  element.className = "viewFrame";
  renderFrame.className = "renderFrame";
  labelDiv.className = "label";
  element.appendChild(renderFrame);
  element.appendChild(labelDiv);
  document.getElementById("leftPane").appendChild(element);
  return renderFrame;
}
//Done
function rightPaneElement(label: string): HTMLElement {
  const element = document.createElement("div");
  const renderFrame = document.createElement("div");
  const labelDiv = document.createElement("div");
  labelDiv.innerText = label;
  element.className = "viewFrame";
  renderFrame.className = "renderFrame";
  labelDiv.className = "label";
  element.appendChild(renderFrame);
  element.appendChild(labelDiv);
  document.getElementById("rightPane").appendChild(element);
  return renderFrame;
}
//Done
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
//Done
function resizeRendererToDimensions(
  renderer: THREE.WebGLRenderer,
  width: number,
  height: number
) {
  const canvas = renderer.domElement;
  const needResize = canvas.width !== width || canvas.height !== height;
  if (needResize) {
    renderer.setSize(width, height, true);
  }
  return needResize;
}

//Done
function setupGeometryScene(mesh: THREE.Mesh) {
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera();

  scene.add(camera);
  scene.add(mesh);

  fitViewToModel(camera, mesh);
  return { scene, camera, mesh };
}

//Done
function setupPreShadedScene(element: HTMLElement) {
  const sceneInfo = getNewPostProcessingScene(lambertMaterial);
  const controls = new OrbitControls(scene.camera, element);
  return { ...sceneInfo, controls, elem: element };
}
//Done
function setupPostShadedScene(element: HTMLElement) {
  const sceneInfo = getNewPostProcessingScene(lambertMaterialPostLLA);
  return { ...sceneInfo, elem: element };
}
//Done
function getBoundingSphereRadius(mesh: THREE.Mesh): number {
  let boundingBox = new THREE.BoxHelper(mesh);
  return boundingBox.geometry.boundingSphere.radius;
}
//Done
function fitViewToModel(camera: THREE.PerspectiveCamera, mesh: THREE.Mesh) {
  let height = 2 * getBoundingSphereRadius(mesh);
  let fov = 60;
  let dist = height / 2 / Math.tan((Math.PI * fov) / 360);
  camera.near = dist - height / 2;
  camera.far = dist + height / 2;
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.fov = fov;
  camera.lookAt(0, 0, 0);
  camera.position.z = dist;
  camera.updateProjectionMatrix();
}

//Done
function setupRenderTarget(textureResolution: number) {
  const format = THREE.DepthFormat;
  const type = THREE.UnsignedShortType;

  let target = new THREE.WebGLRenderTarget(
    textureResolution,
    textureResolution
  );
  target.texture.minFilter = THREE.LinearFilter;
  target.texture.magFilter = THREE.LinearFilter;
  target.stencilBuffer = format === THREE.DepthStencilFormat ? true : false;
  target.depthTexture = new THREE.DepthTexture(
    textureResolution,
    textureResolution
  );
  target.depthTexture.format = format;
  target.depthTexture.type = type;
  return target;
}
//Done
function setupDepthTextureScene(): SceneInfo {
  let element = leftPaneElement("Depth texture");
  let postMaterial = new THREE.ShaderMaterial({
    vertexShader: basicVS,
    fragmentShader: depthFS,
    uniforms: {
      tDiffuse: { value: null },
      tDepth: { value: null },
    },
  });
  let scene = getNewPostProcessingScene(postMaterial);
  return { ...scene, elem: element };
}
//Done
function setupLLAPass(): SceneInfo {
  let scene = getNewPostProcessingScene(LLAMaterial);
  return { ...scene };
}
//Done
function setupBilateralFilteringScene(label: string): SceneInfo {
  let element = leftPaneElement(label);
  let scene = getNewPostProcessingScene(bilateralFilterMaterial);
  return { ...scene, elem: element };
}

//Done
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

//Done
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
  renderer: THREE.WebGLRenderer,
  pass: SceneInfo,
  source: THREE.WebGLRenderTarget,
  target: THREE.WebGLRenderTarget,
  depthTexture: THREE.DepthTexture,
  sigmaS: number
) {
  // Set uniforms for pass
  pass.material = bilateralFilterMaterial;
  pass.material.uniforms.tNormal.value = source.texture;
  pass.material.uniforms.sigmaS.value = sigmaS;
  pass.material.uniforms.tDepth.value = depthTexture;

  // Render filterpass to target
  renderer.setRenderTarget(target);
  renderer.clear();
  renderer.render(pass.scene, pass.camera);

  renderer.setRenderTarget(null);
}

function renderLLAPass(
  renderer: THREE.WebGLRenderer,
  sceneInfo: SceneInfo,
  target: THREE.WebGLRenderTarget,
  scales: THREE.WebGLRenderTarget[]
) {
  let { scene, camera, material } = sceneInfo;
  material = LLAMaterial;
  material.uniforms.scale0.value = scales[0].texture;
  material.uniforms.scale1.value = scales[1].texture;
  material.uniforms.scale2.value = scales[2].texture;
  material.uniforms.scale3.value = scales[3].texture;
  material.uniforms.scale4.value = scales[4].texture;

  renderer.setRenderTarget(target);
  renderer.render(scene, camera);
  renderer.setRenderTarget(null);
}

function render() {
  resizeRendererToDisplaySize(renderer);

  renderer.setScissorTest(false);
  renderer.clear();
  renderer.setScissorTest(true);

  // Render scene with mesh to texture
  console.log(rendertargets[0].texture);
  renderer.setRenderTarget(rendertargets[0]);
  renderer.clear();
  renderer.render(scene.scene, scene.camera);
  renderer.setRenderTarget(null);
  console.log(rendertargets[0].texture);
  // Render shaded scene from normals texture to canvas
  preshading.material.uniforms.tNormal.value = rendertargets[0].texture;
  renderSceneToElement(preshading);

  let depthTexture = rendertargets[0].depthTexture;

  // Render depth texture
  depthTextureScene.material.uniforms.tDepth.value =
    rendertargets[0].depthTexture;
  renderer.setRenderTarget(null);
  renderSceneToElement(depthTextureScene);

  let filterSigma = properties.bilateralFilter.SigmaS;
  let increasePerPass = properties.bilateralFilter.SigmaSMultiplier;

  renderFilterPass(
    renderer,
    filterPass1,
    rendertargets[0],
    rendertargets[1],
    depthTexture,
    filterSigma
  );
  // original normals, not first pass
  renderSceneToElement(filterPass1);
  filterSigma = filterSigma * increasePerPass;
  renderFilterPass(
    renderer,
    filterPass2,
    rendertargets[1],
    rendertargets[2],
    depthTexture,
    filterSigma
  );
  renderSceneToElement(filterPass2);
  filterSigma = filterSigma * increasePerPass;
  renderFilterPass(
    renderer,
    filterPass3,
    rendertargets[2],
    rendertargets[3],
    depthTexture,
    filterSigma
  );
  renderSceneToElement(filterPass3);
  filterSigma = filterSigma * increasePerPass;
  renderFilterPass(
    renderer,
    filterPass4,
    rendertargets[3],
    rendertargets[4],
    depthTexture,
    filterSigma
  );
  // This is not the last pass im rendering, its the second to last.
  renderSceneToElement(filterPass4);

  let lightDirections = setupRenderTarget(properties.textureResolution);
  renderLLAPass(renderer, LLAPass, lightDirections, rendertargets);

  postshading.material.uniforms.tLightDirection.value = lightDirections.texture;
  postshading.material.uniforms.tNormal.value = rendertargets[0].texture;
  renderSceneToElement(postshading);

  stats.update();
  requestAnimationFrame(render);
}

function renderAndDownloadHQImages(filenamePrefix: string) {
  const imageRenderer = new THREE.WebGLRenderer({
    alpha: true,
    canvas: document.getElementById("imageRenderCanvas"),
    preserveDrawingBuffer: true,
  });

  let highResRenderTargets: THREE.WebGLRenderTarget[] = [];
  for (let i = 0; i < 5; i++) {
    highResRenderTargets[i] = setupRenderTarget(
      properties.textureResolutionHigh
    );
  }

  imageRenderer.setRenderTarget(highResRenderTargets[0]);
  imageRenderer.clear();
  imageRenderer.render(scene.scene, scene.camera);

  imageRenderer.setRenderTarget(null);
  resizeRendererToDimensions(
    imageRenderer,
    properties.textureResolutionHigh,
    properties.textureResolutionHigh
  );

  // Render depth texture to canvas
  depthTextureScene.material.uniforms.tDepth.value =
    highResRenderTargets[0].depthTexture;
  imageRenderer.render(depthTextureScene.scene, depthTextureScene.camera);
  // Save canvas to image and download
  canvasToImage(imageRenderer.domElement, {
    name: `${filenamePrefix}_depth`,
    type: "jpg",
    quality: 1,
  });

  // Render preshading to canvas
  preshading.material.uniforms.tNormal.value = highResRenderTargets[0].texture;
  imageRenderer.render(preshading.scene, preshading.camera);
  canvasToImage(imageRenderer.domElement, {
    name: `${filenamePrefix}_pre_shading`,
    type: "jpg",
    quality: 1,
  });

  let filterSigma = properties.bilateralFilter.SigmaS;
  let increasePerPass = properties.bilateralFilter.SigmaSMultiplier;

  let depthTexture = highResRenderTargets[0].depthTexture;

  renderFilterPass(
    imageRenderer,
    filterPass1,
    highResRenderTargets[0],
    highResRenderTargets[1],
    depthTexture,
    filterSigma
  );
  filterSigma = filterSigma * increasePerPass;
  renderFilterPass(
    imageRenderer,
    filterPass2,
    highResRenderTargets[1],
    highResRenderTargets[2],
    depthTexture,
    filterSigma
  );
  filterSigma = filterSigma * increasePerPass;
  renderFilterPass(
    imageRenderer,
    filterPass3,
    highResRenderTargets[2],
    highResRenderTargets[3],
    depthTexture,
    filterSigma
  );
  filterSigma = filterSigma * increasePerPass;
  renderFilterPass(
    imageRenderer,
    filterPass4,
    highResRenderTargets[3],
    highResRenderTargets[4],
    depthTexture,
    filterSigma
  );

  LLAPass.material.uniforms.scale0.value = highResRenderTargets[0].texture;
  LLAPass.material.uniforms.scale1.value = highResRenderTargets[1].texture;
  LLAPass.material.uniforms.scale2.value = highResRenderTargets[2].texture;
  LLAPass.material.uniforms.scale3.value = highResRenderTargets[3].texture;
  LLAPass.material.uniforms.scale4.value = highResRenderTargets[4].texture;

  let lightDirections = setupRenderTarget(properties.textureResolutionHigh);
  renderLLAPass(imageRenderer, LLAPass, lightDirections, highResRenderTargets);

  postshading.material.uniforms.tNormal.value = highResRenderTargets[0].texture;
  postshading.material.uniforms.tLightDirection.value = lightDirections.texture;
  imageRenderer.render(postshading.scene, postshading.camera);
  canvasToImage(imageRenderer.domElement, {
    name: `${filenamePrefix}_post_shading`,
    type: "jpg",
    quality: 1,
  });

  highResRenderTargets.forEach((target) => target.dispose());
  lightDirections.dispose();
  imageRenderer.dispose();
  imageRenderer.clear();
  // requestAnimationFrame(testRender);
}

function testRender() {
  renderAndDownloadHQImages("test");
}

// let app = new LocalLightAlignmentApp("./models/stanford-bunny.obj");
// app.animate();

// Script part below

const renderer = new THREE.WebGLRenderer({
  alpha: true,
  canvas: document.getElementById("canvas"),
});

const stats = Stats();
document.body.appendChild(stats.dom);
let mesh = await loadModel("./models/stanford-bunny.obj");

let bilateralFilterMaterial = new THREE.ShaderMaterial({
  vertexShader: basicVS,
  fragmentShader: bilateralFilteringFS,
  uniforms: {
    tNormal: { value: null },
    tDepth: { value: null },
    sigmaR: { value: properties.bilateralFilter.SigmaR },
    sigmaS: { value: properties.bilateralFilter.SigmaS },
  },
});

let LLAMaterial = new THREE.ShaderMaterial({
  vertexShader: localLightAlignmentVS,
  fragmentShader: localLightAlignmentFS,
  uniforms: {
    scale0: { value: null },
    scale1: { value: null },
    scale2: { value: null },
    scale3: { value: null },
    scale4: { value: null },
    sigma: {
      value: [
        properties.localLightAlignment.Sigma_0,
        properties.localLightAlignment.Sigma_1,
        properties.localLightAlignment.Sigma_2,
        properties.localLightAlignment.Sigma_3,
      ],
    },
    gamma: { value: properties.localLightAlignment.Gamma },
    epsilon: { value: properties.localLightAlignment.Epsilon },
    lightDirection: {
      value: properties.lightPosition,
    },
  },
});

let lambertMaterial = new THREE.ShaderMaterial({
  vertexShader: basicVS,
  fragmentShader: lambertShadingSimpleFS,
  uniforms: {
    lightDirection: {
      value: properties.lightPosition,
    },
    tNormal: {
      value: null,
    },
  },
});

let lambertMaterialPostLLA = new THREE.ShaderMaterial({
  vertexShader: basicVS,
  fragmentShader: lambertShadingLightDirectionTextureFS,
  uniforms: {
    tLightDirection: {
      value: null,
    },
    tNormal: {
      value: null,
    },
  },
});

let rendertargets: THREE.WebGLRenderTarget[] = [];
for (let i = 0; i < 5; i++) {
  rendertargets[i] = setupRenderTarget(properties.textureResolution);
}

const scene = setupGeometryScene(mesh);
const preshading = setupPreShadedScene(
  rightPaneElement("Lambertian shading w/ single light direction")
);
const postshading = setupPostShadedScene(
  rightPaneElement("Lambertian shading w/ local light alignment")
);
const depthTextureScene = setupDepthTextureScene();

const filterPass1 = setupBilateralFilteringScene("Bilateral filter: 1st pass");
const filterPass2 = setupBilateralFilteringScene("Bilateral filter: 2nd pass");
const filterPass3 = setupBilateralFilteringScene("Bilateral filter: 3rd pass");
const filterPass4 = setupBilateralFilteringScene("Bilateral filter: 4th pass");

const LLAPass = setupLLAPass();

setupGUI();
let first = false;

// requestAnimationFrame(renderToImage);
requestAnimationFrame(render);