🛒 Plataforma E-commerce Híbrida con Personalización y Dropshipping

Este proyecto es una plataforma e-commerce avanzada desarrollada con una arquitectura moderna y escalable, orientada a la venta de productos físicos, combinando:

Productos propios (locales) con control de stock y personalización avanzada.

Productos externos (AliExpress) integrados mediante catálogo enriquecido y modelo de dropshipping.

El sistema está diseñado para crecer progresivamente desde una tienda tradicional hasta una solución híbrida profesional, manteniendo separación clara de responsabilidades, trazabilidad de pedidos y automatización operativa.

🧱 Arquitectura tecnológica
Frontend

React + Vite

Chakra UI

Gestión de estado y componentes reutilizables

Editor visual de personalización (designer)

Backend

Node.js + Express

Arquitectura modular por dominios

Servicios desacoplados (orders, products, customization, dropshipping)

Base de datos

MongoDB

Modelos separados para:

Productos locales

Productos afiliados (AliExpress)

Pedidos

Personalizaciones

🚀 Funcionalidades principales
🛍️ Gestión de productos

CRUD completo de productos locales.

Control de stock en tiempo real.

Productos AliExpress con variantes, atributos y precios dinámicos.

Estados de publicación y disponibilidad.

🎨 Personalización avanzada

Editor visual por producto.

Diseño por caras (front / back).

Previsualización por lado.

Persistencia del diseño en MongoDB.

Generación automática de archivos ZIP listos para producción.

Asociación directa personalización ↔ pedido.

🧾 Pedidos y checkout

Carrito persistente.

Checkout para usuarios registrados e invitados.

Validación de totales en backend.

Descuento automático de stock en productos locales.

Pedidos mixtos (local + dropshipping).

📦 Dropshipping

Integración con AliExpress.

Productos externos sin stock local.

Preparación de pedidos para envío automático tras pago.

Arquitectura preparada para nuevos proveedores.

🧑‍💼 Panel de administración

Listado y filtrado de pedidos.

Visualización de personalizaciones.

Gestión de estados del pedido.

Confirmación de fechas de entrega.

Envío automático de emails.

📊 Estados del pedido

created

processing

shipped

delivered

cancelled

Cada cambio de estado puede notificar automáticamente al cliente.

🧭 Estado del proyecto

El proyecto se encuentra en una fase avanzada de desarrollo, con:

Checkout híbrido operativo.

Personalización funcional y persistente.

Catálogo AliExpress integrado.

Ajustes finos de lógica y validaciones en curso.

Preparado para despliegue en entorno productivo.

🔮 Próximas mejoras

Integración completa con pasarela de pago (webhooks).

Automatización total del dropshipping tras pago confirmado.

Métricas de ventas y pedidos.

Soporte multi-proveedor.

Escalado y optimización de rendimiento.

📌 Autor

Proyecto desarrollado como plataforma e-commerce profesional, con enfoque en arquitectura, escalabilidad y uso real en producción.

📘 2) Memoria del proyecto (descripción formal)

Este texto es adecuado para entrega académica, memoria técnica, portfolio profesional o documentación de proyecto.

1. Introducción

El presente proyecto consiste en el desarrollo de una plataforma e-commerce híbrida, orientada a la venta de productos físicos, que combina productos propios personalizables con productos externos gestionados mediante dropshipping.

El objetivo principal es construir una solución realista, escalable y preparada para producción, capaz de adaptarse a distintos modelos de negocio dentro del comercio electrónico moderno.

2. Objetivos del proyecto
Objetivo general

Desarrollar una plataforma e-commerce completa que permita gestionar productos, pedidos, personalizaciones y proveedores externos desde un único sistema centralizado.

Objetivos específicos

Implementar un sistema de venta de productos propios con control de stock.

Desarrollar un módulo de personalización avanzada de productos.

Integrar un catálogo externo (AliExpress) mediante dropshipping.

Gestionar pedidos mixtos sin interferencias entre proveedores.

Proporcionar un panel de administración funcional y claro.

Garantizar trazabilidad completa de pedidos y personalizaciones.

3. Arquitectura y tecnologías

El sistema se basa en una arquitectura cliente-servidor con separación clara de responsabilidades:

Frontend desarrollado en React con Vite y Chakra UI.

Backend desarrollado en Node.js con Express.

Base de datos MongoDB, con modelos desacoplados por dominio.

Comunicación mediante API REST.

Autenticación mediante JWT.

Esta arquitectura permite un mantenimiento sencillo, escalado progresivo y extensión futura del sistema.

4. Desarrollo por fases
Fase 1 — E-commerce base

Implementación de la tienda básica con productos propios, carrito, checkout y pedidos.

Fase 2 — Personalización de productos

Desarrollo de un editor visual, persistencia de diseños y generación automática de archivos de producción.

Fase 3 — Dropshipping y catálogo externo

Integración de productos de AliExpress, gestión de variantes y pedidos externos.

Fase 4 — Gestión avanzada de pedidos

Estados del pedido, fechas estimadas, tracking y notificaciones automáticas.

Fase 5 — Automatización y escalabilidad

Preparación para pagos, automatización logística y crecimiento del sistema.

5. Resultados obtenidos

Plataforma funcional con productos locales y externos.

Sistema de personalización persistente y trazable.

Pedidos correctamente gestionados y asociados.

Arquitectura preparada para producción real.

Código modular y mantenible.

6. Conclusiones

El proyecto demuestra la viabilidad de una plataforma e-commerce híbrida, combinando personalización avanzada y dropshipping dentro de un único sistema coherente.

La solución desarrollada es extensible, escalable y adaptable a distintos escenarios comerciales, lo que la convierte en una base sólida para un producto real.

7. Líneas futuras

Integración completa con pasarelas de pago.

Automatización total de pedidos externos.

Panel de métricas y analítica.

Soporte para múltiples proveedores y mercados.