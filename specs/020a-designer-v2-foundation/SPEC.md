# SPEC-020A — ProductDesigner V2 Foundation

## 1. Estado

Implementada y validada el 2026-09-28.

## 2. Contexto

ProductDesigner V1 permanece dormido en `/personalizar/:id`, sin eliminación, refactor como base ni nuevas funcionalidades. ProductDesigner V2 se inicia como una feature aislada y visible, con contratos propios versionados. Fabric.js será el renderer 2D en fases posteriores, pero esta SPEC valida primero arquitectura, layout, coordenadas y navegación con una superficie read-only.

Esta SPEC se basa en `docs/audits/product-designer-v2-technical-audit.md` y preserva el contrato de `specs/003-unified-product-variant-cart-contract/SPEC.md` sin modificarlo.

## 3. Objetivo

Entregar la foundation frontend de ProductDesigner V2:

- ruta pública independiente `/personalizar-v2/:productId`;
- carga lazy y feature flag `VITE_PRODUCT_DESIGNER_V2_ENABLED`;
- CTA secundaria condicional en ProductDetail sin sustituir V1;
- contratos v1 para ProductTemplate, PrintArea, DesignDocument y elementos;
- repositorio frontend de templates y mapping de desarrollo aislado;
- factory de documento, validadores y helpers de coordenadas puros;
- state separado en document/session/async mediante reducer;
- shell Premium Compact responsive y superficie read-only con print area;
- estados loading, producto inexistente, template incompatible/inválido y ready;
- modos Mockup/3D visibles pero deshabilitados.

## 4. Fuera de alcance

- Fabric.js, edición, upload, export, autosave y persistencia.
- Cart, Checkout, Order, Admin, Customization, ZIP y backend.
- automated_mockups y Three.js.
- cambios o imports cruzados con ProductDesigner V1.
- medidas, assets o restricciones comerciales inventadas.

## 5. Routing y flag

- V1 conserva `/personalizar/:id` sin cambios.
- V2 usa `/personalizar-v2/:productId` mediante `React.lazy`.
- Con flag `true`, ProductDetail muestra `Probar nuevo diseñador` como acción secundaria y conserva la variante canónica en navigation state cuando ya es válida.
- Con flag ausente/false, el CTA no aparece y la ruta V2 muestra un estado no disponible.
- El flag no modifica V1.

## 6. Arquitectura frontend

```text
frontend/src/features/product-designer-v2/
  components/   shell y stage read-only
  contracts/    ProductTemplate, DesignDocument y element model
  pages/        carga/orquestación de la ruta
  state/        reducer con document/session/async state
  templates/    fixture, repository y mapping provisional
  utils/        feature flag y coordenadas
```

Solo se crean carpetas con archivos usados en esta fase. V2 no importa V1 y V1 no importa V2.

## 7. ProductTemplate v1

Campos raíz mínimos:

```js
{
  schemaVersion: 1,
  templateId,
  templateRevision,
  productType,
  label,
  editor,
  views,
  mockups: [],
  threeD: null
}
```

Cada view tiene `id`, `label`, presentación opcional y `printAreas`. Cada PrintArea contiene `id`, `label`, coordenadas normalizadas `x/y/width/height`, `shape`, `clip`, `safeArea`, `bleed`, `physicalSize` y `constraints`. Datos de producción desconocidos son `null`.

## 8. DesignDocument v1

```js
{
  schemaVersion: 1,
  documentId,
  templateId,
  templateRevision,
  productId,
  variant,
  assets: {},
  views: { [viewId]: { elements: [] } },
  metadata: { createdAt, updatedAt }
}
```

No contiene Fabric JSON, PNG, previews, mockups, selección ni zoom. `createDesignDocument` usa `crypto.randomUUID()` por defecto e inicializa todas las vistas del template.

## 9. Element model

Tipos iniciales: `text`, `image`, `shape`.

Campos comunes: `id`, `type`, `printAreaId`, `x`, `y`, `width`, `height`, `scale`, `rotation`, `opacity`, `zIndex`, `locked`, `hidden`. Coordenadas/dimensiones son normalizadas respecto al print area propietario. En 020A solo se definen y validan contratos; no se editan elementos.

## 10. Coordenadas

