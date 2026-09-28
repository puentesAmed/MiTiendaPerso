function assertViewport(viewport) {
  if (!viewport || viewport.width <= 0 || viewport.height <= 0) throw new Error("Print area viewport inválido.");
}

export function fabricTransformToDomain(transform, printAreaViewport) {
  assertViewport(printAreaViewport);
  const width = transform.width * transform.scaleX;
  const height = transform.height * transform.scaleY;
  return {
    x: (transform.centerX - width / 2 - printAreaViewport.x) / printAreaViewport.width,
    y: (transform.centerY - height / 2 - printAreaViewport.y) / printAreaViewport.height,
    width: width / printAreaViewport.width,
    height: height / printAreaViewport.height,
    scale: { x: 1, y: 1 },
    rotation: transform.rotation,
  };
}

export function domainElementToFabricRect(element, printAreaViewport) {
  assertViewport(printAreaViewport);
  const width = element.width * printAreaViewport.width;
  const height = element.height * printAreaViewport.height;
  return {
    centerX: printAreaViewport.x + element.x * printAreaViewport.width + width / 2,
    centerY: printAreaViewport.y + element.y * printAreaViewport.height + height / 2,
    width,
    height,
    rotation: element.rotation,
  };
}
