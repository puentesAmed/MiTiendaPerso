import { ActiveSelection, Canvas, FabricImage, Rect, Textbox } from "fabric";
import { domainElementToFabricRect, fabricTransformToDomain } from "../domain/transforms.js";

const commonObjectOptions = {
  originX: "center",
  originY: "center",
  borderColor: "#6d5dfc",
  cornerColor: "#6d5dfc",
  cornerStrokeColor: "#ffffff",
  transparentCorners: false,
  cornerSize: 14,
  touchCornerSize: 28,
  padding: 4,
  lockScalingFlip: true,
};

function getView(template, viewId) {
  return template.views.find((view) => view.id === viewId) || template.views[0];
}

function getPrintAreaViewport(view, printAreaId, size) {
  const area = view.printAreas.find((candidate) => candidate.id === printAreaId);
  if (!area) return null;
  return {
    area,
    x: area.x * size.width,
    y: area.y * size.height,
    width: area.width * size.width,
    height: area.height * size.height,
  };
}

function createClipPath(viewport) {
  if (!viewport.area.clip.enabled) return undefined;
  return new Rect({
    left: viewport.x,
    top: viewport.y,
    width: viewport.width,
    height: viewport.height,
    originX: "left",
    originY: "top",
    absolutePositioned: true,
    fill: "#000000",
    selectable: false,
    evented: false,
  });
}

export class FabricAdapter {
  constructor(canvasElement, callbacks = {}) {
    this.canvas = new Canvas(canvasElement, {
      preserveObjectStacking: true,
      selection: true,
      fireRightClick: false,
    });
    this.callbacks = callbacks;
    this.objects = new Map();
    this.size = { width: 1, height: 1 };
    this.view = null;
    this.document = null;
    this.assetRegistry = null;
    this.reconciling = false;
    this.reconcileVersion = 0;
    this.textTimer = null;
    this.panEnabled = false;
    this.panning = null;
    this.viewport = { zoom: 1, pan: { x: 0, y: 0 } };
    this.selectionSignature = "";

    this.handlers = {
      "selection:created": () => this.emitSelection(),
      "selection:updated": () => this.emitSelection(),
      "selection:cleared": () => this.emitSelection(),
      "object:modified": (event) => this.commitTransform(event.target),
      "text:changed": (event) => this.queueTextCommit(event.target),
      "mouse:down": (event) => this.startPan(event.e),
      "mouse:move": (event) => this.movePan(event.e),
      "mouse:up": () => this.endPan(),
    };
    Object.entries(this.handlers).forEach(([name, handler]) => this.canvas.on(name, handler));
  }

  resize(width, height) {
    if (!width || !height || (width === this.size.width && height === this.size.height)) return;
    this.size = { width, height };
    this.canvas.setDimensions(this.size);
    if (this.document && this.view) void this.reconcile(this.document, this.view.id, this.template, this.assetRegistry);
  }

  async reconcile(document, viewId, template, assetRegistry) {
    const version = ++this.reconcileVersion;
    this.reconciling = true;
    this.document = document;
    this.template = template;
    this.assetRegistry = assetRegistry;
    this.view = getView(template, viewId);
    const elements = [...(document.views[this.view.id]?.elements || [])].sort((a, b) => a.zIndex - b.zIndex);
    const desiredIds = new Set(elements.map((element) => element.id));

    this.objects.forEach((object, elementId) => {
      if (!desiredIds.has(elementId)) {
        this.canvas.remove(object);
        this.objects.delete(elementId);
      }
    });

    for (const element of elements) {
      if (version !== this.reconcileVersion) return;
      let object = this.objects.get(element.id);
      if (!object) {
        object = await this.createObject(element);
        if (!object || version !== this.reconcileVersion) {
          if (version === this.reconcileVersion) this.reconciling = false;
          return;
        }
        this.objects.set(element.id, object);
        this.canvas.add(object);
      }
      this.applyElement(object, element);
      this.canvas.moveObjectTo(object, element.zIndex);
    }
    this.canvas.requestRenderAll();
    this.reconciling = false;
  }

  async createObject(element) {
    if (element.type === "text") {
      return new Textbox(element.content, { ...commonObjectOptions, editable: true, splitByGrapheme: false });
    }
    if (element.type === "image") {
      const objectUrl = this.assetRegistry?.get(element.assetId);
      if (!objectUrl) {
        this.callbacks.onError?.(`No está disponible el asset ${element.assetId}.`);
        return null;
      }
      try {
        const image = await FabricImage.fromURL(objectUrl);
        image.set({ ...commonObjectOptions });
        return image;
      } catch {
        this.callbacks.onError?.("No se pudo renderizar la imagen seleccionada.");
        return null;
      }
    }
    return null;
  }

  applyElement(object, element) {
    const viewport = getPrintAreaViewport(this.view, element.printAreaId, this.size);
    if (!viewport) return;
    const rect = domainElementToFabricRect(element, viewport);
    object.set({
      left: rect.centerX,
      top: rect.centerY,
      width: Math.max(rect.width, 1),
      height: Math.max(rect.height, 1),
      scaleX: 1,
      scaleY: 1,
      angle: element.rotation,
      opacity: element.opacity,
      visible: !element.hidden,
      selectable: !element.locked,
      evented: !element.locked,
      clipPath: createClipPath(viewport),
      data: { elementId: element.id, printAreaId: element.printAreaId, type: element.type },
    });
    if (element.type === "text") {
      object.set({
        text: element.content,
        fontSize: Math.max(element.fontSize * viewport.height, 10),
        fill: element.color,
        textAlign: element.textAlign,
        fontWeight: element.fontWeight,
        fontFamily: "Inter, ui-sans-serif, system-ui, sans-serif",
      });
    }
    object.setCoords();
  }

