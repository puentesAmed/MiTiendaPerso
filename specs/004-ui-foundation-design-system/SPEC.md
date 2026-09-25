# SPEC-004 — UI Foundation y Design System

## 1. Estado

**Estado:** implementada y validada el 25 de septiembre de 2026.

**Dependencias:** SPEC-001, SPEC-002 y SPEC-003 implementadas. Las integraciones externas continúan dormidas; checkout, pagos manuales y el contrato `CartLineV2` no forman parte de esta intervención.

Esta SPEC define la base visual común de MiTiendaPerso. No autoriza todavía un rediseño completo de páginas ni cambios de lógica de negocio.

## 2. Objetivo

Establecer una única infraestructura visual, basada en Chakra UI, que permita evolucionar la aplicación de forma incremental y coherente:

```text
Chakra theme
├── tokens base
├── tokens semánticos light/dark
├── recetas de componentes Chakra
└── breakpoints existentes
        ↓
primitivos compartidos
├── PageContainer
├── encabezados
├── estados de página
├── ProductImage
└── Price
        ↓
migración piloto
└── ProductCard
```

Los objetivos son:

- eliminar decisiones visuales arbitrarias en componentes nuevos;
- proporcionar jerarquía, spacing, estados y responsive previsibles;
- conservar el soporte claro/oscuro;
- mejorar accesibilidad sin cambiar flujos funcionales;
- permitir que las pantallas existentes migren por partes, sin una reescritura global.

## 3. Alcance de inspección y evidencia actual

Se revisaron la auditoría, las tres SPEC anteriores y únicamente la infraestructura visual y ejemplos representativos: `main.jsx`, `App.jsx`, `theme.js`, CSS global, `ProductCard`, Home, Products, ProductDetail, Cart, Checkout, Admin, formularios de acceso y componentes compartidos de checkout/pedidos.

Hallazgos confirmados:

1. Chakra UI es la infraestructura activa: `main.jsx` monta `ChakraProvider`, `ColorModeScript` y el tema de `theme.js`. No se introducirá una segunda capa de variables o una librería UI adicional.
2. `theme.js` solo define siete colores semánticos. No fija explícitamente configuración de color mode, paleta completa de marca, tipografía, componentes, focus, spacing de layout, radii, shadows ni z-index propios.
3. `App.jsx` ya usa parte de los tokens (`bgPage`, `bgSurface`, `textMuted`, `brand`), pero Home, ProductCard, formularios, checkout, Admin y componentes compartidos combinan `blue`, `pink`, `purple`, `teal`, `green`, `red`, grises y hexadecimales.
4. Existen referencias no respaldadas de forma coherente por el tema: ProductDetail usa `infoSurface`; Login usa `brand.500`, `brand.600`, `accent.500` y `accent.600`, mientras `brand` está definido actualmente como token semántico escalar y `accent` no existe.
5. `App.css` contiene `#root { max-width: 1280px; padding: 2rem; text-align: center; }` e `index.css` conserva estilos del template Vite, pero ninguno está importado desde el entrypoint actual. No limitan hoy el layout, aunque son una deuda dormida que podría activarse accidentalmente.
6. ProductCard usa altura de imagen fija de 180 px, decisiones de color locales y dos botones en una sola fila; con textos largos o 320–375 px puede comprimir contenido y acciones. El feedback de alta solo abre modal para el primer artículo.
7. Loading, error, empty y success se expresan con combinaciones distintas de texto, `Spinner`, `Alert`, toast y modal. Products, ProductDetail, Checkout y Admin no comparten un patrón de estado.
8. El responsive existe, pero es parcial: catálogo 1/2/3/4 columnas, detalle 1/2 columnas y stacks en checkout; Checkout y Admin mantienen alta densidad, tablas con scroll vertical pero sin estrategia horizontal común, y no hay validación visual sistemática a 320, 375, 768, 1024 px, zoom 200 % o contenido largo.

## 4. Principios de diseño

