# SPEC-021A — Hybrid Shipping Methods & Parcel Profiles

## Estado actual

`POST /api/shipping/quote` resuelve líneas y cupón en backend y devuelve un único quote. `shipping.service.js` dispone de geocoding ORS/Nominatim, routing ORS, caché en memoria, bandas opcionales por ENV y fallback a las reglas zonales nacionales existentes. `createOrder` recalcula el mismo quote y persiste precio, zona y plazo. Checkout no selecciona método: consume directamente el quote único.

## Qué se reutiliza

- autoridad backend sobre productos, subtotal, cupón, shipping y total;
- normalización zonal existente como fallback legacy;
- ORS para distancia por carretera y Nominatim como fallback de geocoding;
- caché de ruta y rate limit público existente;
- patrón persistente de `PaymentSettings` para configuración comercial versionada;
- snapshot de shipping en `Order` y fórmula subtotal − descuento + envío.

De MixSabor se reutilizan solo conceptos: separar routing de pricing, origen explícito, distancia por carretera, caché y tramos declarativos. No se copian origen, tarifas, umbrales ni código.

## Qué cambia

1. El contrato principal devuelve `methods[]` con `pickup-free`, `local-urgent` y `parcel-standard`.
2. Checkout selecciona exclusivamente métodos disponibles y envía `shippingMethodId`.
3. `createOrder` recalcula el método seleccionado y congela un snapshot ampliado.
4. Reglas comerciales pasan a `ShippingSettings`; ENV queda para ORS y compatibilidad operativa.
5. Producto incorpora `shippingProfile` nullable.
6. `PackagingPlanner` produce parcels conservadores solo con perfiles completos.
7. Producto incorpora `fulfillmentProfile` nullable y Order congela un snapshot conservador de preparación separado de la entrega.

## Qué permanece provisional

- `PARCEL_STANDARD` no tiene proveedor ni tarifas reales: permanece no disponible con `rates_not_configured` o `provider_unavailable`.
- No se inventan pesos, dimensiones, cajas, divisor volumétrico ni tarifas.
- Las reglas zonales nacionales actuales permanecen como adapter legacy/fallback seguro, no como tarifa de paquetería.
- No se migran ni recalculan pedidos históricos.

## Contrato multimétodo

Cada método expone `methodId`, `type`, `label`, `enabled`, `available`, `serviceLevel`, `reason` y, solo si es cotizable, `quote`. El quote contiene `amount`, `currency`, `estimatedDays`, `quoteSource` y datos específicos no secretos.

`PICKUP_FREE` depende únicamente de su configuración comercial, cuesta cero y no requiere dirección del cliente, routing, bandas ni perfil de paquetería. Si está activo exige dirección de recogida configurada.

`LOCAL_URGENT` exige configuración válida, cobertura declarativa y banda aplicable. Usa ruta por carretera. Ante fallo externo solo usa fallback zonal si la configuración lo permite y la cobertura postal/provincial/municipal ya demuestra que el destino es local; nunca inventa kilómetros.

ORS se configura en backend mediante `OPENROUTESERVICE_API_KEY` y `OPENROUTESERVICE_BASE_URL`. Un quote obtenido por routing incluye `distanceKm` y un snapshot informativo de la banda aplicada. El fallback declara `quoteSource: zone_fallback`, mantiene `distanceKm: null` y no declara banda.

La base ORS se interpreta como raíz del API aunque esté configurada con un sufijo legacy `/v2`; geocoding usa `/geocode/search` y routing `/v2/directions/driving-car/geojson`, sin duplicar segmentos. Los fallos distinguen configuración, geocoding de origen/destino, routing y respuesta inválida. En desarrollo el fallback puede declarar `fallbackReason` y emitir logs sanitizados sin API key ni cabeceras. La caché conserva únicamente distancias válidas y su clave incluye origen, destino y configuración ORS resuelta.

`PARCEL_STANDARD` usa `PackagingPlanner` y un adapter conceptual `quoteParcel({ destination, parcels, serviceLevel })`. Sin perfiles completos o provider configurado devuelve indisponibilidad explícita.

