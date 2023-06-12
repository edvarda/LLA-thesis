import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { OBJLoader } from "three/examples/jsm/loaders/OBJLoader";
import { mergeVertices } from "three/examples/jsm/utils/BufferGeometryUtils.js";

import JSZip from "jszip";
import { saveAs } from "file-saver";

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
import unpackNormalsFS from "./webgl/glsl/unpackNormals.fs";
import lambertShadingLightDirectionTextureFS from "./webgl/glsl/lambertShadingLightDirectionTexture.fs";
import { Group } from "three";

// Properties and tests

import { Properties, Test, defaultProperties, TestSuite } from "./properties";
import scaleSeparations from "./sigmaVariations";
import { scaleSpaceTests, enhancementStrengthTests } from "./testSuites";

class GeometryScene {
  scene: THREE.Scene;
  camera: THREE.PerspectiveCamera;
  normalMaterial: THREE.ShaderMaterial;

  constructor(model: THREE.Mesh) {
    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera();
    this.normalMaterial = new THREE.ShaderMaterial({
      vertexShader: normalsVS,
      fragmentShader: normalsFS,
    });

    this.scene.add(this.camera);
    this.addModelToScene(model);
  }

  addModelToScene(mesh: THREE.Mesh) {
    mesh.material = this.normalMaterial;
    mesh.geometry.deleteAttribute("normal");
    mesh.geometry = mergeVertices(mesh.geometry);
    mesh.geometry.center();
    mesh.geometry.computeVertexNormals();
    this.scene.add(mesh);
    this.fitViewToModel(this.camera, mesh);
  }

  fitViewToModel(camera: THREE.PerspectiveCamera, mesh: THREE.Mesh) {
    let height = 1.25 * this.getBoundingSphereRadius(mesh);
    let fov = 20;
    let dist = height / 2 / Math.tan((Math.PI * fov) / 360);
    camera.near = dist - (2 * height) / 3;
    camera.far = dist + (2 * height) / 3;
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
  unpackNormalsMaterial: THREE.ShaderMaterial;

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
    this.unpackNormalsMaterial = new THREE.ShaderMaterial({
      vertexShader: basicVS,
      fragmentShader: unpackNormalsFS,
      uniforms: {
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
        near: { value: null },
        far: { value: null },
      },
    });
  }

  prepareSimpleLambertShadingPass(normalsTexture: THREE.Texture) {
    this.lambertMaterialSimple.uniforms.tNormal.value = normalsTexture;
    this.plane.material = this.lambertMaterialSimple;
  }

  prepareUnpackedNormalsPass(normalsTexture: THREE.Texture) {
    this.unpackNormalsMaterial.uniforms.tNormal.value = normalsTexture;
    this.plane.material = this.unpackNormalsMaterial;
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
  prepareDepthTexturePass(
    depthTexture: THREE.DepthTexture,
    cameraNear: number,
    cameraFar: number
  ) {
    this.depthTextureMaterial.uniforms.tDepth.value = depthTexture;
    this.depthTextureMaterial.uniforms.near.value = cameraNear;
    this.depthTextureMaterial.uniforms.far.value = cameraFar;
    this.plane.material = this.depthTextureMaterial;
  }
}

export class LocalLightAlignmentApp {
  properties: Properties | Test;
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
  shouldRenderPostProcessing: boolean;
  scrollEndTimer: NodeJS.Timeout;

  constructor(modelUrl: string, properties: Properties) {
    this.properties = properties;
    this.properties.downloadPrompt = this.downloadPrompt;
    this.setupTests();

    this.modelName = modelUrl.substring(
      modelUrl.lastIndexOf("/") + 1,
      modelUrl.lastIndexOf(".")
    );

    this.realTimeRenderer = new THREE.WebGLRenderer({
      alpha: true,
      canvas: document.getElementById("canvas"),
      preserveDrawingBuffer: true,
      precision: "highp",
    });

    this.imageOutputRenderer = new THREE.WebGLRenderer({
      alpha: true,
      canvas: document.getElementById("imageRenderCanvas"),
      preserveDrawingBuffer: true,
      precision: "highp",
    });

    this.postProcessingScene = new PostProcessingScene(this.properties);
    this.initializeRenderTargets();
    this.setupHTLMElements();

    window.addEventListener("resize", this.onWindowResize);
    document.addEventListener("scroll", () => {
      clearTimeout(this.scrollEndTimer);
      this.scrollEndTimer = setTimeout(() => {
        this.shouldRenderPostProcessing = true;
      }, 50);
    });

    this.loadModel(modelUrl, (loadedObject: Group) => {
      let mesh = <THREE.Mesh>loadedObject.children[0];
      this.geometryScene = new GeometryScene(mesh);

      this.controls = new OrbitControls(
        this.geometryScene.camera,
        this.htmlElements.preShading
      );
      this.controls.addEventListener(
        "end",
        () => (this.shouldRenderPostProcessing = true)
      );
      this.shouldRenderPostProcessing = true;
      requestAnimationFrame(this.render);
    });
  }

