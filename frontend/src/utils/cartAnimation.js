export function prefersReducedMotion() {
  return typeof window !== "undefined"
    && typeof window.matchMedia === "function"
    && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

export function animateAddToCart({ sourceElement, imageUrl } = {}) {
  if (typeof document === "undefined" || typeof window === "undefined") return;
  const target = document.querySelector("[data-cart-target]");
  if (!target || !sourceElement || prefersReducedMotion()) return;

  const source = sourceElement.getBoundingClientRect();
  const destination = target.getBoundingClientRect();
  const image = document.createElement("img");
  image.src = imageUrl || "";
  image.alt = "";
  image.setAttribute("aria-hidden", "true");
  Object.assign(image.style, {
    position: "fixed",
    zIndex: "100",
    pointerEvents: "none",
    objectFit: "cover",
    borderRadius: "10px",
    left: `${source.left + source.width / 2 - 28}px`,
    top: `${source.top + source.height / 2 - 28}px`,
    width: "56px",
    height: "56px",
  });
  document.body.appendChild(image);
  const animation = image.animate([
    { transform: "translate(0, 0) scale(1)", opacity: 0.95 },
    {
      transform: `translate(${destination.left - source.left}px, ${destination.top - source.top}px) scale(.25)`,
      opacity: 0.25,
    },
  ], { duration: 520, easing: "cubic-bezier(.2,.8,.2,1)" });
  animation.finished.finally(() => image.remove());
}