1. **Una única fuente:** Chakra Theme contiene los tokens; CSS global solo contiene reset/base imprescindible.
2. **Semántica antes que color:** los componentes consumen intención (`actionPrimary`, `textMuted`, `statusError`) y no tonos concretos cuando la intención sea estable.
3. **Mobile first:** los estilos base deben funcionar a 320 px; cada breakpoint añade espacio o composición, no repara un layout rígido.
4. **Composición, no wrappers indiscriminados:** se crean componentes compartidos solo cuando aportan estructura o comportamiento repetible. Los controles Chakra se configuran mediante theme recipes siempre que sea suficiente.
5. **Accesibilidad por defecto:** foco, contraste, etiquetas, targets táctiles y teclado forman parte del contrato visual.
6. **Migración reversible:** cada componente o página puede migrarse y validarse de forma aislada.
7. **Sin cambios funcionales:** tokens y primitivas no cambian precios, pagos, carrito, variantes, navegación de negocio ni llamadas API.

## 5. Fuente única de design tokens

La implementación ampliará `frontend/src/theme.js` (o lo dividirá internamente solo si el tamaño lo justifica), siempre exportando un único theme a `ChakraProvider`.

No se creará un archivo paralelo de constantes visuales ni se duplicarán tokens como variables CSS manuales. Chakra podrá emitir sus propias variables CSS.

### 5.1 Configuración de color mode

Definir explícitamente:

```js
config: {
  initialColorMode: "light",
  useSystemColorMode: false
}
```

Se conserva el toggle existente. La elección de `useSystemColorMode` podrá cambiar antes de implementación si existe un requisito de producto explícito, pero no quedará implícita.

### 5.2 Colores

Definir una paleta de marca real `brand.50`–`brand.900` y tokens semánticos con equivalencia light/dark:

| Intención | Tokens propuestos |
|---|---|
| Fondos | `bgPage`, `bgSurface`, `bgSubtle`, `bgHeader`, `bgElevated` |
| Texto | `textPrimary`, `textSecondary`, `textMuted`, `textInverse` |
| Bordes | `borderSubtle`, `borderDefault`, `borderStrong` |
| Acción | `actionPrimary`, `actionPrimaryHover`, `actionSecondary`, `focusRing` |
| Estados | `statusInfo`, `statusSuccess`, `statusWarning`, `statusError` y sus superficies/bordes |
| Disponibilidad | `availabilityAvailable`, `availabilityUnavailable` |

Reglas:

- reservar `brand` para la escala de color, no mezclar un token escalar `brand` con usos `brand.500`;
- retirar referencias a `accent.*` o definirlas solo si se aprueba una segunda familia con propósito claro;
- `blue`, `purple`, `pink`, `green`, `red`, `teal` y hexadecimales pueden seguir existiendo dentro del theme, pero no se elegirán directamente en componentes migrados cuando haya un token semántico;
- los estados no dependerán exclusivamente del color: incluirán texto, icono o etiqueta;
- todas las parejas foreground/background deben cumplir contraste WCAG 2.1 AA.

### 5.3 Tipografía

Usar stacks de sistema, sin descargar una fuente nueva en esta fase:

```text
body: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif
heading: el mismo stack, con pesos diferenciados
mono: stack monoespaciado del sistema
```

Se reutiliza la escala tipográfica de Chakra y se fijan usos semánticos:

- título de página: `2xl`/`3xl`, peso `bold`, line-height `short`;
- título de sección: `lg`/`xl`, peso `semibold`;
- título de card: `md`/`lg`, peso `semibold`;
- cuerpo: `md`, line-height `base`;
- texto auxiliar: `sm`;
- metadatos: `xs`, sin usarlos para información crítica extensa;
- precio destacado: escala propia por contexto, nunca menor que cuerpo.

No se usarán tamaños arbitrarios en `rem` salvo una excepción documentada. El hero de Home no se migra en esta SPEC.

### 5.4 Spacing y layout

Se mantiene la escala Chakra basada en múltiplos de 4 px. Los componentes migrados usarán tokens, no píxeles arbitrarios.

Convenciones iniciales:

| Uso | Token Chakra |
|---|---|
| Separación compacta | `1`–`2` |
| Separación entre controles | `3`–`4` |
| Padding de card | `4` en móvil, `5`–`6` cuando haya espacio |
| Separación de secciones | `8`–`12` |
| Gutter de página | `4` base, `6` md, `8` lg |
| Ancho de contenido | `container.xl` como máximo general; variantes más estrechas para formularios/checkout |