  loadModel(modelUrl: string, onLoad: (group: Group) => void) {
    const loader = new OBJLoader();
    loader.load(
      modelUrl,
      onLoad,
      (xhr) => {
        console.log((xhr.loaded / xhr.total) * 100 + "% loaded");
      },
      (error) => {
        console.log(`Error caught during model loading: ${error}`);
      }
    );
  }

  downloadPrompt = () => {
    let filenamePrefix = prompt(
      "Please enter a prefix for the images",
      this.getDefaultFilenamePrefix()
    );
    if (filenamePrefix == null || filenamePrefix == "") {
      return;
    } else {
      resizeRendererToDimensions(
        this.activeRenderer,
        this.properties.textureResolutionHigh,
        this.properties.textureResolutionHigh / getAspectRatio()
      );
      let zipFile = new JSZip();

      this.renderImages(filenamePrefix, zipFile);

      zipFile.generateAsync({ type: "blob" }).then(function (content) {
        saveAs(content, "renders.zip");
      });
    }
  };

  setupTests = () => {
    this.properties.testSuites.forEach((testSuite: TestSuite) => {
      testSuite.runTestSuite = () => this.runPredefinedTests(testSuite);
    });
  };

  runPredefinedTests = (testSuite: TestSuite) => {
    let filenameSuffix = prompt(
      `Provide a suffix for the filename if you want to run the ${testSuite.tests.length} tests in ${testSuite.name}`,
      `${this.modelName}`
    );
    if (filenameSuffix == null || filenameSuffix == "") return;

    const setTestScales = (scalePartial: Partial<Test>, strength: number) => {
      let scales = { ...scalePartial.localLightAlignment };
      for (let i = 0; i < 6; i++) {
        scales[`Sigma_${i}`] *= strength;
      }
      return scales;
    };

    if (!!testSuite.tests) {
      resizeRendererToDimensions(
        this.imageOutputRenderer,
        this.properties.textureResolutionHigh,
        this.properties.textureResolutionHigh / getAspectRatio()
      );
      let savedProperties = this.properties;
      let zipFile = new JSZip();
      let firstTest = true;
      for (let testProperties of testSuite.tests) {
        this.properties = testProperties;
        this.initializeRenderTargets();

        for (const scalePartial of savedProperties.sigmaVariations) {
          let testName = testProperties.testName + scalePartial.testName;
          let scales = setTestScales(
            scalePartial,
            testProperties.localLightAlignment.testStrength
          );

          this.properties = {
            ...this.properties,
            localLightAlignment: {
              ...this.properties.localLightAlignment,
              ...scales,
            },
          };

          this.onGuiChange();
          this.renderImages(
            `${testName}_${this.modelName}`,
            zipFile,
            firstTest ? true : false
          );
          firstTest = false;
        }
      }
      this.properties = savedProperties;
      zipFile.generateAsync({ type: "blob" }).then(function (content) {
        saveAs(content, `${testSuite.name}_${filenameSuffix}.zip`);
      });
    }
  };

  render = () => {
    this.renderGeometry();
    // stats.update();

    if (this.shouldRenderPostProcessing) {
      this.renderPostProcessing();
      this.shouldRenderPostProcessing = false;
    }
    requestAnimationFrame(this.render);
  };

  renderGeometry = () => {
    this.activeRenderer = this.realTimeRenderer;
    let post = this.postProcessingScene;
    resizeRendererToDisplaySize(this.activeRenderer);

    this.activeRenderer.setScissorTest(false);
    this.activeRenderer.setScissorTest(true);

    this.activeScene = this.geometryScene;
    this.renderToTarget(this.geometryPassTarget);

    this.activeScene = this.postProcessingScene;
    post.prepareSimpleLambertShadingPass(this.geometryPassTarget.texture);
    this.renderToHTMLElement(this.htmlElements.preShading, this.controls);

    post.prepareUnpackedNormalsPass(this.geometryPassTarget.texture);
    this.renderToHTMLElement(this.htmlElements.originalNormals);
  };

