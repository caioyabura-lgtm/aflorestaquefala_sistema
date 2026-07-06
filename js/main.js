import * as THREE from "three";
import { EffectComposer } from "three/addons/postprocessing/EffectComposer.js";
import { RenderPass } from "three/addons/postprocessing/RenderPass.js";
import { OutputPass } from "three/addons/postprocessing/OutputPass.js";
import { ForestScene } from "./scene.js";
import { animateOpening, createCamera, fitCamera, resizeCamera, updateCamera } from "./camera.js";
import { ensureLighting } from "./lighting.js";
import { setupHorizontalNavigation } from "./interaction.js";
import { createLoadingController } from "./loading.js";

export const DEBUG = false;
const MODEL_ROTATION_X = Math.PI / 2;
const MODEL_ROTATION_Y = 0;
const canvas = document.querySelector("#forest-canvas");
const scene = new THREE.Scene();
scene.background = new THREE.Color(0xc8b88d);
scene.fog = new THREE.FogExp2(0xc8b88d, 0.0018);

const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: false, powerPreference: "high-performance" });
const renderPixelRatio = () => Math.min(window.devicePixelRatio, innerWidth < 700 ? 1.5 : 2);
renderer.setPixelRatio(renderPixelRatio());
renderer.setSize(innerWidth, innerHeight);
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap ?? THREE.PCFShadowMap;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.15;

const camera = createCamera(canvas, DEBUG);
let composer;
const loading = createLoadingController();
const forest = new ForestScene(scene, loading.manager);
const clock = new THREE.Clock();
const fps = document.querySelector("#fps");
let frameCount = 0, fpsTime = performance.now();
let cameraHelper = null;

function configureComposer() {
  composer = new EffectComposer(renderer);
  composer.addPass(new RenderPass(scene, camera));
  // Pontos de extensão: UnrealBloomPass, ShaderPass de Vignette/Color Correction e FXAA.
  // O OutputPass deve permanecer por último para tone mapping e conversão de cor.
  composer.addPass(new OutputPass());
}

function installDebugHelpers() {
  if (!DEBUG) return;
  cameraHelper = new THREE.CameraHelper(camera);
  scene.add(new THREE.GridHelper(10, 10), new THREE.AxesHelper(2), cameraHelper);
  fps.hidden = false;
}

async function init() {
  try {
    const gltf = await forest.load("animacao.glb");
    // O GLB atual não possui câmera e foi exportado no plano X/Z.
    // Só o normalizamos quando o Blender não fornece a direção de arte da câmera.
    forest.alignForZCamera(MODEL_ROTATION_X, MODEL_ROTATION_Y);
    forest.createAtmosphere();
    ensureLighting(scene, forest.root);
    scene.add(camera);
    fitCamera(camera, forest.root);
    configureComposer();
    installDebugHelpers();
    await loading.finish();
  } catch (error) {
    console.error("Não foi possível iniciar a floresta 3D.", error);
    // Mantém o site utilizável mesmo se WebGL ou o modelo falharem.
    ensureLighting(scene, new THREE.Group());
    scene.add(camera);
    configureComposer();
    await loading.finish();
  }
  invalidate();
}

let animationFrame = 0;
function invalidate() {
  if (!animationFrame && !document.hidden) animationFrame = requestAnimationFrame(render);
}

function render(time) {
  animationFrame = 0;
  const delta = Math.min(clock.getDelta(), 0.05);
  const animated = forest.update(delta, clock.elapsedTime);
  const opening = animateOpening(camera, delta);
  const moving = updateCamera(camera, delta);
  cameraHelper?.update();
  composer?.render();

  if (DEBUG) {
    frameCount += 1;
    if (time - fpsTime > 500) {
      fps.textContent = `${Math.round(frameCount * 1000 / (time - fpsTime))} FPS`;
      frameCount = 0; fpsTime = time;
    }
  }
  // Só mantém o loop vivo quando há animação, damping ou DEBUG.
  if (animated || opening || moving || DEBUG) invalidate();
}

addEventListener("resize", () => {
  resizeCamera(camera);
  renderer.setPixelRatio(renderPixelRatio());
  renderer.setSize(innerWidth, innerHeight);
  composer?.setSize(innerWidth, innerHeight);
  invalidate();
});
document.addEventListener("visibilitychange", () => { clock.getDelta(); if (!document.hidden) invalidate(); });
addEventListener("pointermove", invalidate, { passive: true });
addEventListener("pointerleave", invalidate, { passive: true });
setupHorizontalNavigation();
init();