`PageContainer` será responsable del ancho y gutter. Las páginas no deben acumular padding propio sobre padding global desconocido.

### 5.5 Radii

Usar un conjunto pequeño y consistente:

- controles: `md`;
- cards y paneles: `lg`;
- superficies destacadas/modales: `xl` cuando corresponda;
- badges/avatar/pills: `full`;
- imágenes dentro de cards: coherentes con el radio del contenedor.

No se añadirán valores como `18px` en componentes migrados.

### 5.6 Shadows

- `none`: superficies planas y estados base;
- `sm`: separación sutil de cards;
- `md`: elementos elevados, header con scroll y hover moderado;
- `lg`: modales/popovers solo cuando Chakra no aporte ya una receta adecuada.

La sombra no sustituye al borde en dark mode. Se evitarán sombras intensas repetidas en listas densas.

### 5.7 Breakpoints

Se conservarán inicialmente los breakpoints estándar de Chakra:

```text
base: < 480 px
sm:   ≥ 480 px
md:   ≥ 768 px
lg:   ≥ 992 px
xl:   ≥ 1280 px
2xl:  ≥ 1536 px
```

No se introduce un breakpoint exclusivo de 1024 px: la revisión a 1024 valida el comportamiento `lg`. Cualquier cambio futuro de breakpoint requerirá evidencia de un fallo real repetido.

### 5.8 Z-index

Usar los tokens de Chakra (`dropdown`, `sticky`, `overlay`, `modal`, `popover`, `toast`, `tooltip`). Solo se añadirá un token propio si un caso real no puede expresarse con esa escala. No se usarán números locales para competir con header, menú, modal o toast.

## 6. Theme recipes para componentes Chakra

Antes de crear wrappers, el theme debe fijar defaults y variantes de los controles existentes:

### Button

- variantes `solid`, `outline`, `ghost` y `link` coherentes;
- acción principal basada en `actionPrimary`;
- altura táctil mínima de 44 px para acciones principales en móvil;
- `sm` se reserva para acciones secundarias en contextos no táctiles densos;
- focus visible, loading, disabled y hover no dependen solo de opacidad/color.

### Input, Select y Textarea

- misma altura, radio, borde, focus ring y estado inválido;
- siempre asociados a `FormLabel` para datos de negocio; placeholder no sustituye a la etiqueta;
- disabled/read-only distinguibles y con contraste suficiente;
- mensajes de ayuda/error con espacio estable para evitar saltos innecesarios.

### Card

Se prioriza `Card` de Chakra o una receta de superficie; no se creará un `BaseCard` si `Card` resuelve padding, fondo, borde y shadow. Debe soportar light/dark sin colores locales.

### Badge y Alert

- variantes semánticas para info/success/warning/error/neutral;
- el significado incluye texto y, cuando corresponda, icono;
- evitar usar `purple` como sinónimo genérico de personalización fuera de una decisión de producto documentada.

### Spinner

`Spinner` continúa siendo el indicador visual básico, pero las páginas usarán `LoadingState` para aportar texto, región accesible y layout consistente.

## 7. Componentes base priorizados

### Primera capa — implementar en SPEC-004

1. **PageContainer**
   - ancho máximo, gutter responsive y centrado;
   - variantes `default`, `narrow` y `wide` solo si hay consumidores reales;
   - no impone alineación de texto ni fondo.
2. **PageHeader**
   - título, descripción opcional, breadcrumbs/acción opcionales;
   - stack vertical en móvil y acciones alineadas en desktop.
3. **SectionHeader**
   - título de sección, texto auxiliar y acción opcional, más compacto que PageHeader.
4. **LoadingState**
   - `Spinner`, mensaje útil, `role="status"` y `aria-live="polite"`;
   - variante inline y de página únicamente si ambas se usan.
5. **EmptyState**
   - título, descripción y acción opcional;
   - no confundir cero resultados filtrados con error.
