import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { OBJLoader } from "three/examples/jsm/loaders/OBJLoader";
import { mergeVertices } from "three/examples/jsm/utils/BufferGeometryUtils.js";

import canvasToImage from "canvas-to-image";

import Stats from "three/examples/jsm/libs/stats.module";
import GUI from "lil-gui";

// Vertex shaders
import basicVS from "./webgl/glsl/basicVertexShader.vs";
import localLightAlignmentVS from "./webgl/glsl/localLightAlignment.vs";
import normalsVS from "./webgl/glsl/normals.vs";

// Fragment shaders
import depthFS from "./webgl/glsl/depth.fs";
import bilateralFilteringFS from "./webgl/glsl/bilateralFiltering.fs";
import localLightAlignmentFS from "./webgl/glsl/localLightAlignment.fs";
import normalsFS from "./webgl/glsl/normals.fs";
import lambertShadingSimpleFS from "./webgl/glsl/lambertShadingSimple.fs";
import lambertShadingLightDirectionTextureFS from "./webgl/glsl/lambertShadingLightDirectionTexture.fs";

class GeometryScene {
  scene: THREE.Scene;
  camera: THREE.PerspectiveCamera;
  normalMaterial: THREE.ShaderMaterial;
  isModelLoaded: boolean = false;

  constructor(modelUrl: string) {
    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera();
    this.normalMaterial = new THREE.ShaderMaterial({
      vertexShader: normalsVS,
      fragmentShader: normalsFS,
    });

    this.scene.add(this.camera);
    const geometry = new THREE.BoxGeometry(1, 1, 1);
    const material = new THREE.MeshBasicMaterial({ color: 0x00ff00 });
    const cube = new THREE.Mesh(geometry, material);
    this.scene.add(cube);
    this.loadModel(modelUrl);
  }

  loadModel(modelUrl: string) {
    const loader = new OBJLoader();
    loader.load(
      modelUrl,
      (object) => {
        let mesh = <THREE.Mesh>object.children[0];
        this.addModelToScene(mesh);
      },
      (xhr) => {
        console.log((xhr.loaded / xhr.total) * 100 + "% loaded");
      },
      (error) => {
        console.log(`Error caught during model loading: ${error}`);
      }
    );
  }

  addModelToScene(mesh: THREE.Mesh) {
    mesh.material = this.normalMaterial;
    mesh.geometry.deleteAttribute("normal");
    mesh.geometry = mergeVertices(mesh.geometry);
    mesh.geometry.center();
    mesh.geometry.computeVertexNormals();
    this.scene.add(mesh);
    this.fitViewToModel(this.camera, mesh);
    this.isModelLoaded = true;
  }

  fitViewToModel(camera: THREE.PerspectiveCamera, mesh: THREE.Mesh) {
    let height = 2 * this.getBoundingSphereRadius(mesh);
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

  getBoundingSphereRadius(mesh: THREE.Mesh): number {
    let boundingBox = new THREE.BoxHelper(mesh);
    return boundingBox.geometry.boundingSphere.radius;
  }
}

class PostProcessingScene {
  scene: THREE.Scene;
  plane: THREE.Mesh;
  camera: THREE.OrthographicCamera;

  // Materials
  lambertMaterialSimple: THREE.ShaderMaterial;
  lambertMaterialLightDirectionMap: THREE.ShaderMaterial;
  bilateralFilterMaterial: THREE.ShaderMaterial;
  localLightAlignmentMaterial: THREE.ShaderMaterial;
  depthTextureMaterial: THREE.ShaderMaterial;

  constructor(properties: any) {
    this.initializeMaterials(properties);
    this.camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
    this.scene = new THREE.Scene();
    this.plane = new THREE.Mesh(new THREE.PlaneGeometry(2, 2));
    this.scene.add(this.plane);
  }

