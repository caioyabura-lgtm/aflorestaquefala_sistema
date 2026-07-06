export function setupHorizontalNavigation() {
  const rail = document.querySelector("#horizontal-rail");
  const dots = [...document.querySelectorAll(".dot")];

  const update = () => {
    const index = Math.round(rail.scrollLeft / innerWidth);
    dots.forEach((dot, i) => dot.classList.toggle("active", i === index));
  };

  dots.forEach(dot => dot.addEventListener("click", () => {
    rail.scrollTo({
      left: Number(dot.dataset.page) * innerWidth,
      behavior: "smooth"
    });
  }));

  rail.addEventListener("scroll", update, { passive: true });
  addEventListener("keydown", event => {
    if (event.key === "ArrowRight") {
      rail.scrollBy({ left: innerWidth, behavior: "smooth" });
    }
    if (event.key === "ArrowLeft") {
      rail.scrollBy({ left: -innerWidth, behavior: "smooth" });
    }
  });

  return { rail, update };
}
