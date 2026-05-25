# Auditoría técnica del proyecto

Fecha: 2026-05-24 (UTC)
Alcance: revisión estática completa + checks de build/lint disponibles.

## 1. Resumen ejecutivo
- El proyecto tiene una base funcional sólida (frontend React/Vite + backend Express/Mongo) y compila en frontend sin errores de build ni lint.
- El mayor riesgo no está en “bugs puntuales”, sino en **deuda crítica por duplicación y bloques legacy comentados** dentro de archivos sensibles (orders/products/rutas), lo que incrementa probabilidad de regresiones en checkout/pedidos/pagos.
- Hay señales de seguridad/mejora necesarias: CORS permisivo por defecto, endpoint de pago de test expuesto según entorno, logs excesivos con payloads de checkout.

## 2. Riesgos críticos
1) **Archivo de pedidos con historial/duplicación masiva en el mismo fichero**  
   - Archivo: `Backend/src/controllers/orders.controller.js`  
   - Problema: contiene grandes bloques legacy comentados + implementación activa extensa en el mismo archivo.  
   - Por qué rompe: cambios futuros pueden tocar la sección equivocada, introducir divergencias o reactivar lógica antigua por error en merge.  
   - Gravedad: **crítico**.  
   - Solución: congelar contrato actual y extraer en fase controlada a módulos pequeños (`validators`, `pricing`, `stock`, `customizations`, `emails`).  
   - ¿Arreglo seguro ahora?: **sí**, pero en lotes pequeños y con tests de integración de checkout.

2) **Logs de payload completo de checkout/personalización**  
   - Archivo: `frontend/src/services/orders.service.js`  
   - Problema: `console.log` imprime payload completo (incluyendo dirección/email y personalización).  
   - Por qué rompe: riesgo de exposición de datos personales/sensibles en navegador y herramientas remotas.  
   - Gravedad: **crítico** (privacidad/compliance).  
   - Solución: eliminar logs o condicionarlos a entorno dev con redacción parcial.  
   - ¿Arreglo seguro ahora?: **sí**, cambio acotado.

3) **Creación de pago sin guard de estado de pedido/pago previo**  
   - Archivo: `Backend/src/controllers/payments.controller.js`  
   - Problema: `createMoneiPayment` no bloquea claramente creación repetida de intentos sobre pedido ya pagado/procesado.  
   - Por qué rompe: posible doble intento de pago o inconsistencias operativas.  
   - Gravedad: **crítico**.  
   - Solución: validar `order.payment.status !== 'paid'` y estado del pedido antes de crear pago.
   - ¿Arreglo seguro ahora?: **sí**, con validación previa y respuesta 409.

## 3. Problemas altos
- **CORS con fallback global `*`** en backend. Riesgo en despliegues mal configurados. (`Backend/src/server.js` + `Backend/src/config/env.js`)
- **Endpoint de test de pago** habilitado por `NODE_ENV !== production`; correcto para dev, pero requiere validación fuerte de despliegue. (`Backend/src/routes/payments.routes.js`)
- **Persistencia/cart y checkout dependen de múltiples claves localStorage** con lógica distribuida (potencial desincronización guest/auth). (`frontend/src/context/CartContext.jsx`, `frontend/src/services/guestSession.service.js`, `frontend/src/pages/Checkout/Checkout.jsx`)
- **Bloques duplicados legacy comentados** en `products.controller.js`, `customizations.routes.js`, `http.js`, `orders.service.js` que dificultan mantenimiento.

## 4. Problemas medios
- No hay script `test` en frontend y tampoco lint/test en backend (calidad automatizada insuficiente).
- Warning de bundle grande en frontend build (>500kB). Impacto: performance inicial.
- Inconsistencia de respuestas/error contracts entre controladores (algunas respuestas con `{ok:false,message}` y otras más mínimas).
- Exceso de `console.log`/`console.error` en rutas críticas de pedidos.

## 5. Problemas bajos
- README backend vacío/incompleto respecto al estado real del código.
- Naming/comentarios mezclados y código histórico comentado dentro de ficheros activos.
- Scripts seed referencian nombres que podrían no existir (`seed.js`, `seedCategories.js` en package scripts) y conviene verificar su presencia real.