6. **ErrorState**
   - mensaje comprensible, acción de reintento opcional y `Alert` semántico;
   - no muestra detalles técnicos.
7. **ProductImage**
   - ratio, `object-fit`, fallback local, lazy loading y estado de error comunes.
8. **Price**
   - presenta cantidad/rango/moneda con jerarquía coherente;
   - es puramente visual y nunca recalcula ni convierte el precio autoritativo.

### Configurar en theme, no envolver inicialmente

- Button;
- Input;
- Select;
- Textarea;
- Card;
- Badge;
- Alert;
- Spinner.

### Segunda capa — fuera de la primera implementación salvo necesidad del piloto

- formularios compuestos;
- tablas/cards responsive de Admin;
- resumen de pedido;
- navegación/breadcrumbs globales;
- galería completa de producto;
- toasts o sistema global de notificaciones propio.

## 8. Estados visuales comunes

### Loading

- usar `LoadingState` al reemplazar contenido principal;
- mantener el layout estable cuando sea posible;
- indicar qué se está cargando, no solo mostrar un spinner;
- botones usan `isLoading` para acciones locales y evitan dobles envíos.

### Error

- usar `ErrorState` para fallo de página/sección y `FormErrorMessage` para campo;
- usar `Alert` para errores operativos dentro de un flujo;
- ofrecer reintento cuando la operación sea segura;
- no depender de texto rojo suelto como único patrón.

### Empty

- diferenciar catálogo vacío, búsqueda sin resultados, carrito vacío y lista administrativa vacía mediante copy/acción contextual;
- `EmptyState` no debe parecer un error.

### Success

- toast para confirmación breve de una acción que no desplaza al usuario;
- `Alert` o página de confirmación para resultados persistentes que requieren lectura;
- no usar un modal únicamente para confirmar cada alta al carrito si un feedback no bloqueante resuelve el caso.

### Disabled

- usar semántica HTML/Chakra real (`isDisabled`), no solo estilo visual;
- mantener legible la etiqueta;
- si la causa no es evidente, mostrar ayuda cercana;
- no usar disabled para ocultar una acción que el usuario necesita comprender.

### Unavailable

- combinar badge/texto explícito con el estado disabled de la acción;
- no comunicar stock o indisponibilidad solo con rojo/verde;
- mantener la card navegable si el detalle aporta información útil.

## 9. Root y layout global

### Estado real

- `App.css` contiene la regla restrictiva de `#root`, pero no está importado actualmente;
- `index.css` tampoco está importado y contiene colores del template Vite que competirían con Chakra si se activaran;
- el layout activo proviene de Chakra y de `App.jsx`.

### Arquitectura objetivo

Debe existir un único CSS global, importado una vez por `main.jsx`, con alcance mínimo:

```css
html,
body,
#root {
  min-height: 100%;
}

body {
  margin: 0;
  min-width: 320px;
}

#root {
  width: 100%;
}
```

La implementación exacta puede usar `CSSReset`/`GlobalStyle` de Chakra cuando cubra el mismo objetivo. Antes de importar cualquier CSS existente se deben retirar o neutralizar:

- `max-width` global de `#root`;
- padding global de `#root`;
- `text-align: center` global;
- fondo/color fijos del template;
- `color-scheme` que compita con Chakra.

El ancho legible se aplicará mediante `PageContainer`, no mediante `#root`. Para evitar roturas:

1. verificar primero que el CSS no importado no tenga consumidores necesarios;
2. crear el reset mínimo;
3. montar `PageContainer` en una ruta piloto;
4. validar shell/header/footer a ancho completo;
5. migrar páginas una por una.

## 10. Reglas de imágenes

### Producto en card

- ratio recomendado inicial `4 / 3`, validado con los assets reales;
- `object-fit: contain` para productos recortables/personalizados;
- fondo de superficie sutil para evitar huecos visuales;
- altura derivada del ratio, no `180px` fijo;
- `loading="lazy"` para cards fuera del primer viewport;
- `alt` con nombre del producto; decorativas usan `alt=""`.

### Detalle de producto

