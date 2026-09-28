import { useEffect, useReducer } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/EmptyState";
import { ErrorState } from "@/components/ui/ErrorState";
import { LoadingState } from "@/components/ui/LoadingState";
import { PageContainer } from "@/components/ui/PageContainer";
import { apiGetProductById } from "@/services/products.service";
import { createDesignDocument } from "../contracts/designDocument.js";
import { validateProductTemplate } from "../contracts/productTemplate.js";
import { DesignerV2Shell } from "../components/DesignerV2Shell.jsx";
import { designerV2Reducer, initialDesignerV2State } from "../state/designerV2Reducer.js";
import { resolveProductTemplate } from "../templates/templateRepository.js";
import { isProductDesignerV2Enabled } from "../utils/featureFlag.js";

const statusCopy = {
  disabled: ["Designer V2 no disponible", "Activa VITE_PRODUCT_DESIGNER_V2_ENABLED para acceder a esta foundation."],
  "not-found": ["Producto no encontrado", "No existe un producto para esta ruta."],
  incompatible: ["Producto sin template compatible", "Este producto todavía no tiene una relación de desarrollo con ProductTemplate."],
  "invalid-template": ["Template inválido", "El ProductTemplate no supera la validación del contrato v1."],
  load: ["No se pudo abrir Designer V2", "No se pudo cargar el producto. Inténtalo de nuevo."],
};

export function ProductDesignerV2Page() {
  const { productId } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const [state, dispatch] = useReducer(designerV2Reducer, initialDesignerV2State);

  useEffect(() => {
    let active = true;
    if (!isProductDesignerV2Enabled) {
      dispatch({ type: "failed", payload: { error: { code: "disabled" } } });
      return () => { active = false; };
    }

    dispatch({ type: "loading" });
    apiGetProductById(productId)
      .then((product) => {
        if (!active) return;
        if (!product) {
          dispatch({ type: "failed", payload: { error: { code: "not-found" } } });
          return;
        }
        const template = resolveProductTemplate(product);
        if (!template) {
          dispatch({ type: "failed", payload: { product, error: { code: "incompatible" } } });
          return;
        }
        const validation = validateProductTemplate(template);
        if (!validation.valid) {
          dispatch({ type: "failed", payload: { product, error: { code: "invalid-template", details: validation.errors } } });
          return;
        }
        const document = createDesignDocument({
          template,
          productId: product.id || product._id,
          variant: location.state?.variant || null,
        });
        dispatch({ type: "ready", payload: { product, template, document } });
      })
      .catch(() => {
        if (active) dispatch({ type: "failed", payload: { error: { code: "load" } } });
      });

    return () => { active = false; };
  }, [location.state?.variant, productId]);

  const handleBack = () => {
    if (location.state?.fromProductDetail) navigate(-1);
    else navigate(`/productos/${productId}`);
  };

  if (state.asyncState.status === "loading") {
    return <PageContainer><LoadingState message="Preparando Designer V2…" className="min-h-[60vh]" /></PageContainer>;
  }

  if (state.asyncState.status === "error") {
    const code = state.asyncState.error?.code || "load";
    const [title, description] = statusCopy[code] || statusCopy.load;
    const action = <Button type="button" variant="outline" onClick={handleBack}><ArrowLeft aria-hidden="true" /> Volver al producto</Button>;
    return (
      <PageContainer className="min-h-[60vh] py-10">
        {code === "load" || code === "invalid-template" ? (
          <div className="space-y-4"><ErrorState title={title} description={description} />{action}</div>
        ) : (
          <EmptyState title={title} description={description} action={action} />
        )}
      </PageContainer>
    );
  }

  return (
    <DesignerV2Shell
      product={state.asyncState.product}
      template={state.asyncState.template}
      document={state.documentState.document}
      activeViewId={state.sessionState.activeViewId}
      onSelectView={(viewId) => dispatch({ type: "view-selected", payload: viewId })}
      onBack={handleBack}
    />
  );
}