## Configuración

`ShippingSettings` es independiente de pagos y contiene:

- `pickupFree`: enabled, label, pickupAddress, instructions y availabilityText;
- `localUrgent`: enabled, label, originAddress, maxDistanceKm, postalCodes, provinces, municipalities, bands y freeFrom;
- `parcelStandard`: enabled, label, configured, serviceLevel;
- versión del documento.

Las bandas se ordenan y no se solapan; `minKm < maxKm`, amount no negativo y origen obligatorio al habilitar local urgent. El seed es idempotente y no sobrescribe documentos existentes.

## Perfiles y packaging

`Product.shippingProfile` conserva valores nullable: `weightGrams`, dimensiones, `fragile`, `stackable`, `shippingClass`. Un perfil incompleto produce `incomplete_profile`. Una implementación inicial crea un parcel por unidad con exactamente las medidas verificadas del producto; no suma dimensiones ni consolida cajas. No se define peso volumétrico sin provider/service.

`Product.fulfillmentProfile` declara si requiere preparación y, opcionalmente, un rango entero no negativo de días. El plazo del pedido es el máximo de los mínimos y máximos configurados, nunca la suma. Si cualquier producto requiere preparación sin rango completo, el snapshot queda `pending_confirmation` y no inventa días. Este snapshot se conserva en `Order.orderPreparation` con referencias por item.

## API y compatibilidad

- `POST /api/shipping/quote`: añade `methods[]` y pricing autoritativo.
- `GET /api/shipping/admin/settings`: admin.
- `PUT /api/shipping/admin/settings`: admin.

Se mantiene temporalmente `quote` como adapter del contrato único anterior. Pedidos de clientes nuevos usan `shippingMethodId`; la ausencia mantiene el cálculo legacy únicamente para compatibilidad transitoria.

## Checkout y errores

Checkout renderiza los métodos recibidos, impide seleccionar indisponibles y diferencia `invalid_address`, `outside_coverage`, `service_disabled`, `rates_not_configured`, `incomplete_profile`, `provider_unavailable`, `routing_unavailable` y `no_shipping_method`.

Pickup se puede cotizar y seleccionar sin dirección de entrega completa. Checkout presenta preparación y entrega por separado y conserva cualquier dirección ya introducida al cambiar de método.

Checkout presenta primero el método. Solo muestra y exige dirección para local urgent o parcel. Las cotizaciones dependientes de dirección requieren calle, código postal, localidad, provincia y país completos; se lanzan con debounce, cancelación de la petición anterior y deduplicación por dirección normalizada. Pickup no provoca routing.

## Inmutabilidad y seguridad

El navegador no decide importe. Order congela método, label, type, amount, fuente, provider/service/plazo y parcels cuando existan. Para local urgent conserva además distancia, banda aplicada y destino normalizado. Cambios posteriores en settings no alteran pedidos. ORS key y futuras credenciales nunca se exponen. Shipping no conoce DesignDocument ni artefactos productivos.

## Criterios de aceptación

- Cotización multimétodo y adapter legacy coexisten.
- Pickup cuesta cero, no invoca routing y se puede usar sin dirección de entrega.
- Local urgent cubre routing, caché, bandas, cobertura, fallback seguro, free shipping y disabled.
- Parcel cubre profile completo/incompleto, planner y ausencia de provider sin tarifa ficticia.
- Backend ignora amounts del cliente y rechaza métodos forzados no disponibles.
- Checkout selecciona método backend y conserva total autoritativo.
- Admin carga, valida y persiste settings.
- Order conserva snapshot tras cambiar settings.
- Order conserva snapshot de preparación y datos específicos de pickup.
- Tests específicos, backend check, frontend lint/build y `git diff --check` pasan.

## Fuera de alcance

Integración real con agencias, compra de etiquetas, tracking de transportista, restricciones futuras de recogida, productos digitales, optimización de cajas, divisores volumétricos, migración histórica y cambios de política de cupones.