- contenedor estable y responsive, preferentemente `1 / 1` o límites por `maxH`;
- `object-fit: contain` por defecto;
- fallback/error compartido;
- no se implementan miniaturas, zoom ni nueva galería en esta SPEC.

### Banners/editorial

- pueden usar `cover` si el recorte es intencional;
- deben definir focal point cuando el recorte afecte contenido;
- no reutilizar las reglas de producto para banners.

### Fallos y carga

- fallback local único, sin depender de un servicio externo;
- evitar bucles de `onError` si también falla el fallback;
- reservar espacio para reducir layout shift;
- skeleton solo si se valida que aporta valor en el piloto; no crear una infraestructura completa de imágenes.

## 11. Estrategia responsive

### 320 y 375 px

- gutter de 16 px como referencia;
- una columna;
- acciones primarias a ancho completo cuando dos botones compriman texto;
- títulos y precios deben envolver sin overflow;
- targets táctiles de al menos 44 × 44 px;
- evitar alturas fijas que ocupen innecesariamente el viewport;
- ninguna página debe provocar scroll horizontal por layout propio.

### 480–767 px (`sm`)

- catálogo puede usar dos columnas solo si ProductCard mantiene ancho legible;
- filtros y grupos de acciones pueden envolver o apilarse;
- no asumir teclado/ratón por el ancho disponible.

### 768–991 px (`md`)

- habilitar composiciones de dos columnas cuando cada región conserve su ancho mínimo;
- ProductDetail puede pasar a dos columnas;
- checkout conserva una columna estrecha/legible hasta que una SPEC posterior defina un layout distinto;
- navegación desktop debe validarse con contenido largo, no solo por breakpoint.

### 992–1279 px (`lg`, incluye prueba a 1024)

- catálogo puede crecer a tres columnas;
- filtros/acciones pueden alinearse horizontalmente;
- Admin puede mantener tablas, pero requiere contenedor con overflow horizontal explícito y foco/scroll accesible; su rediseño completo no pertenece a esta SPEC.

### 1280 px o más (`xl`/desktop ancho)

- el shell ocupa todo el viewport;
- el contenido se centra mediante `PageContainer`;
- catálogo puede usar cuatro columnas;
- no aumentar indefinidamente longitud de línea ni espacios internos.

### Matriz obligatoria

Validar al menos 320, 375, 768, 1024 y 1440 px, en light y dark para el piloto. Añadir zoom de navegador al 200 % en 375/768 o la combinación que revele antes los problemas de reflow.

## 12. Accesibilidad mínima

1. Focus visible de al menos 2 px, con contraste y offset perceptibles en light/dark.
2. Contraste WCAG AA: 4.5:1 para texto normal y 3:1 para texto grande/controles gráficos relevantes.
3. Targets táctiles mínimos de 44 × 44 px para acciones principales e iconos aislados en móvil.
4. Inputs con label programático; placeholder solo como ejemplo.
5. IconButton siempre con `aria-label` descriptivo.
6. Disabled real, legible y no comunicado solo por color.
7. Menús, modales y acciones completas operables con teclado; foco inicial, escape y retorno de foco verificables.
8. Loading y resultados asíncronos relevantes anunciados con `role="status"`/`aria-live` sin anuncios repetitivos.
9. Error asociado al campo o región correspondiente.
10. Zoom 200 %, texto largo y nombres/email extensos sin corte de información esencial ni scroll horizontal de página.
11. Imágenes informativas con texto alternativo; decorativas con alt vacío.
12. Respetar `prefers-reduced-motion`; hover/animación nunca es la única señal de interacción.

## 13. Estrategia incremental de implementación

### Fase A — Theme y tokens

- completar config, paleta y tokens semánticos;
- añadir recipes/defaults de controles Chakra;
- mapear tokens actuales a los nuevos nombres durante una ventana corta de compatibilidad si evita una migración masiva;
- no cambiar todavía todas las páginas.

### Fase B — Root y layout base

- establecer reset global mínimo sin activar estilos Vite antiguos;
- crear `PageContainer`, `PageHeader` y `SectionHeader`;
- verificar shell/header/footer a ancho completo.

### Fase C — Estados y primitivas

