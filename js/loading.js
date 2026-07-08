import * as THREE from "three";

export function createLoadingController() {
  const screen = document.querySelector("#loading-screen");
  const bar = document.querySelector("#progress-bar");
  const label = document.querySelector("#progress-label");
  const button = document.querySelector("#enter-button");
  const manager = new THREE.LoadingManager();

  button.addEventListener("click", event => {
    if (button.getAttribute("aria-disabled") !== "true") return;
    event.preventDefault();
  });

  manager.onProgress = (_url, loaded, total) => {
    const progress = total ? Math.round((loaded / total) * 100) : 0;
    bar.style.width = `${progress}%`;
    label.textContent = `${progress}%`;
  };

  manager.onError = url => console.error("Falha ao carregar recurso:", url);

  async function finish() {
    bar.style.width = "100%";
    label.textContent = "100%";
    // Pequeno tempo de assentamento para a animacao do Blender comecar.
    await new Promise(resolve => setTimeout(resolve, 1400));
    screen.classList.add("done");
  }

  function releaseEntrance() {
    button.classList.add("ready");
    button.removeAttribute("aria-disabled");
    button.removeAttribute("tabindex");
    button.textContent = "Entrar";
  }

  return { manager, finish, releaseEntrance };
}
