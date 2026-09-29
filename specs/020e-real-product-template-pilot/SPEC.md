# SPEC-020E — Real ProductTemplate & Pilot Product

## Estado

Implementada y validada automáticamente el 2026-09-29. Alcance limitado a la relación declarativa Product → ProductTemplate del piloto de taza y a su entrada controlada en Designer V2.

## Objetivo

Conectar `Taza cerámica personalizada` con ProductDesigner V2 mediante `productTemplateId: "mug-ceramic-standard-v1"`, retirar los fallbacks provisionales y conservar el comportamiento de productos legacy sin template.

## Product

`Product.productTemplateId` es un string nullable, sin enum y sin ProductTemplate embebido. No se infiere desde `productId`, nombre ni `customizationType`. El detalle público expone el campo; precio, stock y contratos comerciales no cambian.

Productos existentes sin el campo siguen siendo válidos. Para V2, ausencia o ID no registrado significa template incompatible.

## ProductTemplateRepository

El registro frontend es explícito y cerrado. Conserva `generic-flat-demo` para tests/desarrollo aislado y registra `mug-ceramic-standard-v1`. La resolución productiva usa exclusivamente `product.productTemplateId` y nunca construye imports o paths desde ese valor.

Se eliminan el override temporal por producto y el fallback por `customizationType`.

## Template piloto

`mug-ceramic-standard-v1` usa:

- `schemaVersion: 1`;
- `templateRevision: 1`;
- `productType: "mug"` como metadato, sin branching;
- label `Taza cerámica personalizada`;
- una vista `wrap`;
- un área normalizada suficiente para edición 2D;
- `mockups: []` y `threeD: null`.

La geometría normalizada es `editor geometry`, no una medida de producción. No existe evidencia local verificada de tamaño físico, bleed, safe area, orientación de impresión o DPI; por ello `physicalSize`, `safeArea` y `bleed` son `null`. La imagen placeholder del seed no se usa como base ni como mockup.

## Asignación del piloto

El seed incorpora `productTemplateId` únicamente en la taza. Para la base de desarrollo ya creada se provee un script idempotente que actualiza sólo ese campo y acepta productId/templateId, sin credenciales embebidas ni cambios de precio, stock o nombre.

Ejecutar únicamente contra la base local/de desarrollo configurada en `Backend/.env`:

```powershell
cd Backend
node scripts/assign-product-template.js 693070095d96fe47cd3f2055 mug-ceramic-standard-v1
```

## ProductDetail y ruta directa

El CTA V2 sólo aparece cuando el flag está activo, el producto es personalizable y `productTemplateId` resuelve a un template registrado. La ruta directa mantiene error controlado ante ausencia o ID desconocido; no redirige.

## DesignDocument y drafts

El documento del piloto conserva productId real, template/revision reales, variante canónica, vista `wrap` y assets inicialmente vacíos.

Las referencias locales se buscan primero por template/revision exactos. Si no existe coincidencia, se detecta una referencia previa del mismo producto para presentarla como incompatible. Un draft `generic-flat-demo` nunca se reinterpreta; continuar queda bloqueado y el usuario puede descartarlo explícitamente. No hay migración automática ni borrado silencioso.

## Fuera de alcance

V1, Cart, Checkout, Order, Admin, ZIP, mockups, `automated_mockups`, Three.js, preview curvo, migración masiva y dimensiones de imprenta no verificadas.

## Validación

- tests backend del modelo y detalle API;
- tests frontend del registry, resolución, CTA, DesignDocument, incompatibilidad y referencia legacy;
- lint frontend, check backend, build y `git diff --check`;
- sin smoke visual exhaustivo.

## Criterios de aceptación

- [x] CA-01 Product incluye `productTemplateId` string nullable y no obligatorio.
- [x] CA-02 El detalle API devuelve `productTemplateId` sin alterar precio ni stock.
- [x] CA-03 Productos legacy sin campo continúan siendo válidos y se exponen con valor null.
- [x] CA-04 El repository resuelve únicamente por `productTemplateId` registrado.
- [x] CA-05 Se eliminan override por productId y fallback por `customizationType`.
- [x] CA-06 `generic-flat-demo` permanece registrado para tests/desarrollo aislado.
- [x] CA-07 Existe `mug-ceramic-standard-v1` válido y versionado.
- [x] CA-08 El template usa `productType: "mug"` sin branching de editor.
- [x] CA-09 La única vista del piloto es `wrap`.
- [x] CA-10 Geometría normalizada se documenta como editorial.
- [x] CA-11 `physicalSize`, `safeArea` y `bleed` permanecen null.
- [x] CA-12 No se introduce base image, mockup o 3D falso.
- [x] CA-13 Seed asigna el template únicamente a la taza piloto.
- [x] CA-14 Existe procedimiento idempotente para la base de desarrollo actual.
- [x] CA-15 ProductDetail condiciona CTA a flag, customizable y template registrado.
- [x] CA-16 La ruta directa conserva error controlado para producto sin template o ID desconocido.
- [x] CA-17 DesignDocument del piloto usa producto/template/revision reales y vista wrap.
- [x] CA-18 Draft generic previo se detecta como incompatible y puede descartarse.
- [x] CA-19 No hay migración o eliminación silenciosa de drafts.
- [x] CA-20 V1 y ecommerce permanecen intactos.
- [x] CA-21 No se añaden mockups, automated_mockups ni Three.js.
- [x] CA-22 Tests backend afectados pasan.
- [x] CA-23 Tests frontend afectados pasan.
- [x] CA-24 Lint, check backend, build y diff check pasan.
- [x] CA-25 Se entrega checklist manual breve.

## Pendiente SPEC-020F

Mockup Rendering Engine, preview curva y artefactos derivados de producción.
