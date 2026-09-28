import { Canvas, FabricImage, Rect, Textbox } from "fabric";
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
      selection: false,
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

    this.handlers = {
      "selection:created": (event) => this.emitSelection(event.selected?.[0] || null),
      "selection:updated": (event) => this.emitSelection(event.selected?.[0] || null),
      "selection:cleared": () => this.callbacks.onSelectionChange?.(null),
      "object:modified": (event) => this.commitTransform(event.target),
      "text:changed": (event) => this.commitText(event.target),
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

  emitSelection(object) {
    if (!this.reconciling) this.callbacks.onSelectionChange?.(object?.data?.elementId || null);
  }

  commitText(object) {
    if (this.reconciling || !object?.data?.elementId) return;
    const viewport = getPrintAreaViewport(this.view, object.data.printAreaId, this.size);
    if (!viewport) return;
    this.callbacks.onElementChange?.(object.data.elementId, {
      content: object.text,
      height: Math.max(object.getScaledHeight() / viewport.height, 0.01),
    });
  }

  commitTransform(object) {
    if (this.reconciling || !object?.data?.elementId) return;
    const viewport = getPrintAreaViewport(this.view, object.data.printAreaId, this.size);
    if (!viewport) return;
    const center = object.getCenterPoint();
    const patch = fabricTransformToDomain({
      centerX: center.x,
      centerY: center.y,
      width: object.width,
      height: object.height,
      scaleX: object.scaleX,
      scaleY: object.scaleY,
      rotation: object.angle || 0,
    }, viewport);
    object.set({ width: patch.width * viewport.width, height: patch.height * viewport.height, scaleX: 1, scaleY: 1 });
    object.setCoords();
    this.callbacks.onElementChange?.(object.data.elementId, patch);
  }

  select(elementId) {
    const object = elementId ? this.objects.get(elementId) : null;
    if (object) this.canvas.setActiveObject(object);
    else this.canvas.discardActiveObject();
    this.canvas.requestRenderAll();
  }

  async dispose() {
    this.reconcileVersion += 1;
    Object.entries(this.handlers).forEach(([name, handler]) => this.canvas.off(name, handler));
    this.objects.clear();
    await this.canvas.dispose();
  }
}
