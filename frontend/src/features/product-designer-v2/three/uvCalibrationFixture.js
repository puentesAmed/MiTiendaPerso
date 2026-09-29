export function createUvCalibrationDefinition(gridDivisions = 8) {
  const grid = Array.from({ length: gridDivisions + 1 }, (_, index) => index / gridDivisions);
  return {
    verticalLines: grid.map((x) => ({ x, emphasis: x === 0 || x === 0.5 || x === 1 })),
    horizontalLines: grid.map((y) => ({ y })),
    labels: [
      { text: "LEFT", x: 0, y: 0.5 },
      { text: "FRONT", x: 0.5, y: 0.5 },
      { text: "RIGHT", x: 1, y: 0.5 },
      { text: "TOP", x: 0.5, y: 0 },
      { text: "BOTTOM", x: 0.5, y: 1 },
    ],
  };
}

export function renderUvCalibrationCanvas(printSurface, documentApi = globalThis.document) {
  const canvas = documentApi.createElement("canvas");
  canvas.width = printSurface.previewTextureResolution.width;
  canvas.height = printSurface.previewTextureResolution.height;
  const context = canvas.getContext("2d");
  if (!context) throw new Error("Canvas 2D no disponible para calibración UV.");
  const definition = createUvCalibrationDefinition();
  context.fillStyle = "#ffffff";
  context.fillRect(0, 0, canvas.width, canvas.height);
  definition.verticalLines.forEach((line) => {
    context.strokeStyle = line.emphasis ? "#ef4444" : "#cbd5e1";
    context.beginPath();
    context.moveTo(line.x * canvas.width, 0);
    context.lineTo(line.x * canvas.width, canvas.height);
    context.stroke();
  });
  definition.horizontalLines.forEach((line) => {
    context.strokeStyle = "#cbd5e1";
    context.beginPath();
    context.moveTo(0, line.y * canvas.height);
    context.lineTo(canvas.width, line.y * canvas.height);
    context.stroke();
  });
  context.fillStyle = "#111827";
  context.textAlign = "center";
  context.textBaseline = "middle";
  definition.labels.forEach((label) => context.fillText(label.text, label.x * canvas.width, label.y * canvas.height));
  return canvas;
}
