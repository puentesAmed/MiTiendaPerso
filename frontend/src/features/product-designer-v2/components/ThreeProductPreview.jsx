import { useEffect, useRef, useState } from "react";
import { AlertTriangle, LoaderCircle, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { renderPreviewArtworkCanvas } from "../mockups/ArtworkRenderer.js";
import { loadThreeRuntime } from "../three/threeRuntime.js";
import { ThreePreviewAdapter } from "../three/ThreePreviewAdapter.js";
import { getRenderable3DSurfaceIds } from "../three/threeModelRegistry.js";

const phaseLabels = {
  "loading-runtime": "Cargando motor 3D…",
  "loading-model": "Cargando modelo 3D…",
  "preparing-texture": "Preparando textura…",
  "updating-texture": "Actualizando textura…",
};

async function renderArtworks({ profile, document, template, assetRegistry }) {
  const entries = await Promise.all(getRenderable3DSurfaceIds(profile, template).map(async (printSurfaceId) => [
    printSurfaceId,
    await renderPreviewArtworkCanvas({ document, template, printSurfaceId, assetRegistry }),
  ]));
  return Object.fromEntries(entries);
}

export function ThreeProductPreview({ profile, document, template, assetRegistry, onBackToDesign, onShowMockup }) {
  const containerRef = useRef(null);
  const adapterRef = useRef(null);
  const documentRef = useRef(document);
  const updateVersionRef = useRef(0);
  const readyRef = useRef(false);
  const [phase, setPhase] = useState("loading-runtime");
  const [error, setError] = useState("");
  const [retryAttempt, setRetryAttempt] = useState(0);

  useEffect(() => {
    documentRef.current = document;
  }, [document]);

  useEffect(() => {
    let active = true;
    let adapter;
    const initialize = async () => {
      try {
        setError("");
        setPhase("loading-runtime");
        const runtime = await loadThreeRuntime();
        if (!active) return;
        adapter = new ThreePreviewAdapter({ runtime, profile, productVariant: documentRef.current.variant, onStatus: (status) => active && setPhase(status), onError: (message) => active && setError(message) });
        adapterRef.current = adapter;
        await adapter.init(containerRef.current);
        if (!active) return;
        setPhase("preparing-texture");
        const artworks = await renderArtworks({ profile, document: documentRef.current, template, assetRegistry });
        if (!active) return;
        adapter.updateMaterialVariant(documentRef.current.variant);
        adapter.updateArtworks(artworks);
        readyRef.current = true;
        setPhase("ready");
      } catch (initializationError) {
        adapter?.dispose();
        if (adapterRef.current === adapter) adapterRef.current = null;
        if (active) setError(initializationError.message || "No se pudo preparar la vista 3D.");
      }
    };
    void initialize();
    return () => {
      active = false;
      updateVersionRef.current += 1;
      readyRef.current = false;
      adapterRef.current = null;
      adapter?.dispose();
    };
  }, [assetRegistry, profile, retryAttempt, template]);

  useEffect(() => {
    if (!adapterRef.current || !readyRef.current) return undefined;
    const version = ++updateVersionRef.current;
    const timer = setTimeout(async () => {
      try {
        setError("");
        setPhase("updating-texture");
        const artworks = await renderArtworks({ profile, document, template, assetRegistry });
        if (version !== updateVersionRef.current || !adapterRef.current) return;
        adapterRef.current.updateMaterialVariant(document.variant);
        adapterRef.current.updateArtworks(artworks);
        setPhase("ready");
      } catch (updateError) {
        if (version === updateVersionRef.current) setError(updateError.message || "No se pudo actualizar la textura 3D.");
      }
    }, 180);
    return () => clearTimeout(timer);
  }, [assetRegistry, document, profile, template]);

  return (
    <section className="min-w-0 rounded-xl border bg-card p-3 sm:p-4" aria-labelledby="three-preview-title">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <div><h2 id="three-preview-title" className="text-sm font-semibold">Preview 3D</h2><p id="three-preview-description" className="text-xs text-muted-foreground">{profile.modelStatus === "production" ? "Modelo productivo" : "Modelo técnico de desarrollo"} · arrastra para rotar y usa wheel o gesto de pinza para zoom</p></div>
        <Button type="button" variant="outline" size="sm" onClick={() => adapterRef.current?.resetView()} disabled={phase !== "ready"}><RotateCcw aria-hidden="true" /> Restablecer vista</Button>
      </div>
      <div className="relative min-h-[22rem] w-full min-w-0 overflow-hidden rounded-lg border bg-muted sm:min-h-[32rem]" aria-describedby="three-preview-description">
        <div ref={containerRef} className="absolute inset-0" />
        {phase !== "ready" && !error ? <div className="absolute inset-0 flex items-center justify-center bg-background/75 text-sm" role="status" aria-live="polite"><LoaderCircle className="mr-2 size-5 animate-spin" aria-hidden="true" /> {phaseLabels[phase] || "Preparando vista 3D…"}</div> : null}
        {error ? <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-background/95 p-6 text-center" role="alert"><AlertTriangle className="size-7 text-destructive" aria-hidden="true" /><p className="max-w-md text-sm">{error}</p><div className="flex flex-wrap justify-center gap-2"><Button type="button" onClick={() => setRetryAttempt((attempt) => attempt + 1)}>Reintentar</Button><Button type="button" variant="outline" onClick={onBackToDesign}>Volver a Design</Button>{onShowMockup ? <Button type="button" variant="outline" onClick={onShowMockup}>Ver Mockup</Button> : null}</div></div> : null}
      </div>
    </section>
  );
}

