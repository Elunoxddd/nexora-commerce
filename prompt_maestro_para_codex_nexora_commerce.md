# Contexto del Proyecto: Nexora Commerce
Actúa como un Desarrollador Senior Experto en Next.js (App Router) y Tailwind CSS. 
Vamos a construir/refactorizar la landing page de "Nexora Commerce", una tienda de dropshipping en Colombia que exige pagos 100% por adelantado. Por lo tanto, el diseño debe ser ultra premium, rápido (Mobile-First) y transmitir confianza corporativa absoluta para evitar el miedo a la estafa.

## Stack Tecnológico
* Framework: Next.js (App Router)
* Estilos: Tailwind CSS
* Lenguaje: JavaScript (JSX)
* Base de datos: Ninguna (usaremos un JSON local estático)
* Backend: Ninguno (Checkout conversacional redireccionado a WhatsApp)

## Reglas de Negocio y Arquitectura
1. **Cero Pasarelas de Pago:** No hay carrito de compras. Todo botón de compra debe apuntar a la API de WhatsApp usando esta estructura dinámica:
   `https://wa.me/573000000000?text=Hola%20Nexora,%20quiero%20comprar%20el%20producto:%20[Nombre]%20por%20[Precio].%20¿Tienen%20envío%20a%20mi%20ciudad?`
2. **Paleta de Colores:** 
   * Color Principal (Hero, Logos): `#004B36` (Verde Esmeralda Corporativo)
   * Acentos y Botones de Compra: `#25D366` (Verde WhatsApp)
   * Fondos: `bg-gray-50`
3. **Catálogo Estático:** Los productos aprobados para iniciar son:
   * Mini Plancha Vapor Viajera ($89.900)
   * Depilador Recargable Yes ($84.900)
   * A118 Retro Consola Master ($119.900)
   * A072 Cosmetiquera Sin Espejo ($149.900)

## Estructura de Directorios Requerida
Debes adherirte a esta estructura dentro de `src/`:
* `app/layout.js`: Metadatos y esqueleto HTML.
* `app/page.js`: Ensamblaje de la Landing Page.
* `app/globals.css`: Directivas de Tailwind.
* `app/components/Navbar.js`: Sticky top, debe incluir un menú hamburguesa que abra un Drawer (panel lateral) usando estado de React.
* `app/components/Hero.js`: Sección principal (Fondo `#004B36`), copy enfocado en "Confianza y Seguridad", botones hacia WhatsApp y el ancla del catálogo.
* `app/components/ProductCard.js`: Tarjeta renderizada iterativamente. Debe incluir imagen (vía Next/Image), nombre, precio grande, etiqueta de "Garantía/Envío" y el botón verde de WhatsApp.
* `data/products.json`: Array con los objetos de los productos.

## Tareas a Ejecutar
Con base en este contexto, necesito que revises el estado actual del código en mi entorno y me ayudes a:
1. Crear/Refactorizar los componentes divididos (`Navbar.js`, `Hero.js`, `ProductCard.js`) aplicando las mejores prácticas de Next.js.
2. Asegurar que el diseño sea 100% responsivo usando clases utilitarias de Tailwind.
3. Optimizar la carga (prevenir Layout Shifts y asegurar que el Drawer del menú móvil funcione sin dependencias externas pesadas).

Por favor, confirma que has entendido el stack, el objetivo comercial y la estructura antes de generar el código.