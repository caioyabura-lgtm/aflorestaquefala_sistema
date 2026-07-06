import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";

const CAMERA_FOV = 35;
const CAMERA_NEAR = 0.1;
const CAMERA_FAR = 100;
const INITIAL_POSITION = new THREE.Vector3(0, 0, 20);
const COVER_SCALE = 0.78;
const OPENING_DURATION = 6;
const OPENING_TURN = Math.PI;
const OPENING_ORBIT_DIRECTION = 1;
const ZOOM_NEAR_FACTOR = 0.04;
const ZOOM_FAR_FACTOR = 1.30;
const ZOOM_IN_SCROLL_BOOST = 0.0009;
const FRAME_GUIDE_NAMES = new Set([
  "ENQUADRAMENTO",
  "GUIA_CAPA",
  "CAPA_FRAME",
  "CAMERA_FRAME",
  "FRAME_CAMERA"
]);

export const CAMERA_ART_OFFSET = Object.freeze({ x: 0.15, y: -0.10, z: 0.80 });

const state = {
  controls: null,
  center: new THREE.Vector3(),
  modelSize: new THREE.Vector3(),
  fittedPosition: new THREE.Vector3(),
  basePosition: INITIAL_POSITION.clone(),
  openingElapsed: 0,
  openingComplete: true
};

const normalizeName = value => value
  .normalize("NFD")
  .replace(/[\u0300-\u036f]/g, "")
  .toUpperCase();

function findFramingGuide(model) {
  let guide = null;
  model.traverse(object => {
    if (!guide && FRAME_GUIDE_NAMES.has(normalizeName(object.name || ""))) {
      guide = object;
    }
  });
  return guide;
}

function calculateCoverDistance(camera, size) {
  const verticalFov = THREE.MathUtils.degToRad(camera.fov);
  const horizontalFov = 2 * Math.atan(
    Math.tan(verticalFov / 2) * camera.aspect
  );
  const distanceX = size.x / (2 * Math.tan(horizontalFov / 2));
  const distanceY = size.y / (2 * Math.tan(verticalFov / 2));
  const visibleDistances = [distanceX, distanceY].filter(
    value => Number.isFinite(value) && value > 0
  );
  if (!visibleDistances.length) return INITIAL_POSITION.z;
  const coverDistance = Math.min(...visibleDistances);

  // A metade da profundidade mantém a face frontal à frente da câmera.
  return Math.max(coverDistance * COVER_SCALE + size.z * 0.5, 0.1);
}

function applyFitDistance(camera, distance) {
  state.fittedPosition.set(
    CAMERA_ART_OFFSET.x,
    CAMERA_ART_OFFSET.y,
    distance + CAMERA_ART_OFFSET.z
  );
  camera.near = 0.01;
  camera.far = Math.max(
    distance * 20,
    state.modelSize.length() * 4,
    INITIAL_POSITION.z * 2
  );
  if (state.controls) {
    const fittedDistance = distance + CAMERA_ART_OFFSET.z;
    state.controls.minDistance = Math.max(fittedDistance * ZOOM_NEAR_FACTOR, 0.03);
    state.controls.maxDistance = fittedDistance * ZOOM_FAR_FACTOR;
  }
  camera.updateProjectionMatrix();
}