- implementar `LoadingState`, `EmptyState`, `ErrorState`, `ProductImage` y `Price`;
- documentar props mínimas y ejemplos dentro del código o la SPEC; no instalar Storybook.

### Fase D — Piloto

- migrar `ProductCard` como único piloto visual;
- usar ProductImage, Price, tokens, estados unavailable/disabled y acciones responsive;
- montar el catálogo en PageContainer solo en la medida necesaria para validar la card, sin rediseñar filtros ni página completa.

### Fase E — Validación y decisión

- ejecutar lint/build;
- completar matriz responsive, light/dark, teclado, contraste y zoom;
- registrar problemas antes de autorizar migraciones posteriores;
- no migrar Home, ProductDetail, Cart, Checkout o Admin dentro de SPEC-004 salvo ajuste mínimo imprescindible para que el piloto sea verificable.

## 14. Componente piloto

**Piloto principal: ProductCard.**

Razones:

- concentra superficie, imagen, tipografía, precio, badges, disponibilidad, botones, hover, disabled y feedback;
- se repite en un grid responsive y revela pronto problemas de densidad;
- permite comparar contenido corto/largo, con/sin imagen, disponible/no disponible y personalizable/no personalizable;
- valida ProductImage y Price sin tocar lógica del catálogo ni checkout.

`PageContainer` se implementa como infraestructura de apoyo y se valida en la ruta de catálogo, pero no se considera un rediseño del catálogo.

Fixtures/casos visuales mínimos del piloto:

1. nombre y descripción cortos;
2. nombre largo y descripción larga;
3. sin imagen o imagen rota;
4. precio simple y, si el contrato vigente lo entrega, rango;
5. con stock, sin stock y estado disabled;
6. personalizable;
7. una y dos acciones;
8. light/dark y navegación por teclado.

## 15. Validación

### Automatizada existente

```text
frontend: npm run lint
frontend: npm run build
```

No se instalará en esta fase Storybook, Chromatic, Playwright, Cypress ni una suite pesada de regresión visual.

### Smoke visual manual

- shell, header y footer a ancho completo;
- PageContainer centrado y con gutters correctos;
- ProductCard en todos los fixtures;
- sin scroll horizontal a 320/375/768/1024/1440;
- reflow con zoom 200 %;
- light/dark sin texto o superficies ilegibles;
- imágenes sin salto severo de layout, con fallback y alt correcto;
- hover/focus/pressed/disabled/unavailable distinguibles.

### Teclado y accesibilidad

- recorrido Tab lógico y foco siempre visible;
- activar enlaces/botones con teclado;
- modal o feedback del carrito no atrapa ni pierde foco;
- contraste revisado con herramienta del navegador;
- contenido largo no oculta la acción principal.

## 16. Criterios de aceptación

