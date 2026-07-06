import * as THREE from "three";

// Mantém as luzes exportadas. O conjunto abaixo só é criado se o GLB não possuir nenhuma.
export function ensureLighting(scene, modelRoot) {
  let exportedLights = 0;
  modelRoot.traverse(object => { if (object.isLight) exportedLights += 1; });
  if (exportedLights) return { usedFallback: false, count: exportedLights };

  const rig = new THREE.Group();
  rig.name = "FALLBACK_LIGHT_RIG";

  const ambient = new THREE.HemisphereLight(0xffe8b7, 0x173528, 1.35);
  ambient.name = "LUZ_AMBIENTE_FLORESTA";
  const sun = new THREE.DirectionalLight(0xffd38a, 2.4);
  sun.name = "SOL_FALLBACK";
  sun.position.set(4, 7, 6);
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);

  const rim = new THREE.DirectionalLight(0x78b99b, 1.25);
  rim.name = "RIM_LIGHT";
  rim.position.set(-5, 3, -4);

  const back = new THREE.DirectionalLight(0xe18b43, 0.85);
  back.name = "BACK_LIGHT";
  back.position.set(0, 5, -7);

  rig.add(ambient, sun, rim, back);
  scene.add(rig);
  return { usedFallback: true, count: 4 };
}
