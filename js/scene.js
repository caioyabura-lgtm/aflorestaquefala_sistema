import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";

const TOKENS = ["HEITOR", "GASTON", "SOL", "RIO", "BORBOLETA", "FOLHAS", "NUVENS", "TITULO"];
const normalize = value => value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toUpperCase();

// Registro sem áudio: cada entrada já pode receber futuramente um THREE.PositionalAudio.
export class SoundMap {
  constructor() {
    this.points = new Map(["rio", "vento", "folhas", "pássaros", "Gaston", "Heitor", "silêncio"].map(name => [name, { name, object: null, audio: null }]));
  }
  bind(name, object) { if (this.points.has(name)) this.points.get(name).object = object; }
  get(name) { return this.points.get(name); }
}

export class ForestScene {
  constructor(scene, manager) {
    this.scene = scene;
    this.loader = new GLTFLoader(manager);
    this.references = {};
    this.mixers = [];
    this.fallbackAnimations = [];
    this.atmosphere = null;
    this.soundMap = new SoundMap();
  }

  async load(url) {
    const gltf = await this.loader.loadAsync(url);
    this.root = gltf.scene;
    this.root.name ||= "FLORESTA_ROOT";
    this.scene.add(this.root);

    // Sombras, frustum culling e índice semântico da hierarquia.
    this.root.traverse(object => {
      if (object.isMesh) {
        object.castShadow = true;
        object.receiveShadow = true;
        object.frustumCulled = true;
      }
      const name = normalize(object.name || "");
      TOKENS.forEach(token => {
        if (!this.references[token] && name.includes(token)) this.references[token] = object;
      });
    });

    this.soundMap.bind("rio", this.references.RIO);
    this.soundMap.bind("folhas", this.references.FOLHAS);
    this.soundMap.bind("Gaston", this.references.GASTON);
    this.soundMap.bind("Heitor", this.references.HEITOR);

    if (gltf.animations?.length) {
      const mixer = new THREE.AnimationMixer(this.root);
      gltf.animations.forEach(clip => mixer.clipAction(clip).play());
      this.mixers.push(mixer);
    } else {
      this.createFallbackAnimations();
    }
    return gltf;
  }

  // Converte o GLB atual (desenhado no plano X/Z) para o plano frontal X/Y.
  // Esta normalização só deve ser usada quando o arquivo não possuir câmera Blender.
  alignForZCamera(rotationX = -Math.PI / 2, rotationY = 0) {
    if (!this.root) return null;

    this.root.rotation.set(rotationX, rotationY, 0);
    this.root.updateWorldMatrix(true, true);

    const initialBox = new THREE.Box3().setFromObject(this.root);
    const initialCenter = initialBox.getCenter(new THREE.Vector3());

    // A raiz está diretamente sob a Scene, portanto a translação pode usar o centro global.
    this.root.position.sub(initialCenter);
    this.root.updateWorldMatrix(true, true);

    const box = new THREE.Box3().setFromObject(this.root);
    const center = box.getCenter(new THREE.Vector3());
    const size = box.getSize(new THREE.Vector3());

    console.groupCollapsed("[A Floresta que Fala] Normalização do modelo");
    console.info("Rotação aplicada:", [rotationX, rotationY, 0]);
    console.info("Centro após normalização:", center.toArray());
    console.info("Tamanho após normalização:", size.toArray());
    console.groupEnd();

    return { box, center, size };
  }

  createFallbackAnimations() {
    const add = (object, update) => {
      if (!object) return;
      const base = { position: object.position.clone(), rotation: object.rotation.clone(), scale: object.scale.clone() };
      this.fallbackAnimations.push(time => update(object, base, time));
    };
    add(this.references.SOL, (o, b, t) => o.scale.copy(b.scale).multiplyScalar(1 + Math.sin(t * 0.7) * 0.012));
    add(this.references.BORBOLETA, (o, b, t) => {
      o.position.set(b.position.x + Math.sin(t * 0.55) * 0.12, b.position.y + Math.sin(t * 1.1) * 0.06, b.position.z);
      o.rotation.z = b.rotation.z + Math.sin(t * 1.6) * 0.08;
    });
    add(this.references.FOLHAS, (o, b, t) => { o.rotation.z = b.rotation.z + Math.sin(t * 0.8) * 0.006; });
    add(this.references.RIO, (o, b, t) => { o.position.x = b.position.x + Math.sin(t * 0.35) * 0.008; });
  }

  createAtmosphere() {
    if (!this.root || this.atmosphere) return;

    const box = new THREE.Box3().setFromObject(this.root);
    const center = box.getCenter(new THREE.Vector3());
    const size = box.getSize(new THREE.Vector3());
    const count = matchMedia("(max-width: 700px)").matches ? 42 : 88;
    const positions = new Float32Array(count * 3);
    const seeds = new Float32Array(count);

    for (let i = 0; i < count; i += 1) {
      const i3 = i * 3;
      positions[i3] = center.x + (Math.random() - 0.5) * size.x * 0.92;
      positions[i3 + 1] = center.y + (Math.random() - 0.5) * size.y * 0.78;
      positions[i3 + 2] = box.max.z + size.z * (0.08 + Math.random() * 0.28);
      seeds[i] = Math.random() * Math.PI * 2;
    }

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute("aSeed", new THREE.BufferAttribute(seeds, 1));
    const material = new THREE.ShaderMaterial({
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      uniforms: {
        uTime: { value: 0 },
        uPixelRatio: { value: Math.min(devicePixelRatio, 2) }
      },
      vertexShader: `
        attribute float aSeed;
        uniform float uTime;
        uniform float uPixelRatio;
        varying float vAlpha;
        void main() {
          vec3 p = position;
          p.x += sin(uTime * .22 + aSeed) * .035;
          p.y += cos(uTime * .18 + aSeed * 1.7) * .025;
          vec4 mv = modelViewMatrix * vec4(p, 1.0);
          gl_Position = projectionMatrix * mv;
          gl_PointSize = (2.2 + sin(aSeed * 4.0) * .7) * uPixelRatio;
          vAlpha = .18 + .22 * (sin(uTime * .65 + aSeed * 3.0) * .5 + .5);
        }
      `,
      fragmentShader: `
        varying float vAlpha;
        void main() {
          float d = distance(gl_PointCoord, vec2(.5));
          float glow = 1.0 - smoothstep(.05, .5, d);
          gl_FragColor = vec4(1.0, .78, .34, glow * vAlpha);
        }
      `
    });

    this.atmosphere = new THREE.Points(geometry, material);
    this.atmosphere.name = "LUZES_DA_FLORESTA";
    this.atmosphere.frustumCulled = false;
    this.scene.add(this.atmosphere);
  }

  update(delta, elapsed) {
    this.mixers.forEach(mixer => mixer.update(delta));
    this.fallbackAnimations.forEach(update => update(elapsed));
    if (this.atmosphere) this.atmosphere.material.uniforms.uTime.value = elapsed;
    return this.mixers.length > 0 || this.fallbackAnimations.length > 0 || Boolean(this.atmosphere);
  }
}