Helpers puros convierten rectángulos normalizados a viewport y viceversa. Validan dimensiones positivas y no usan píxeles de viewport como fuente de verdad. La UI deriva porcentajes/rectángulos exclusivamente desde el template.

## 11. Template repository y fixture

Se usa `generic-flat-demo`, fixture técnico no comercial, porque no hay medidas ni asset verificable de taza. Tiene dos vistas técnicas para probar view switching y áreas normalizadas. Un mapping de desarrollo aislado resuelve los `customizationType` locales actuales a su `templateId`; no hay branching por producto en el editor. El fixture muestra un aviso explícito de no producción.

## 12. Estado

El reducer mantiene tres slices:

- `documentState`: DesignDocument persistible;
- `sessionState`: `activeViewId`, `selection`, `zoom`, `mode`;
- `asyncState`: status, product, template, error code/message.

Cambiar de vista solo actualiza session state y conserva la identidad del documento.

## 13. UX

### Desktop

- top bar compacta con retorno, producto, título V2 y Guardar deshabilitado;
- rail de herramientas placeholder deshabilitadas;
- stage central protagonista con view/print-area read-only;
- panel compacto de estado/capas;
- footer con view switching y modos Design/Mockup/3D, estos dos últimos deshabilitados.

### Mobile 320/375

- top bar reducida;
- stage primero y sin overflow horizontal;
- paneles laterales no permanentes;
- toolbar inferior compacta;
- CTA visible y honesto, deshabilitado porque no existe persistencia.

La UI usa React, Tailwind, componentes shadcn/Base UI existentes y Lucide. No usa Chakra ni Magic UI.

## 14. Accesibilidad y dark mode

- landmarks, heading principal, labels, tabs y focus visible;
- placeholders y modos no disponibles usan disabled/`aria-disabled` real;
- stage read-only expone descripción accesible;
- colores usan tokens de tema y se validan en light/dark.

## 15. Performance

- V2 se carga por ruta.
- Fabric y Three no se instalan ni importan.
- El build debe confirmar que ambos aportan 0 KB nuevos al bundle inicial y registrar tamaños de main/chunk V2/chunks nuevos.

## 16. Tests y validación

- Tests puros con el runner disponible de Node para ProductTemplate validation, invalid template, DesignDocument factory, inicialización de vistas, coordenadas y template lookup.
- `npm run lint`.
- `npm run build`.
- `git diff --check`.
- Smoke visual con flag ON/OFF, light/dark y anchos 320, 375, 768, 1024 y 1440.

## 17. Criterios de aceptación

- [x] CA-01 V1 conserva ruta e imports y no depende de V2.
- [x] CA-02 V2 dispone de ruta lazy independiente.
- [x] CA-03 flag controla CTA y disponibilidad de la página.
- [x] CA-04 ProductDetail conserva CTA V1 y añade CTA V2 secundaria condicional.
- [x] CA-05 ProductTemplate v1 y PrintArea incluyen todos los campos acordados.
- [x] CA-06 DesignDocument v1 no contiene estado de renderer/UI ni artefactos derivados.
- [x] CA-07 Element model define text/image/shape y campos comunes normalizados.
- [x] CA-08 helpers normalizados↔viewport tienen tests.
- [x] CA-09 repository resuelve por templateId/config y mapping provisional aislado.
- [x] CA-10 fixture técnico no inventa datos comerciales y está rotulado.
- [x] CA-11 shell desktop y mobile no tienen overflow horizontal.
- [x] CA-12 print area y view activa son visibles; cambio de vista conserva documento.
- [x] CA-13 document/session/async state están separados.
- [x] CA-14 factory inicializa UUID, refs, variant, vistas y metadata.
- [x] CA-15 templates inválidos producen error explícito.
- [x] CA-16 loading, not found, incompatible, invalid y ready están contemplados.
- [x] CA-17 Mockup/3D y herramientas no implementadas están honestamente deshabilitados.
- [x] CA-18 dark mode, landmarks, labels, focus y stage accesible están presentes.
- [x] CA-19 Fabric y Three no se importan; V2 es lazy.
- [x] CA-20 Cart/Checkout/Order/Admin/backend no cambian.
- [x] CA-21 lint, tests específicos, build y diff check pasan.

## 18. Pendiente para SPEC-020B

Únicamente core editing con FabricAdapter: selección, texto, imagen y transforms básicos sobre DesignDocument. No se anticipa en esta SPEC.
