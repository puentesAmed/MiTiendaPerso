# MiTiendaPerso — reglas para Codex

## Objetivo

MiTiendaPerso es una aplicación ecommerce.

Actualmente se encuentra en una fase de:

* auditoría;
* simplificación;
* aislamiento de integraciones antiguas;
* refactorización progresiva;
* mejora futura de UI/UX.

El desarrollo debe seguir SDD (Spec-Driven Development).

Antes de implementar una funcionalidad relevante debe existir una SPEC en `/specs`.

## Prioridades

1. Mantener estable el comportamiento existente.
2. Separar AliExpress/dropshipping del ecommerce core.
3. No borrar todavía código o datos relacionados.
4. Corregir posteriormente integridad de checkout/pedidos.
5. Normalizar contratos de producto/variante/carrito.
6. Mejorar arquitectura.
7. Mejorar UI/UX y responsive.
8. Reducir deuda técnica mediante cambios pequeños.

## AliExpress / Dropshipping

Estas capacidades quedan suspendidas.

No desarrollar nuevas funciones relacionadas con:

* AliExpress Affiliate;
* catálogo AliExpress;
* importación/enriquecimiento;
* affiliate links;
* sincronización AliExpress;
* fulfillment dropshipping;
* automatización de pedidos a proveedores.

No borrar código, modelos, campos o datos asociados salvo SPEC explícita.

El objetivo actual es encapsularlos y permitir que el ecommerce core funcione sin ellos.

## SDD

Para cualquier cambio relevante:

1. leer `AGENTS.md`;
2. localizar la SPEC activa;
3. leer únicamente código necesario;
4. implementar exclusivamente su alcance;
5. ejecutar tests específicos;
6. ejecutar build cuando corresponda;
7. detenerse al cumplir criterios de aceptación.

No ampliar el alcance por iniciativa propia.

## Ahorro de tokens

Antes de abrir archivos:

* buscar símbolos;
* buscar imports;
* buscar rutas;
* buscar funciones;
* buscar consumidores.

No inspeccionar directorios completos sin necesidad.

No releer archivos ya inspeccionados salvo necesidad.

No volcar archivos completos si bastan fragmentos.

Priorizar modificaciones localizadas.

Ejecutar primero tests específicos.

No ejecutar suites completas repetidamente si una prueba localizada es suficiente durante el desarrollo.

## Cambio mínimo

No realizar:

* renombrados masivos;
* movimientos innecesarios;
* refactors globales;
* cambios de formato global;
* sustitución de librerías;
* cambios de arquitectura fuera de SPEC;
* mejoras adicionales no solicitadas.

## Frontend

Mantener separación entre:

* pages;
* components;
* context/state;
* hooks;
* API services;
* utils;
* styles.

No introducir lógica de negocio innecesaria en componentes visuales.

## Backend

Mantener separación entre:

* routes;
* controllers;
* services;
* models;
* integrations;
* config;
* utils.

Los controllers deben coordinar HTTP.

La lógica de negocio debe desplazarse progresivamente a services solamente cuando una SPEC lo requiera.

## UI/UX

Es una prioridad futura, pero no debe mezclarse con fases de aislamiento backend salvo necesidad funcional.

Posteriormente se trabajará en:

* design tokens;
* componentes reutilizables;
* catálogo;
* ProductCard;
* galería;
* carrito;
* checkout;
* responsive;
* feedback;
* loading/error/empty states;
* accesibilidad.

El proyecto RicoSaborCubanoMiLuGui puede utilizarse como referencia conceptual cuando una SPEC lo indique explícitamente.

No copiar código automáticamente.

## Stack UI objetivo

El frontend utiliza:

* Tailwind CSS;
* shadcn/ui;
* Base UI;
* Magic UI;
* Lucide Icons.

Chakra UI queda retirado y no debe utilizarse en nuevos desarrollos.

## Dirección visual

La dirección visual es `Premium Compact Commerce`.

Priorizar densidad, jerarquía, claridad, velocidad, responsive, accesibilidad, imágenes de producto y consistencia.

Evitar padding excesivo, cards sobredimensionadas, glassmorphism indiscriminado, animaciones continuas, blur innecesario, botones gigantes, radios excesivos y efectos gratuitos.

## Magic UI

Usar Magic UI únicamente en hero, marketing, promociones, microinteracciones justificadas y detalles visuales de alto impacto.

No usar Magic UI en carrito, checkout, formularios críticos, administración ni tablas de datos.

## Seguridad

Nunca incluir:

* secretos;
* API keys;
* passwords;
* contenido real de `.env`.

## Tests

Toda corrección crítica debe tener regresión cuando sea viable.

No modificar tests para ocultar comportamiento incorrecto.

## Entrega

Al terminar una tarea devolver:

## Archivos

* creados/modificados

## Cambios

* resumen breve

## Validación

* tests/build ejecutados

## Pendiente

* únicamente bloqueos o trabajo fuera de alcance

## Regla principal

Leer poco.

Cambiar poco.

Validar lo necesario.

No ampliar alcance.

Detenerse cuando la SPEC esté cumplida.
