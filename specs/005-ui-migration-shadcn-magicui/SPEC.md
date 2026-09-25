# SPEC-005 — Migración UI a shadcn, Base UI y Magic UI

## Estado

**Estado:** implementada y validada el 25 de septiembre de 2026.

## Objetivo

Retirar Chakra UI del frontend y establecer una foundation `Premium Compact Commerce` basada en Tailwind CSS, shadcn/ui, Base UI, Magic UI y Lucide Icons, preservando contratos y comportamiento de negocio.

## Arquitectura visual objetivo

```text
Tailwind CSS + tokens CSS
├── light/dark mediante una única clase de tema
├── shadcn/ui sobre Base UI
├── Lucide Icons
├── foundation propia
└── Magic UI limitado a microinteracciones justificadas
```

Los componentes reutilizables viven en `src/components/ui`; pages y componentes de negocio conservan su ubicación actual.

## Dependencias

- Tailwind CSS y plugin oficial para Vite.
- shadcn/ui y utilidades de composición de clases.
- Base UI como capa accesible de primitives.
- Lucide React para iconografía.
- Magic UI incorporado solo mediante componentes fuente realmente usados.

## Estrategia de migración

1. Configurar Tailwind, aliases y tokens CSS.
2. Crear primitives shadcn/Base UI requeridos.
3. Migrar la foundation de SPEC-004 y `ProductCard`.
4. Migrar shell y consumidores Chakra de forma mecánica y localizada.
5. Retirar provider, hooks y dependencias Chakra únicamente al quedar sin consumidores.
6. validar lint, build, responsive, dark mode y búsquedas finales.

## Componentes migrados

- Foundation: PageContainer, PageHeader, SectionHeader, estados, ProductImage y Price.
- Primitives: Button, Input, Select, Textarea, Card, Badge, Alert, Dialog, Sheet, Dropdown, Tooltip y Skeleton.
- Piloto visual: ProductCard.
- Shell mínimo y consumidores necesarios para compilar sin Chakra.

## Criterios de aceptación

- [x] **CA-01.** Tailwind funciona sobre Vite con tokens propios.
- [x] **CA-02.** shadcn/ui funciona con alias y estructura del proyecto.
- [x] **CA-03.** Base UI está configurado como primitive layer.
- [x] **CA-04.** Lucide Icons funciona y sustituye iconos Chakra activos.
- [x] **CA-05.** Magic UI queda disponible de forma selectiva, sin catálogo completo ni efectos pesados.
- [x] **CA-06.** Dark mode funciona con una única fuente de estado.
- [x] **CA-07.** Tokens y densidad `Premium Compact Commerce` están definidos.
- [x] **CA-08.** La foundation propia está migrada fuera de Chakra.
- [x] **CA-09.** ProductCard está migrado y conserva su comportamiento funcional.
- [x] **CA-10.** Shell, navegación móvil y theme toggle funcionan sin Chakra.
- [x] **CA-11.** La aplicación compila y mantiene sus flujos existentes.
- [x] **CA-12.** Se valida 320, 375, 768, 1024 y 1440 sin overflow horizontal.
- [x] **CA-13.** No quedan imports, providers ni hooks Chakra activos en código productivo.
- [x] **CA-14.** Chakra y dependencias exclusivas se eliminan al quedar sin consumidores.
- [x] **CA-15.** No cambia lógica de negocio, contratos API ni backend.
- [x] **CA-16.** `npm run lint` finaliza correctamente.
- [x] **CA-17.** `npm run build` finaliza correctamente.

## Fuera de alcance

Backend, APIs, modelos, pagos, shipping, carrito, variantes, pedidos, integraciones dormidas, nuevas funcionalidades y rediseños completos de Home, catálogo, detalle, checkout o Admin.

## Riesgos

- Regresiones visuales por la amplitud de consumidores Chakra.
- Cambios accidentales de semántica al migrar overlays y formularios.
- Aumento temporal del bundle si quedan dependencias duplicadas.

Se mitigan con migración por bloques, búsqueda final de imports, validación responsive y retirada de dependencias solo después de confirmar cero consumidores.

## Validación

- `npm run lint`
- `npm run build`
- búsquedas de `@chakra-ui`, `ChakraProvider`, `useColorMode` y `useColorModeValue`;
- smoke visual light/dark a 320, 375, 768, 1024 y 1440 px;
- comparación de bundle antes/después.
