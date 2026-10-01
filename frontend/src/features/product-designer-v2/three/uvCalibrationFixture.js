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

export function createGarmentCalibrationDefinition(panelId = "front") {
  const sleeve = panelId.includes("sleeve");
  const labels = sleeve
    ? [{ text: "SHOULDER", x: 0.5, y: 0.12 }, { text: "CENTER", x: 0.5, y: 0.5 }, { text: "HEM", x: 0.5, y: 0.9 }]
    : [{ text: "CENTER", x: 0.5, y: 0.5 }, { text: "TOP-CENTER", x: 0.5, y: 0.2 }, { text: "BOTTOM-CENTER", x: 0.5, y: 0.88 }, { text: "LEFT-CHEST", x: 0.36, y: 0.35 }, { text: "RIGHT-CHEST", x: 0.64, y: 0.35 }, { text: "LEFT-SIDE", x: 0.18, y: 0.56 }, { text: "RIGHT-SIDE", x: 0.82, y: 0.56 }];
  return Object.freeze({ labels: Object.freeze(labels.map((label) => Object.freeze(label))) });
}

export function renderGarmentCalibrationCanvas(printSurface, documentApi = globalThis.document) {
  const canvas = documentApi.createElement("canvas");
  canvas.width = printSurface.previewTextureResolution.width;
  canvas.height = printSurface.previewTextureResolution.height;
  const context = canvas.getContext("2d");
  if (!context) throw new Error("Canvas 2D no disponible para calibración garment.");
  context.clearRect(0, 0, canvas.width, canvas.height);
  context.textAlign = "center";
  context.textBaseline = "middle";
  context.font = `bold ${Math.max(12, Math.round(canvas.width / 45))}px sans-serif`;
  createGarmentCalibrationDefinition(printSurface.id).labels.forEach((label) => {
    context.fillStyle = "#111827";
    context.fillText(label.text, label.x * canvas.width, label.y * canvas.height);
  });
  return canvas;
}