- [x] **CA-01.** Chakra Theme es la única fuente de tokens visuales y no se crea un sistema paralelo.
- [x] **CA-02.** El theme declara explícitamente configuración light/dark y una paleta `brand` completa.
- [x] **CA-03.** Existen tokens semánticos para fondos, texto, bordes, acciones, foco y estados.
- [x] **CA-04.** Tipografía, spacing, radii, shadows y z-index tienen reglas documentadas y reutilizables.
- [x] **CA-05.** Se conservan los breakpoints Chakra salvo evidencia y se valida 320/375/768/1024/1440 px.
- [x] **CA-06.** No quedan referencias a tokens inexistentes dentro de los componentes migrados.
- [x] **CA-07.** El CSS global activo es mínimo y no fija max-width, padding ni alineación global en `#root`.
- [x] **CA-08.** El shell puede ocupar todo el viewport y el ancho de contenido depende de PageContainer.
- [x] **CA-09.** PageContainer ofrece gutters responsive y ancho máximo coherente sin imponer estilos de página.
- [x] **CA-10.** PageHeader y SectionHeader comparten jerarquía y adaptan acciones en móvil.
- [x] **CA-11.** Button, Input, Select y Textarea comparten focus, radio, estados y tamaños mediante theme recipes.
- [x] **CA-12.** Card, Badge y Alert usan superficies/estados compatibles con light/dark.
- [x] **CA-13.** LoadingState, EmptyState y ErrorState sustituyen patrones ad hoc en el piloto o su contenedor representativo.
- [x] **CA-14.** ProductImage aplica ratio, object-fit, espacio reservado, alt, lazy loading y fallback seguro.
- [x] **CA-15.** Price presenta precio/rango de forma consistente sin asumir autoridad de negocio.
- [x] **CA-16.** ProductCard usa exclusivamente la base visual nueva sin alterar su lógica de producto/carrito.
- [x] **CA-17.** ProductCard funciona con contenido largo, imagen rota, sin stock, personalización y una/dos acciones.
- [x] **CA-18.** Las acciones de ProductCard no se comprimen ni provocan overflow a 320 y 375 px.
- [x] **CA-19.** Loading, error, empty, success, disabled y unavailable tienen patrones semánticos documentados.
- [x] **CA-20.** Focus visible, contraste AA, labels, targets táctiles y teclado cumplen las reglas mínimas definidas.
- [x] **CA-21.** El piloto conserva legibilidad y reflow con zoom 200 % y contenido largo.
- [x] **CA-22.** El piloto pasa smoke visual en light y dark sin depender solo del color.
- [x] **CA-23.** `npm run lint` y `npm run build` pasan sin errores nuevos.
- [x] **CA-24.** No se modifica lógica de negocio, backend, pagos, shipping, carrito, variantes ni integraciones dormidas.
- [x] **CA-25.** La migración se limita a foundation, primitivas y ProductCard/PageContainer; no rediseña páginas completas.
- [x] **CA-26.** No se añade una nueva librería UI ni infraestructura pesada de testing visual.

**Total: 26 criterios de aceptación.**

## 17. Riesgos y mitigaciones

1. **Activar CSS dormido:** importar `App.css`/`index.css` sin limpiarlos puede cambiar todo el layout y color mode. Mitigar creando primero el reset mínimo.
2. **Cambio visual masivo:** reemplazar colores globalmente dificulta verificar regresiones. Mitigar con alias temporales y piloto único.
3. **Dark mode incompleto:** superficies claras hardcoded pueden perder contraste. Mitigar exigiendo pares semánticos light/dark y smoke del piloto.
4. **Wrappers excesivos:** envolver todos los controles crea APIs redundantes. Mitigar configurando Chakra desde theme y extrayendo solo estructura repetida.
5. **ProductCard funcional:** un rediseño podría alterar navegación, scroll restoration o alta al carrito. Mitigar conservando handlers/contratos y probando solo presentación.
6. **Ratios de imagen:** un ratio único puede perjudicar ciertos productos. Mitigar usando variantes explícitas de ProductImage y fixtures reales.
7. **Responsive Admin/Checkout:** intentar resolver su densidad aquí ampliaría el alcance. Mitigar registrándolo para SPEC posteriores y limitando foundation.
8. **Bundle:** la nueva capa podría añadir imports innecesarios. Mitigar reutilizando Chakra ya instalado y evitando librerías nuevas.

## 18. Fuera de alcance

- lógica de negocio, APIs o backend;
- checkout seguro, pricing, shipping o pagos manuales;
- carrito, variantes, personalización o contratos de pedido;
- AliExpress, dropshipping o MONEI;
- rediseño completo de Home, catálogo, ProductDetail, Cart, Checkout o Admin;
- reemplazar contenido simulado de Home;
- nueva galería, zoom o miniaturas de producto;
- tablas/cards responsive definitivas de Admin;
- checkout por pasos;
- navegación global nueva;
- animaciones complejas;
- nueva librería UI, iconografía o fuente web;
- Storybook, E2E o servicio de regresión visual;
- limpieza general de código comentado;
- cambio funcional del feedback de carrito fuera de lo imprescindible para validar estados del piloto.

## 19. Recomendación posterior

Tras validar la foundation y el piloto, crear SPECs separadas y priorizadas para:

1. shell/navegación y catálogo;
2. ProductDetail e imágenes/galería;
3. Cart y Checkout responsive;
4. Admin responsive y reducción de densidad;
5. Home conectada al catálogo real.

Ninguna de estas migraciones forma parte de SPEC-004.