  emitSelection() {
    if (this.reconciling) return;
    const ids = this.canvas.getActiveObjects().map((object) => object.data?.elementId).filter(Boolean);
    const signature = ids.join("|");
    if (signature === this.selectionSignature) return;
    this.selectionSignature = signature;
    this.callbacks.onSelectionChange?.(ids);
  }

  queueTextCommit(object) {
    clearTimeout(this.textTimer);
    this.textTimer = setTimeout(() => this.commitText(object), 350);
  }

  commitText(object) {
    if (this.reconciling || !object?.data?.elementId) return;
    const viewport = getPrintAreaViewport(this.view, object.data.printAreaId, this.size);
    if (!viewport) return;
    this.callbacks.onElementChange?.(object.data.elementId, {
      content: object.text,
      height: Math.max(object.getScaledHeight() / viewport.height, 0.01),
    }, { groupKey: `typing:${object.data.elementId}` });
  }

  commitTransform(object) {
    if (this.reconciling || !object) return;
    if (object instanceof ActiveSelection) {
      const updates = object.getObjects().map((candidate) => this.transformUpdate(candidate)).filter(Boolean);
      if (updates.length) this.callbacks.onElementsChange?.(updates);
      return;
    }
    const update = this.transformUpdate(object);
    if (update) this.callbacks.onElementChange?.(update.elementId, update.patch);
  }

  transformUpdate(object) {
    if (!object?.data?.elementId) return null;
    const viewport = getPrintAreaViewport(this.view, object.data.printAreaId, this.size);
    if (!viewport) return null;
    const center = object.getCenterPoint();
    const scaling = object.getTotalObjectScaling();
    const patch = fabricTransformToDomain({
      centerX: center.x,
      centerY: center.y,
      width: object.width,
      height: object.height,
      scaleX: scaling.x / this.viewport.zoom,
      scaleY: scaling.y / this.viewport.zoom,
      rotation: object.angle || 0,
    }, viewport);
    return { elementId: object.data.elementId, patch };
  }

  select(elementIds = []) {
    const ids = Array.isArray(elementIds) ? elementIds : elementIds ? [elementIds] : [];
    const objects = ids.map((id) => this.objects.get(id)).filter(Boolean);
    this.selectionSignature = ids.join("|");
    if (objects.length > 1) this.canvas.setActiveObject(new ActiveSelection(objects, { canvas: this.canvas }));
    else if (objects[0]) this.canvas.setActiveObject(objects[0]);
    else this.canvas.discardActiveObject();
    this.canvas.requestRenderAll();
  }

  setViewport(zoom, pan) {
    this.viewport = { zoom, pan };
    this.canvas.setViewportTransform([zoom, 0, 0, zoom, pan.x, pan.y]);
    this.canvas.requestRenderAll();
  }

  setPanEnabled(enabled) {
    this.panEnabled = enabled;
    this.canvas.defaultCursor = enabled ? "grab" : "default";
  }

  async exportPng({ left, top, width, height }) {
    if (![left, top, width, height].every(Number.isFinite) || width <= 0 || height <= 0) throw new Error("Área de exportación inválida.");
    this.canvas.discardActiveObject();
    const viewportTransform = this.canvas.viewportTransform;
    this.canvas.setViewportTransform([1, 0, 0, 1, 0, 0]);
    this.canvas.requestRenderAll();
    try {
      const blob = await this.canvas.toBlob({ format: "png", left, top, width, height, multiplier: 1 });
      if (!blob) throw new Error("No se pudo exportar el artwork.");
      return blob;
    } finally {
      this.canvas.setViewportTransform(viewportTransform || [1, 0, 0, 1, 0, 0]);
      this.canvas.requestRenderAll();
    }
  }

  exportCanvas({ left, top, width, height }) {
    if (![left, top, width, height].every(Number.isFinite) || width <= 0 || height <= 0) throw new Error("Área de exportación inválida.");
    this.canvas.discardActiveObject();
    const viewportTransform = this.canvas.viewportTransform;
    this.canvas.setViewportTransform([1, 0, 0, 1, 0, 0]);
    this.canvas.requestRenderAll();
    try {
      return this.canvas.toCanvasElement(1, { left, top, width, height });
    } finally {
      this.canvas.setViewportTransform(viewportTransform || [1, 0, 0, 1, 0, 0]);
      this.canvas.requestRenderAll();
    }
  }

  startPan(event) {
    if (!this.panEnabled || this.viewport.zoom <= 1) return;
    this.panning = { x: event.clientX, y: event.clientY, pan: { ...this.viewport.pan } };
    this.canvas.selection = false;
    this.canvas.defaultCursor = "grabbing";
  }

  movePan(event) {
    if (!this.panning) return;
    const pan = { x: this.panning.pan.x + event.clientX - this.panning.x, y: this.panning.pan.y + event.clientY - this.panning.y };
    this.setViewport(this.viewport.zoom, pan);
  }

  endPan() {
    if (!this.panning) return;
    this.panning = null;
    this.canvas.selection = true;
    this.canvas.defaultCursor = this.panEnabled ? "grab" : "default";
    this.callbacks.onViewportChange?.(this.viewport);
  }

  async dispose() {
    this.reconcileVersion += 1;
    clearTimeout(this.textTimer);
    Object.entries(this.handlers).forEach(([name, handler]) => this.canvas.off(name, handler));
    this.objects.clear();
    await this.canvas.dispose();
  }
}