  initializeMaterials(properties: any) {
    this.lambertMaterialSimple = new THREE.ShaderMaterial({
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
    this.lambertMaterialLightDirectionMap = new THREE.ShaderMaterial({
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
    this.bilateralFilterMaterial = new THREE.ShaderMaterial({
      vertexShader: basicVS,
      fragmentShader: bilateralFilteringFS,
      uniforms: {
        tNormal: { value: null },
        tDepth: { value: null },
        sigmaR: { value: properties.bilateralFilter.SigmaR },
        sigmaS: { value: properties.bilateralFilter.SigmaS },
      },
    });
    this.localLightAlignmentMaterial = new THREE.ShaderMaterial({
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
    this.depthTextureMaterial = new THREE.ShaderMaterial({
      vertexShader: basicVS,
      fragmentShader: depthFS,
      uniforms: {
        tDiffuse: { value: null },
        tDepth: { value: null },
      },
    });
  }

  prepareSimpleLambertShadingPass(normalsTexture: THREE.Texture) {
    this.lambertMaterialSimple.uniforms.tNormal.value = normalsTexture;
    this.plane.material = this.lambertMaterialSimple;
  }

  prepareLightDirectionMapLambertShadingPass(
    normalsTexture: THREE.Texture,
    lightDirections: THREE.Texture
  ) {
    this.lambertMaterialLightDirectionMap.uniforms.tNormal.value =
      normalsTexture;
    this.lambertMaterialLightDirectionMap.uniforms.tLightDirection.value =
      lightDirections;
    this.plane.material = this.lambertMaterialLightDirectionMap;
  }
  prepareBilateralFilteringPass(
    normalsTexture: THREE.Texture,
    sigmaS: number,
    depthTexture: THREE.DepthTexture
  ) {
    this.bilateralFilterMaterial.uniforms.tNormal.value = normalsTexture;
    this.bilateralFilterMaterial.uniforms.tDepth.value = depthTexture;
    this.bilateralFilterMaterial.uniforms.sigmaS.value = sigmaS;
    this.plane.material = this.bilateralFilterMaterial;
  }
  prepareLocalLightAlignmentPass(
    originalNormals: THREE.Texture,
    filteredNormals: THREE.Texture[]
  ) {
    this.localLightAlignmentMaterial.uniforms.scale0.value = originalNormals;
    for (let i: number = 0; i < filteredNormals.length; i++) {
      this.localLightAlignmentMaterial.uniforms[`scale${i + 1}`].value =
        filteredNormals[i];
    }
    this.plane.material = this.localLightAlignmentMaterial;
  }
  prepareDepthTexturePass(depthTexture: THREE.DepthTexture) {
    this.depthTextureMaterial.uniforms.tDepth.value = depthTexture;
    this.plane.material = this.depthTextureMaterial;
  }
}

export class LocalLightAlignmentApp {
  properties: {
    downloadPrompt: Function;
    textureResolution: number;
    textureResolutionHigh: number;
    lightPosition: {
      x: number;
      y: number;
      z: number;
    };
    bilateralFilter: {
      SigmaS: number;
      SigmaSMultiplier: number;
      SigmaR: number;
    };
    localLightAlignment: {
      Sigma_0: number;
      Sigma_1: number;
      Sigma_2: number;
      Sigma_3: number;
      Sigma_all: number;
      Epsilon: number;
      Gamma: number;
      numberOfScales: number;
    };
  } = {
    downloadPrompt: () => {
      let filenamePrefix = prompt(
        "Please enter a prefix for the images",
        this.getDefaultFilenamePrefix()
      );
      if (filenamePrefix == null || filenamePrefix == "") {
        return;
      } else {
        this.renderImages(filenamePrefix);
      }
    },
    textureResolution: 512,
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
      numberOfScales: 4,
    },
  };

  geometryScene: GeometryScene;
  postProcessingScene: PostProcessingScene;
  activeScene: PostProcessingScene | GeometryScene;

  // Rendertargets
  geometryPassTarget: THREE.WebGLRenderTarget;
  filterPassTargets: THREE.WebGLRenderTarget[];
  localLightAlignmentTarget: THREE.WebGLRenderTarget;

  htmlElements: {
    preShading: HTMLElement;
    postShading: HTMLElement;
    depthTexture: HTMLElement;
    originalNormals: HTMLElement;
    filterPasses: HTMLElement[];
  };

  controls: OrbitControls;
  gui: GUI;

  realTimeRenderer: THREE.WebGLRenderer;
  imageOutputRenderer: THREE.WebGLRenderer;
  activeRenderer: THREE.WebGLRenderer;

  modelName: string;

  constructor(modelUrl: string) {
    this.modelName = modelUrl.substring(
      modelUrl.lastIndexOf("/") + 1,
      modelUrl.lastIndexOf(".")
    );

    this.realTimeRenderer = new THREE.WebGLRenderer({
      alpha: true,
      canvas: document.getElementById("canvas"),
    });

    this.imageOutputRenderer = new THREE.WebGLRenderer({
      alpha: true,
      canvas: document.getElementById("imageRenderCanvas"),
      preserveDrawingBuffer: true,
    });

    this.geometryScene = new GeometryScene(modelUrl);
    this.postProcessingScene = new PostProcessingScene(this.properties);
    this.initializeRenderTargets();
    this.setupHTLMElements();
    this.controls = new OrbitControls(
      this.geometryScene.camera,
      this.htmlElements.preShading
    );
    this.gui = this.setupGUI();

    window.addEventListener("resize", this.onWindowResize);

    requestAnimationFrame(this.renderGeometry);

    // this.controls.addEventListener("end", this.render);
  }

  renderGeometry = () => {
    this.activeRenderer = this.realTimeRenderer;

    resizeRendererToDisplaySize(this.activeRenderer);
    this.activeRenderer.setScissorTest(false);
    this.activeRenderer.clear();
    this.activeRenderer.setScissorTest(true);

    this.activeScene = this.geometryScene;
    this.renderToTarget(this.geometryPassTarget);

    this.renderToHTMLElement(this.htmlElements.originalNormals);

    stats.update();
    requestAnimationFrame(this.renderGeometry);
  };

  render = () => {
    this.activeRenderer = this.realTimeRenderer;
    let post = this.postProcessingScene;

    resizeRendererToDisplaySize(this.activeRenderer);
    this.activeRenderer.setScissorTest(false);
    this.activeRenderer.clear();
    this.activeRenderer.setScissorTest(true);

    // this.activeScene = this.geometryScene;
    // this.renderToTarget(this.geometryPassTarget);

    // this.renderToHTMLElement(this.htmlElements.originalNormals);

    this.activeScene = this.postProcessingScene;
    post.prepareSimpleLambertShadingPass(this.geometryPassTarget.texture);
    this.renderToHTMLElement(this.htmlElements.preShading, this.controls);

    post.prepareDepthTexturePass(this.geometryPassTarget.depthTexture);
    this.renderToHTMLElement(this.htmlElements.depthTexture);

    let filteringInputNormals = [
      this.geometryPassTarget.texture,
      this.filterPassTargets[0].texture,
      this.filterPassTargets[1].texture,
      this.filterPassTargets[2].texture,
    ];

    for (
      let i = 0;
      i < this.properties.localLightAlignment.numberOfScales;
      i++
    ) {
      let sigmaMultiplier =
        this.properties.bilateralFilter.SigmaSMultiplier * (i + 1);
      let sigmaS = this.properties.bilateralFilter.SigmaS * sigmaMultiplier;

      post.prepareBilateralFilteringPass(
        filteringInputNormals[i],
        sigmaS,
        this.geometryPassTarget.depthTexture
      );
      this.renderToTarget(this.filterPassTargets[i]);
      this.renderToHTMLElement(this.htmlElements.filterPasses[i]);
    }

    post.prepareLocalLightAlignmentPass(
      this.geometryPassTarget.texture,
      this.filterPassTargets.map((target) => target.texture)
    );
    this.renderToTarget(this.localLightAlignmentTarget);

    post.prepareLightDirectionMapLambertShadingPass(
      this.geometryPassTarget.texture,
      this.localLightAlignmentTarget.texture
    );
    this.renderToHTMLElement(this.htmlElements.postShading);
    // stats.update();
    // requestAnimationFrame(this.render);
  };

  renderImages(filenamePrefix: string) {
    this.activeRenderer = this.imageOutputRenderer;
    let post = this.postProcessingScene;

    let highResGeometryPassTarget = this.getNewRenderTarget(
      this.properties.textureResolutionHigh,
      true
    );
    let highResLocalLightAlignmentTarget = this.getNewRenderTarget(
      this.properties.textureResolutionHigh
    );
    let highResFilterPassTargets = [];
    for (
      let i = 0;
      i < this.properties.localLightAlignment.numberOfScales;
      i++
    ) {
      highResFilterPassTargets[i] = this.getNewRenderTarget(
        this.properties.textureResolutionHigh
      );
    }

    resizeRendererToDimensions(
      this.activeRenderer,
      this.properties.textureResolutionHigh,
      this.properties.textureResolutionHigh / getAspectRatio()
    );

    this.activeScene = this.geometryScene;
    this.renderToTarget(highResGeometryPassTarget);

    this.activeScene = this.postProcessingScene;

    post.prepareSimpleLambertShadingPass(highResGeometryPassTarget.texture);
    this.imageOutputRenderer.render(post.scene, post.camera);
    canvasToImage(this.imageOutputRenderer.domElement, {
      name: `${filenamePrefix}_pre_shading`,
      type: "jpg",
      quality: 1,
    });

    post.prepareDepthTexturePass(highResGeometryPassTarget.depthTexture);
    this.imageOutputRenderer.render(post.scene, post.camera);
    canvasToImage(this.imageOutputRenderer.domElement, {
      name: `${filenamePrefix}_depth`,
      type: "jpg",
      quality: 1,
    });

    let filteringInputNormals = [
      highResGeometryPassTarget.texture,
      highResFilterPassTargets[0].texture,
      highResFilterPassTargets[1].texture,
      highResFilterPassTargets[2].texture,
    ];

    for (
      let i = 0;
      i < this.properties.localLightAlignment.numberOfScales;
      i++
    ) {
      let sigmaMultiplier =
        this.properties.bilateralFilter.SigmaSMultiplier * (i + 1);
      let sigmaS = this.properties.bilateralFilter.SigmaS * sigmaMultiplier;

      post.prepareBilateralFilteringPass(
        filteringInputNormals[i],
        sigmaS,
        highResGeometryPassTarget.depthTexture
      );
      this.renderToTarget(highResFilterPassTargets[i]);
    }

    post.prepareLocalLightAlignmentPass(
      highResGeometryPassTarget.texture,
      highResFilterPassTargets.map((target) => target.texture)
    );
    this.renderToTarget(highResLocalLightAlignmentTarget);

    post.prepareLightDirectionMapLambertShadingPass(
      highResGeometryPassTarget.texture,
      highResLocalLightAlignmentTarget.texture
    );
    this.imageOutputRenderer.render(post.scene, post.camera);
    canvasToImage(this.imageOutputRenderer.domElement, {
      name: `${filenamePrefix}_post_shading`,
      type: "jpg",
      quality: 1,
    });

    this.imageOutputRenderer.clear();
    highResFilterPassTargets.forEach((target) => target.dispose());
    highResGeometryPassTarget.dispose();
    highResLocalLightAlignmentTarget.dispose();
  }

  initializeRenderTargets() {
    this.geometryPassTarget = this.getNewRenderTarget(
      this.properties.textureResolution,
      true
    );
    this.localLightAlignmentTarget = this.getNewRenderTarget(
      this.properties.textureResolution
    );
    this.filterPassTargets = [];
    for (
      let i = 0;
      i < this.properties.localLightAlignment.numberOfScales;
      i++
    ) {
      this.filterPassTargets[i] = this.getNewRenderTarget(
        this.properties.textureResolution
      );
    }
  }

  getNewRenderTarget(
    textureResolution: number,
    useDepthTexture: boolean = false
  ): THREE.WebGLRenderTarget {
    let aspectRatio = getAspectRatio();
    let target = new THREE.WebGLRenderTarget(
      textureResolution,
      textureResolution / aspectRatio
    );

    target.texture.minFilter = THREE.LinearFilter;
    target.texture.magFilter = THREE.LinearFilter;
    if (useDepthTexture) {
      target.depthTexture = new THREE.DepthTexture(
        textureResolution,
        textureResolution
      );
    }
    return target;
  }

  getDefaultFilenamePrefix = () => {
    let sigmastring = [
      this.properties.localLightAlignment.Sigma_0,
      this.properties.localLightAlignment.Sigma_1,
      this.properties.localLightAlignment.Sigma_2,
      this.properties.localLightAlignment.Sigma_3,
    ].toString();

    return `LLA_${this.properties.textureResolutionHigh}_Gamma[${this.properties.localLightAlignment.Gamma}]_Sigma_${sigmastring}_${this.modelName}`;
  };

  setupHTLMElements() {
    let leftPane = document.getElementById("leftPane");
    let rightPane = document.getElementById("rightPane");
    this.htmlElements = {
      preShading: this.getHTMLFrameElement("Preshading", rightPane),
      postShading: this.getHTMLFrameElement("Postshading", rightPane),
      depthTexture: this.getHTMLFrameElement("Depth-texture", leftPane),
      originalNormals: this.getHTMLFrameElement("Original normals", leftPane),
      filterPasses: [],
    };
    for (
      let i = 0;
      i < this.properties.localLightAlignment.numberOfScales;
      i++
    ) {
      this.htmlElements.filterPasses[i] = this.getHTMLFrameElement(
        `Bilateral filtering: pass ${i + 1}`,
        leftPane
      );
    }
  }

  getHTMLFrameElement(label: string, parentElement: HTMLElement): HTMLElement {
    const element = document.createElement("div");
    const renderFrame = document.createElement("div");
    const labelDiv = document.createElement("div");
    labelDiv.innerText = label;
    element.className = "viewFrame";
    renderFrame.className = "renderFrame"; // TODO change className
    labelDiv.className = "label";
    element.appendChild(renderFrame);
    element.appendChild(labelDiv);
    parentElement.appendChild(element);
    return renderFrame;
  }

  onGuiChange = () => {
    this.postProcessingScene.bilateralFilterMaterial.uniforms.sigmaS.value =
      this.properties.bilateralFilter.SigmaS;
    this.postProcessingScene.bilateralFilterMaterial.uniforms.sigmaR.value =
      this.properties.bilateralFilter.SigmaR;
    this.postProcessingScene.localLightAlignmentMaterial.uniforms.sigma.value =
      [
        this.properties.localLightAlignment.Sigma_0,
        this.properties.localLightAlignment.Sigma_1,
        this.properties.localLightAlignment.Sigma_2,
        this.properties.localLightAlignment.Sigma_3,
      ];
    this.postProcessingScene.localLightAlignmentMaterial.uniforms.gamma.value =
      this.properties.localLightAlignment.Gamma;
    this.postProcessingScene.localLightAlignmentMaterial.uniforms.epsilon.value =
      this.properties.localLightAlignment.Epsilon;
    this.postProcessingScene.localLightAlignmentMaterial.uniforms.lightDirection.value =
      this.properties.lightPosition;
  };

  setupGUI() {
    let gui = new GUI();
    gui.add(this.properties, "downloadPrompt").name("Save high-res renders");
    const lightFolder = gui.addFolder("Light position");
    lightFolder
      .add(this.properties.lightPosition, "x", -1, 1)
      .onChange(this.onGuiChange);
    lightFolder
      .add(this.properties.lightPosition, "y", -1, 1)
      .onChange(this.onGuiChange);
    lightFolder
      .add(this.properties.lightPosition, "z", -1, 1)
      .onChange(this.onGuiChange);
    const filterFolder = gui.addFolder("Bilateral Filter");
    filterFolder
      .add(this.properties.bilateralFilter, "SigmaS", 0, 10)
      .onChange(this.onGuiChange);
    filterFolder
      .add(this.properties.bilateralFilter, "SigmaSMultiplier", 1, 2.5)
      .onChange(this.onGuiChange);
    filterFolder
      .add(this.properties.bilateralFilter, "SigmaR", 0, 0.5)
      .onChange(this.onGuiChange);

    filterFolder.open();
    const llaFolder = gui.addFolder("Local Light Alignment");
    llaFolder
      .add(this.properties.localLightAlignment, "Sigma_0", 0, 1)
      .onChange(this.onGuiChange)
      .listen();
    llaFolder
      .add(this.properties.localLightAlignment, "Sigma_1", 0, 1)
      .onChange(this.onGuiChange)
      .listen();
    llaFolder
      .add(this.properties.localLightAlignment, "Sigma_2", 0, 1)
      .onChange(this.onGuiChange)
      .listen();
    llaFolder
      .add(this.properties.localLightAlignment, "Sigma_3", 0, 1)
      .onChange(this.onGuiChange)
      .listen();
    llaFolder
      .add(this.properties.localLightAlignment, "Sigma_all", 0, 1)
      .onChange((newVal: number) => {
        this.properties.localLightAlignment.Sigma_0 = newVal;
        this.properties.localLightAlignment.Sigma_1 = newVal;
        this.properties.localLightAlignment.Sigma_2 = newVal;
        this.properties.localLightAlignment.Sigma_3 = newVal;
        this.onGuiChange();
      });

    llaFolder
      .add(this.properties.localLightAlignment, "Epsilon", 1e-10, 1e-4)
      .onChange(this.onGuiChange);
    llaFolder
      .add(this.properties.localLightAlignment, "Gamma", 0.5, 6)
      .onChange(this.onGuiChange);
    return gui;
  }

  onWindowResize(): void {
    const width = this.realTimeRenderer.domElement.clientWidth;
    const height = this.realTimeRenderer.domElement.clientHeight;
    this.realTimeRenderer.setSize(width, height);
    this.geometryScene.camera.aspect = getAspectRatio();
    this.geometryScene.camera.updateProjectionMatrix();
  }

  renderToTarget(target: THREE.WebGLRenderTarget) {
    let { scene, camera } = this.activeScene;
    this.activeRenderer.setRenderTarget(target);
    this.activeRenderer.clear();
    this.activeRenderer.render(scene, camera);
    this.activeRenderer.setRenderTarget(null);
  }

  renderToHTMLElement(element: HTMLElement, controls?: OrbitControls) {
    let { scene, camera } = this.activeScene;
    // get the viewport relative position of this element
    const { left, right, top, bottom, width, height } =
      element.getBoundingClientRect();

    const isOffscreen =
      bottom < 0 ||
      top > this.activeRenderer.domElement.clientHeight ||
      right < 0 ||
      left > this.activeRenderer.domElement.clientWidth;

    if (isOffscreen) {
      return;
    }

    if (!!controls) {
      controls.update();
    }
    camera.updateProjectionMatrix();

    const positiveYUpBottom =
      this.activeRenderer.domElement.clientHeight - bottom;
    this.activeRenderer.setScissor(left, positiveYUpBottom, width, height);
    this.activeRenderer.setViewport(left, positiveYUpBottom, width, height);
    this.activeRenderer.render(scene, camera);
  }
}

function getAspectRatio() {
  return window.innerWidth / window.innerHeight;
}

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

function resizeRendererToDisplaySize(renderer: THREE.WebGLRenderer) {
  const width = renderer.domElement.clientWidth;
  const height = renderer.domElement.clientHeight;
  return resizeRendererToDimensions(renderer, width, height);
}

const stats = Stats();
document.body.appendChild(stats.dom);
let app = new LocalLightAlignmentApp("./models/fertility.obj");
