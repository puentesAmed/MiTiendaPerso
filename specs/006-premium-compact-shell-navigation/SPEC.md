# SPEC-006 — Premium Compact Shell & Navigation

## Estado

**Estado:** implementada y validada el 25 de septiembre de 2026.

## Objetivo

Consolidar el shell principal de MiTiendaPerso con una navegación compacta, clara y responsive, manteniendo la dirección visual `Premium Compact Commerce` definida en SPEC-005 y sin modificar contratos ni lógica de negocio.

## Alcance

- Cabecera sticky compacta con identidad, navegación, búsqueda, cuenta, tema y carrito.
- Navegación desktop basada únicamente en rutas activas.
- Navegación móvil accesible mediante `Sheet`.
- Búsqueda global conectada al filtro real existente del catálogo.
- Footer y page shell compactos y consistentes.
- Estados activo, hover, focus y dark mode mediante los tokens existentes.

## Arquitectura objetivo

```text
App shell
├── SiteHeader
│   ├── desktop navigation
│   ├── catalog search
│   ├── account/theme actions
│   └── mobile Sheet navigation
├── routed page content
└── SiteFooter
```

El shell utiliza Tailwind, primitives shadcn/Base UI y Lucide. Magic UI no se incorpora en esta fase: no existe una microinteracción necesaria que justifique añadir un efecto decorativo al shell.

## Criterios de aceptación

- [x] **CA-01.** La cabecera es sticky, mide entre 56 y 60 px en su estado normal y conserva una jerarquía visual compacta.
- [x] **CA-02.** La identidad MiTiendaPerso se mantiene reconocible sin ocupar espacio desproporcionado.
- [x] **CA-03.** La navegación desktop enlaza únicamente rutas existentes y marca la ruta activa de forma visible y accesible.
- [x] **CA-04.** La búsqueda de cabecera envía el término al catálogo y reutiliza su consulta real de productos.
- [x] **CA-05.** En móvil la búsqueda se ofrece como una acción compacta y mantiene el mismo comportamiento real.
- [x] **CA-06.** La navegación móvil usa `Sheet`, contiene solo rutas activas y se cierra al navegar.
- [x] **CA-07.** Las opciones de cuenta respetan el estado autenticado y no enlazan páginas inexistentes.
- [x] **CA-08.** El acceso al carrito es una acción independiente y muestra un contador cuando contiene unidades.
- [x] **CA-09.** El cambio de tema reutiliza el único `ThemeProvider` existente.
- [x] **CA-10.** El footer es compacto y enlaza únicamente destinos existentes de navegación y contenido legal.
- [x] **CA-11.** El page shell ocupa como mínimo el alto del viewport y no introduce overflow horizontal.
- [x] **CA-12.** El shell funciona en light y dark mode con contraste y estados de foco visibles.
- [x] **CA-13.** Las acciones iconográficas disponen de nombre accesible y área táctil suficiente.
- [x] **CA-14.** El responsive se valida a 320, 375, 768, 1024 y 1440 px.
- [x] **CA-15.** La implementación usa la stack visual vigente y no reintroduce Chakra UI.
- [x] **CA-16.** No se modifica backend, contratos API, lógica de negocio ni se rediseñan profundamente las páginas.
- [x] **CA-17.** `npm run lint` finaliza correctamente.
- [x] **CA-18.** `npm run build` finaliza correctamente.

## Fuera de alcance

- Backend, APIs, modelos, pagos, shipping, carrito, variantes, pedidos e integraciones dormidas.
- Nuevas rutas o páginas de perfil, ayuda o personalización genérica.
- Rediseño profundo de Home, catálogo, detalle, checkout, pedidos o Admin.
- Nueva lógica o servicio de búsqueda.
- Cambios generales en el design system de SPEC-005.

## Validación

- `npm run lint`
- `npm run build`
- smoke visual light/dark a 320, 375, 768, 1024 y 1440 px;
- comprobación de navegación, búsqueda, Sheet, cuenta, carrito y theme toggle.