export function createCamera(canvas, debug = false) {
  const camera = new THREE.PerspectiveCamera(
    CAMERA_FOV,
    window.innerWidth / window.innerHeight,
    CAMERA_NEAR,
    CAMERA_FAR
  );

  camera.name = "CAMERA_THREE_JS";
  camera.position.copy(INITIAL_POSITION);
  camera.lookAt(0, 0, 0);

  const interactionSurface =
    document.querySelector("#horizontal-rail") || canvas;
  state.controls = new OrbitControls(camera, interactionSurface);
  state.controls.enabled = false;
  state.controls.enableDamping = true;
  state.controls.dampingFactor = debug ? 0.12 : 0.08;
  state.controls.enablePan = false;
  state.controls.enableZoom = true;
  state.controls.zoomSpeed = 0.55;
  state.controls.enableRotate = false;
  interactionSurface.style.cursor = "default";

  // OrbitControls usa a mesma intensidade nos dois sentidos. Este segundo
  // passo torna somente o avanço da roda mais profundo, preservando o recuo.
  interactionSurface.addEventListener("wheel", event => {
    if (!state.controls.enabled || event.deltaY >= 0) return;

    const deltaScale = event.deltaMode === 1
      ? 16
      : event.deltaMode === 2 ? window.innerHeight : 1;
    const wheelDistance = Math.min(Math.abs(event.deltaY) * deltaScale, 160);
    const offset = camera.position.clone().sub(state.controls.target);
    const distance = offset.length();
    const boostedDistance = Math.max(
      state.controls.minDistance,
      distance * Math.exp(-wheelDistance * ZOOM_IN_SCROLL_BOOST)
    );

    offset.setLength(boostedDistance);
    camera.position.copy(state.controls.target).add(offset);
    state.controls.update();
  }, { passive: true });

  return camera;
}

export function fitCamera(camera, model) {
  const guide = findFramingGuide(model);
  const guideBox = guide
    ? new THREE.Box3().setFromObject(guide)
    : new THREE.Box3();
  const usesGuide = Boolean(guide && !guideBox.isEmpty());
  const box = usesGuide ? guideBox : new THREE.Box3().setFromObject(model);
  const center = box.getCenter(new THREE.Vector3());
  const size = box.getSize(new THREE.Vector3());
  const distance = calculateCoverDistance(camera, size);

  if (usesGuide) {
    guide.visible = false;
    console.info(`[A Floresta que Fala] Enquadramento guiado por "${guide.name}".`);
  } else {
    console.info("[A Floresta que Fala] Enquadramento guiado pelo conteúdo completo.");
  }

  state.center.copy(center);
  state.modelSize.copy(size);
  applyFitDistance(camera, distance);
  state.basePosition.copy(INITIAL_POSITION);
  state.openingElapsed = 0;
  state.openingComplete = false;
  state.controls.enabled = false;

  camera.position.set(0, 0, -INITIAL_POSITION.z);
  camera.lookAt(center);
  camera.updateMatrixWorld(true);

  if (state.controls) {
    state.controls.target.copy(center);
    state.controls.update();
  }

  return {
    box,
    center,
    size,
    distance,
    framingSource: usesGuide ? guide.name : "bounding-box"
  };
}

export function animateOpening(camera, delta) {
  if (state.openingComplete) return false;

  state.openingElapsed = Math.min(state.openingElapsed + delta, OPENING_DURATION);
  const progress = state.openingElapsed / OPENING_DURATION;
  const eased = 1 - Math.pow(1 - progress, 3);
  const angle = OPENING_TURN * (1 - eased);
  const radius = THREE.MathUtils.lerp(
    INITIAL_POSITION.z,
    state.fittedPosition.z,
    eased
  );

  state.basePosition.set(
    Math.sin(angle) * radius * OPENING_ORBIT_DIRECTION +
      CAMERA_ART_OFFSET.x * eased,
    CAMERA_ART_OFFSET.y * eased,
    Math.cos(angle) * radius
  );
  camera.position.copy(state.basePosition);
  camera.lookAt(state.center);
  if (progress >= 1) {
    state.openingComplete = true;
    state.controls.enabled = true;
    state.controls.target.copy(state.center);
    state.controls.update();
  }

  return !state.openingComplete;
}

export function updateCamera(camera, delta) {
  if (!state.openingComplete) return true;
  return state.controls?.update() || false;
}

export function resizeCamera(camera) {
  camera.aspect = window.innerWidth / window.innerHeight;

  if (state.modelSize.lengthSq() > 0) {
    const distance = calculateCoverDistance(camera, state.modelSize);
    applyFitDistance(camera, distance);

    if (state.openingComplete) {
      const direction = camera.position.clone().sub(state.center).normalize();
      const radius = state.fittedPosition.distanceTo(state.center);
      camera.position.copy(state.center).addScaledVector(direction, radius);
      state.basePosition.copy(camera.position);
      camera.lookAt(state.center);
      state.controls?.update();
    }
  }

  camera.updateProjectionMatrix();
}
