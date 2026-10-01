function tracePolygon(context, points, width, height) {
  points.forEach(([x, y], index) => {
    const method = index ? "lineTo" : "moveTo";
    context[method](x * width, y * height);
  });
  context.closePath();
}

export function applyEditableMask(canvas, editableMask) {
  if (!editableMask) return canvas;
  const context = canvas.getContext("2d");
  if (!context) throw new Error("Canvas 2D no disponible para aplicar editableMask.");
  context.save();
  context.globalCompositeOperation = "destination-in";
  context.beginPath();
  editableMask.include.forEach((shape) => tracePolygon(context, shape.polygon, canvas.width, canvas.height));
  context.fill();
  if (editableMask.exclude.length) {
    context.globalCompositeOperation = "destination-out";
    context.beginPath();
    editableMask.exclude.forEach((shape) => tracePolygon(context, shape.polygon, canvas.width, canvas.height));
    context.fill();
  }
  context.restore();
  return canvas;
}

export function canvasToPngBlob(canvas) {
  return new Promise((resolve, reject) => canvas.toBlob((blob) => blob ? resolve(blob) : reject(new Error("No se pudo exportar el artwork.")), "image/png"));
}