## 6. Revisión por áreas
### Frontend
- Bien: `lint` y `build` pasan.
- Riesgos: logs sensibles, duplicación legacy comentada, App grande y difícil de mantener, dependencia de storage repartida.

### Backend
- Bien: separación base por rutas/controladores/modelos.
- Riesgos: controlador de pedidos monolítico, validaciones no centralizadas, CORS permisivo por fallback.

### Base de datos/modelos
- Bien: esquema `Order` incluye estados de pago/envío y campos de personalización.
- Riesgos: falta de validaciones transversales centralizadas para coherencia estado pedido/pago.

### Carrito
- Persistencia implementada (guest/auth), pero con alta complejidad en sincronización.

### Checkout/pedidos/pagos
- Flujo completo presente con shipping + pago externo + confirmación.
- Riesgo de intentos repetidos y trazabilidad por logs.

### Admin
- Funcionalmente rico (productos/pedidos/personalizaciones), pero superficie amplia sin tests automatizados.

### Productos
- Compatibilidad local + afiliado implementada.
- Riesgo de deuda por código legacy comentado en controlador.

### Notificaciones
- Hay templates/email service; falta validación automatizada de plantillas y datos mínimos.

### Seguridad
- Autenticación JWT y guard admin presentes.
- Mejorable: CORS restrictivo obligatorio, rate limiting visible, control anti-spam/contact.

### Despliegue
- Frontend con Vite scripts; backend sin lint/test/build formales.
- Riesgo de “it works on my machine” por ausencia de pipeline de checks backend.

### Documentación
- Documentación parcial/incompleta para operación segura (env vars, runbook de pagos, checklist despliegue).

## 7. Archivos que conviene tocar
1. `frontend/src/services/orders.service.js`  
   - Motivo: eliminar logs sensibles.  
   - Riesgo: bajo.  
   - Cambio recomendado: limpiar logs o proteger por `import.meta.env.DEV`.

2. `Backend/src/controllers/payments.controller.js`  
   - Motivo: evitar creación de pagos duplicados y validar estado.  
   - Riesgo: medio (flujo checkout).  
   - Cambio recomendado: precondiciones de estado + idempotencia básica.

3. `Backend/src/server.js` + `Backend/src/config/env.js`  
   - Motivo: endurecer CORS por defecto.  
   - Riesgo: medio (orígenes legítimos).  
   - Cambio recomendado: fail-fast si no hay `CORS_ORIGINS` en producción.

4. `Backend/src/controllers/orders.controller.js`  
   - Motivo: reducir riesgo operativo por monolito/legacy comentado.  
   - Riesgo: alto.  
   - Cambio recomendado: extracción por fases sin cambiar contrato API.

## 8. Archivos que NO conviene tocar todavía
- `Backend/src/controllers/orders.controller.js` (lógica crítica de checkout/pedido/personalización): solo con plan por fases + pruebas de integración.
- `frontend/src/pages/Checkout/Checkout.jsx`: sensible por cálculo/envío/pago.
- `frontend/src/context/CartContext.jsx`: sensible por persistencia y transición invitado/usuario.

## 9. Plan de corrección recomendado por fases
- **Fase 1 (crítico seguro):** eliminar logs sensibles, guard de doble pago, endurecer validaciones mínimas de estado.
- **Fase 2 (bugs importantes):** normalizar respuestas de error API, reforzar CORS/rate limits, validar edge-cases de guest checkout.
- **Fase 3 (mantenimiento):** limpieza de bloques legacy comentados y modularización ligera sin cambiar endpoints.
- **Fase 4 (UX/UI y docs):** mensajes de error más claros, documentación de despliegue/variables y runbook de pagos/admin.

## 10. Propuesta de cambios seguros
- Quitar logs de payload personal en frontend checkout service.
- Añadir validación de idempotencia simple en `createMoneiPayment`.
- Añadir checklist de despliegue seguro (CORS/ENV/pagos) en README backend.
- Añadir script de verificación mínima backend (por ejemplo `node --check` o eslint futuro) sin cambiar lógica.
