# Arquitectura y Especificaciones de Desarrollo: Nexora Commerce Landing Page

## 1. Visión General del Proyecto
**Nombre del Proyecto:** Nexora Commerce
**Objetivo:** Desarrollar una landing page ultrarrápida para e-commerce (modelo dropshipping), optimizada para conversión en dispositivos móviles. 
**Modelo de Negocio:** 100% Pago por adelantado. Todo el tráfico (proveniente de campañas de pago de Facebook Ads) debe ser redirigido a WhatsApp Business para cerrar la venta mediante un enfoque conversacional.
**Despliegue:** Vercel.

## 2. Stack Tecnológico
*   **Framework:** Next.js (App Router, versión 13+).
*   **Lenguaje:** JavaScript (JSX).
*   **Estilos:** Tailwind CSS.
*   **Backend/Base de Datos:** Ninguno. Catálogo estático manejado localmente mediante un arreglo o archivo `.json`.

## 3. Estructura de Directorios (Obligatoria)
El proyecto debe seguir esta estructura exacta:

nexora-commerce/
├── public/                 
│   ├── favicon.ico         
│   ├── logo-nexora.png     
│   ├── plancha.webp        
│   ├── consola.webp        
│   └── depilador.webp      
├── src/                    
│   ├── app/                
│   │   ├── layout.js       # Configuración global, metadatos, fuentes (interfaz sin head/body manuales, usar next conventions).
│   │   ├── page.js         # Vista principal que ensambla los componentes.
│   │   └── globals.css     # Estilos globales y capas de Tailwind.
│   ├── components/         
│   │   ├── Navbar.js       # Menú superior sticky con menú hamburguesa (Drawer).
│   │   ├── Hero.js         # Sección principal verde esmeralda con CTAs.
│   │   └── ProductCard.js  # Componente iterativo para productos con redirección a WhatsApp.
│   └── data/               
│       └── products.json   # (Opcional, puede estar en línea en page.js) Datos del catálogo.

## 4. Requisitos de Diseño (UI/UX)
*   **Mobile-First:** El diseño debe estar pensado principalmente para pantallas móviles.
*   **Paleta de Colores:** 
    *   Primario (Corporativo): Verde Esmeralda `#004B36`.
    *   Acentos/Botones de Compra: Verde WhatsApp `#25D366`.
    *   Fondos secundarios: Blancos y grises claros (`gray-50`, `gray-100`).
*   **Tipografía:** Limpia, legible y moderna (Sans-serif).

## 5. Especificaciones de Componentes

### 5.1 Navbar.js
*   **Comportamiento:** `sticky` en la parte superior.
*   **Elementos:** 
    *   Botón de menú hamburguesa a la izquierda.
    *   Texto/Logo "NEXORA" centrado o a la derecha del menú.
*   **Drawer (Menú Desplegable):** Al hacer clic en la hamburguesa, se abre un panel lateral izquierdo (animado). Debe incluir enlaces de anclaje (Catálogo, Políticas) y un enlace a WhatsApp.

### 5.2 Hero.js
*   **Fondo:** Verde Esmeralda (`#004B36`).
*   **Copy Principal:** "NEXORA, TUS ENVÍOS LLEGARÁN CON LA MAYOR SEGURIDAD."
*   **Copy Secundario:** "Tecnología y Hogar seleccionados rigurosamente. Confianza corporativa en cada entrega."
*   **Botones (CTAs):**
    *   Botón Primario (Verde WhatsApp): "WhatsApp Contacto" (Redirige al chat).
    *   Botón Secundario (Blanco/Transparente): "Ver Catálogo" (Hace scroll a la sección de productos).

### 5.3 ProductCard.js
*   **Diseño:** Tarjeta limpia (`bg-white`), borde sutil, sombra suave (`shadow-md`), con un efecto `hover:shadow-xl`.
*   **Elementos:**
    *   Contenedor de imagen (usar *placeholders* con clases utilitarias de Tailwind por ahora).
    *   Etiqueta de confianza (Badge) superpuesta en la imagen (Ej. "Envío Nacional", "Compra Segura").
    *   Título del producto.
    *   Precio final (calculado con costos operativos incluidos, fuente grande).
*   **Botón de Conversión (CRÍTICO):** 
    *   Debe abarcar todo el ancho inferior de la tarjeta.
    *   Color verde WhatsApp (`#25D366`).
    *   Texto: "Comprar vía WhatsApp".
    *   **Funcionalidad:** URL dinámica de la API de WhatsApp (`wa.me`) que pre-llene un mensaje con el nombre y precio del producto.

## 6. Lógica de Conversión (Botones de WhatsApp)
Todos los botones de contacto y compra deben utilizar la API de WhatsApp.
*   **Número Base:** `573503728766` (Variable global o prop configurable).
*   **Ejemplo de Función de Redirección (en ProductCard.js):**
    ```javascript
    const buyViaWhatsApp = (productName, price) => {
      const message = `Hola Nexora, quiero comprar el producto: ${productName} por ${price}. ¿Tienen envío a mi ciudad?`;
      return `[https://wa.me/573503728766?text=$](https://wa.me/573000000000?text=$){encodeURIComponent(message)}`;
    };
    ```

## 7. Instrucciones para Codex
1.  **NO generes** código backend, APIs REST o bases de datos (SQL/NoSQL).
2.  **NO incluyas** carritos de compra (`cart states`), ni pasarelas de pago (Stripe, PayPal, etc.). El flujo termina en WhatsApp.
3.  **Genera el código** para `layout.js`, `page.js`, `globals.css` y los componentes (`Navbar.js`, `Hero.js`, `ProductCard.js`) basándote estrictamente en los requisitos anteriores y usando los componentes de Next.js (como `<Image />` para optimización).
4.  Asegúrate de que las clases de Tailwind implementen el diseño responsivo adecuadamente.