  renderPostProcessing = () => {
    this.activeRenderer = this.realTimeRenderer;
    let post = this.postProcessingScene;

    resizeRendererToDisplaySize(this.activeRenderer);
    this.activeRenderer.setScissorTest(false);
    this.activeRenderer.clear();
    this.activeRenderer.setScissorTest(true);

    this.activeScene = this.postProcessingScene;

    post.prepareDepthTexturePass(
      this.geometryPassTarget.depthTexture,
      this.geometryScene.camera.near,
      this.geometryScene.camera.far
    );
    this.renderToHTMLElement(this.htmlElements.depthTexture);

    let filteringInputNormals = [
      this.geometryPassTarget.texture,
      this.filterPassTargets[0].texture,
      this.filterPassTargets[1].texture,
      this.filterPassTargets[2].texture,
      this.filterPassTargets[3].texture,
    ];

    for (
      let i = 0;
      i < this.properties.localLightAlignment.numberOfScales;
      i++
    ) {
      let sigmaS =
        this.properties.bilateralFilter.SigmaS_individual[`SigmaS_${i}`];
      post.prepareBilateralFilteringPass(
        filteringInputNormals[i],
        sigmaS,
        this.geometryPassTarget.depthTexture
      );
      this.renderToTarget(this.filterPassTargets[i]);
      post.prepareUnpackedNormalsPass(this.filterPassTargets[i].texture);
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
  };

  renderImages(
    filenamePrefix: string,
    zipFile: JSZip,
    addPreshadingAndDepthToZip: boolean = true
  ) {
    const addToZip = (imageData: string, filename: string) => {
      zipFile.file(filename, imageData.substring(imageData.indexOf(",") + 1), {
        base64: true,
      });
    };

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

    this.activeScene = this.geometryScene;
    this.renderToTarget(highResGeometryPassTarget);

    this.activeScene = this.postProcessingScene;

    post.prepareSimpleLambertShadingPass(highResGeometryPassTarget.texture);
    this.imageOutputRenderer.render(post.scene, post.camera);

    if (addPreshadingAndDepthToZip) {
      addToZip(
        this.imageOutputRenderer.domElement.toDataURL(),
        `preShading.png`
      );
    }

    post.prepareDepthTexturePass(
      highResGeometryPassTarget.depthTexture,
      this.geometryScene.camera.near,
      this.geometryScene.camera.far
    );
    this.imageOutputRenderer.render(post.scene, post.camera);

    if (addPreshadingAndDepthToZip) {
      addToZip(this.imageOutputRenderer.domElement.toDataURL(), `depth.png`);
    }

    let filteringInputNormals = [
      highResGeometryPassTarget.texture,
      highResFilterPassTargets[0].texture,
      highResFilterPassTargets[1].texture,
      highResFilterPassTargets[2].texture,
      highResFilterPassTargets[3].texture,
    ];

    for (
      let i = 0;
      i < this.properties.localLightAlignment.numberOfScales;
      i++
    ) {
      let sigmaS =
        this.properties.bilateralFilter.SigmaS_individual[`SigmaS_${i}`];
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

    addToZip(
      this.imageOutputRenderer.domElement.toDataURL(),
      `${filenamePrefix}_postShading.png`
    );

    this.imageOutputRenderer.clear();
    highResFilterPassTargets.forEach((target) => target.dispose());
    highResGeometryPassTarget.dispose();
    highResLocalLightAlignmentTarget.dispose();
  }

  initializeRenderTargets() {
    if (this.geometryPassTarget) this.geometryPassTarget.dispose();
    this.geometryPassTarget = this.getNewRenderTarget(
      this.properties.textureResolution,
      true
    );
    if (this.localLightAlignmentTarget)
      this.localLightAlignmentTarget.dispose();
    this.localLightAlignmentTarget = this.getNewRenderTarget(
      this.properties.textureResolution
    );
    this.filterPassTargets = [];
    for (
      let i = 0;
      i < this.properties.localLightAlignment.numberOfScales;
      i++
    ) {
      if (this.filterPassTargets[i]) this.filterPassTargets[i].dispose();
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
    let textureOptions = {
      minFilter: THREE.NearestFilter,
      magFilter: THREE.NearestFilter,
    };

    let target = new THREE.WebGLRenderTarget(
      textureResolution,
      textureResolution / aspectRatio,
      textureOptions
    );

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

    return `LLA_${this.properties.textureResolutionHigh}_Gamma[${this.properties.localLightAlignment.Gamma}]_Sigma_[${sigmastring}]_Epsilon_[${this.properties.localLightAlignment.Epsilon}]_${this.modelName}`;
  };

  setupHTLMElements() {
    let leftPane = document.getElementById("leftPane");
    let rightPane = document.getElementById("rightPane");
    this.htmlElements = {
      preShading: this.getHTMLFrameElement(
        "Lambertian shading pre LLA",
        rightPane
      ),
      postShading: this.getHTMLFrameElement(
        "Lambertian shading post LLA",
        rightPane
      ),
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
      this.properties.bilateralFilter.SigmaS_individual.SigmaS_0;
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
    this.shouldRenderPostProcessing = true;
  };

  onWindowResize = (): void => {
    const width = this.realTimeRenderer.domElement.clientWidth;
    const height = this.realTimeRenderer.domElement.clientHeight;
    this.realTimeRenderer.setSize(width, height);
    this.geometryScene.camera.aspect = getAspectRatio();
    this.geometryScene.camera.updateProjectionMatrix();
    this.shouldRenderPostProcessing = true;
  };

  renderToTarget(target: THREE.WebGLRenderTarget) {
    let { scene, camera } = this.activeScene;
    this.activeRenderer.setRenderTarget(target);
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

function setupGUI(properties: Properties, onGuiChange: Function) {
  let gui = new GUI();
  gui.add(properties, "downloadPrompt").name("Save high-res renders");

  if (!!properties.testSuites)
    properties.testSuites.forEach((suite) => {
      gui.add(suite, "runTestSuite").name(`Run testsuite: ${suite.name}`);
    });

  const lightFolder = gui.addFolder("Light position");
  lightFolder.add(properties.lightPosition, "x", -1, 1).onChange(onGuiChange);
  lightFolder.add(properties.lightPosition, "y", -1, 1).onChange(onGuiChange);
  lightFolder.add(properties.lightPosition, "z", -1, 1).onChange(onGuiChange);
  const filterFolder = gui.addFolder("Bilateral Filter");

  for (let i = 0; i < properties.localLightAlignment.numberOfScales; i++) {
    filterFolder
      .add(properties.bilateralFilter.SigmaS_individual, `SigmaS_${i}`, 1, 128)
      .onChange(onGuiChange)
      .listen();
  }

  filterFolder
    .add(properties.bilateralFilter, "SigmaR", 0, 0.5)
    .onChange(onGuiChange);

  filterFolder.open();
  const llaFolder = gui.addFolder("Local Light Alignment");

  for (let i = 0; i < properties.localLightAlignment.numberOfScales; i++) {
    llaFolder
      .add(properties.localLightAlignment, `Sigma_${i}`, 0, 1)
      .onChange(onGuiChange)
      .listen();
  }
  llaFolder
    .add(properties.localLightAlignment, "Sigma_all", 0, 1)
    .onChange((newVal: number) => {
      properties.localLightAlignment.Sigma_0 = newVal;
      properties.localLightAlignment.Sigma_1 = newVal;
      properties.localLightAlignment.Sigma_2 = newVal;
      properties.localLightAlignment.Sigma_3 = newVal;
      onGuiChange();
    });

  llaFolder
    .add(properties.localLightAlignment, "Epsilon", 1e-10, 1e-4)
    .onChange(onGuiChange);
  llaFolder
    .add(properties.localLightAlignment, "Gamma", 0.5, 6)
    .onChange(onGuiChange);
  return gui;
}

// const stats = Stats();
// document.body.appendChild(stats.dom);

let properties: Properties = {
  ...defaultProperties,
  testSuites: [scaleSpaceTests, enhancementStrengthTests],
  sigmaVariations: scaleSeparations,
};

console.log(`Number of tests ${scaleSpaceTests.tests.length}`);
console.log(`Number of variations ${scaleSeparations.length}`);
let app = new LocalLightAlignmentApp("./smallAssets/david.obj", properties);
let gui = setupGUI(properties, app.onGuiChange);
