# SPEC-023A — Multi-personalization quantities

## Objetivo y alcance

Comprar varias unidades de un producto personalizable en un solo pedido. Cada diseño distinto ocupa una `CartLineV2` con su propia cantidad, identidad y `DesignDocument`. Se conservan los contratos existentes de superficies, variantes, pricing, calidad, producción y stock. No se cambian envíos, pagos ni productos.

## Auditoría previa

- `ProductDetail` permite elegir cantidad hasta el stock, pero solo pasa variante, superficies y quote a Designer V2.
- Designer V2 crea un documento con `documentId` nuevo, hace handoff de artwork/assets y hoy añade siempre una línea con `quantity: 1` antes de navegar al carrito.
- `createCartLine` admite enteros positivos. La identidad de línea combina producto, variante, `customization.clientId` y superficies; `addOrMergeCartLine` suma cantidades solo si coincide la clave. Dos diseños nuevos reciben identidades distintas.
- Drafts usan IndexedDB; la referencia local actual se compone de producto/template/revisión/variante/superficies. Por ello, dos diseños consecutivos de la misma combinación podrían compartir referencia aunque sus documentos sean distintos.
- Checkout serializa cada línea por separado. `resolveAuthoritativeOrderLines` valida producto, variante, customization, superficies y cantidad, recalcula precio unitario y subtotal por línea, y suma cantidades por producto para comprobar stock. Orders decrementa esa suma de forma autoritativa.
- `Order.items[]` almacena cantidad, variante, precio, superficies y un `customizationId` por línea. Producción crea una Customization por línea; su `quantity` llega al manifest y el ZIP es por customization. Admin muestra cantidad en la personalización y los items del pedido, aunque las líneas del carrito del mismo producto todavía no se distinguen por número de diseño.

## Modelo elegido

- `same`: un diseño, una línea con `quantity = totalQuantity`.
- `different`: secuencia de `totalQuantity` diseños individuales; cada alta válida añade una línea de cantidad 1 y continúa al siguiente diseño dentro del mismo Designer. El carrito retiene los diseños completados si se abandona la secuencia. La cantidad de cualquier línea puede modificarse después; así el dominio admite A×2 + B×1 sin un array de documentos en una línea.
- Variante y superficies permanecen constantes durante una secuencia. Otra talla/color se elige de nuevo en ProductDetail.
- La secuencia transporta solo metadatos de UI (`workflowId`, `totalQuantity`, `currentIndex`) en route state; no persiste objetos Fabric ni autoridad comercial. El backend sigue validando todo el payload.
- Cada paso crea `documentId`/`clientId` nuevo. Las referencias de draft del workflow incorporan `workflowId` e índice, sin alterar las referencias históricas fuera del workflow.

## UX y seguridad

- Cantidad 1 conserva el flujo actual. Para cantidad > 1 ProductDetail ofrece "Mismo diseño para todas" y "Diseños diferentes".
- Designer muestra `Diseño n de N`, la cantidad asignada y `Guardar y continuar` hasta el último; el último añade y va al carrito. Un diseño rechazado por quality gate no avanza ni añade línea.
- El carrito presenta cada diseño del mismo producto como línea distinguible; actualizar/eliminar opera por `lineKey`.
- Ningún `clientId` ni precio enviado por frontend autoriza por sí solo un pedido. Se conservan validaciones backend de producto, documento, variante, superficies, pricing y stock agregado.

## Compatibilidad y límites

- Producto normal, personalización de una unidad y edición de línea existente mantienen su flujo.
- Se implementa diseño distinto por unidad; el cliente puede ajustar la cantidad de una línea ya creada para formar grupos. No se incorpora un editor de grupos previo ni duplicación de documentos en esta iteración.
- No se promete recuperar automáticamente una secuencia abandonada fuera de su historial de navegación. Las líneas ya añadidas y los drafts guardados permanecen disponibles; nunca se eliminan al iniciar el siguiente paso.

## Criterios de aceptación

1. Taza ×3 con mismo diseño produce una línea de cantidad 3.
2. Taza ×3 con diseños diferentes produce tres líneas y puede convertirse en A×2 + B×1 en carrito.
3. Diseños distintos no se fusionan; misma identidad de línea sí puede acumular cantidad.
4. Drafts de pasos diferentes no comparten referencia. Rejected bloquea el paso actual.
5. Pedido único conserva items separados; pricing se recalcula por línea y stock baja por unidades totales.
6. Customization y manifest conservan cantidad sin replicar archivos por unidad; Admin permite identificar cada línea, superficies, variante, cantidad y estado.
7. Tests frontend/backend dirigidos, lint, build, backend check y `git diff --check` pasan.
