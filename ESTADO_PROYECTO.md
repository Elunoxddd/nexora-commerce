# Nexora Commerce — estado del proyecto

Actualizado: 16 de noviembre de 2026.

## Estado actual

- La tienda conserva la dirección editorial cálida, el catálogo mobile-first, el modal de detalle y el carrito con envío del pedido a WhatsApp.
- `npm run build` completa el build de producción y genera `/`, `/admin`, `/admin/login`, `/api/checkout`, `/api/products`, rutas de administración y analítica.
- `npm test`: 10 casos de validación pasan. `npm run lint` y `npx tsc --noEmit` pasan.
- El checkout recalcula precios en el servidor y valida IDs, cantidades, disponibilidad e inventario cuando la hoja contiene existencias. El carrito del navegador guarda solo IDs y cantidades.
- `/admin` tiene login, sesión AES-GCM en cookie HTTP-only, catálogo CRUD, carga de imágenes firmada a Cloudinary, métricas y revalidación del catálogo.
- La conexión de Google Sheets y Cloudinary está implementada, pero **requiere credenciales de cada servicio** para activar el CRUD y la analítica. Sin Sheets, la tienda usa los productos locales de `src/data/products.json`; las operaciones de administración quedan deshabilitadas.

## Configuración necesaria para operar el panel

1. Copia `.env.example` a `.env.local`. El archivo real está excluido de Git.
2. En Google Cloud, habilita Google Sheets API, crea una cuenta de servicio y comparte con su correo la hoja de cálculo con permiso de editor. Configura `GOOGLE_SHEETS_ID`, `GOOGLE_SERVICE_ACCOUNT_EMAIL` y `GOOGLE_PRIVATE_KEY`. La clave privada va solo en el servidor; si se guarda como una línea en el entorno, conserva los saltos con `\n`.
3. Crea dos pestañas en esa hoja: `Products` y `Analytics`. Nexora escribe las cabeceras correctas en cada pestaña si está vacía. La pestaña `Products` maneja ID, nombre, descripción, precio, precio anterior, costo interno, categoría, stock, etiqueta, imagen, orden, disponibilidad, envío, garantía, beneficios y especificaciones.
4. Configura Cloudinary con `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY` y `CLOUDINARY_API_SECRET`. El nombre de nube debe estar disponible al ejecutar el build para que Next permita optimizar las imágenes remotas. Las cargas aceptan JPEG, PNG y WebP de hasta 5 MB, comprueban firma y MIME y se sirven como WebP con calidad automática.
5. Genera la clave del administrador desde una terminal interactiva con `node scripts/hash-admin-password.mjs`. Copia la línea completa que imprime a `.env.local` y reinicia Next.js. El hash usa separadores `:` para que Next.js no interprete los `$` como expansión de variables de entorno. Los hashes antiguos con `$` siguen siendo compatibles. Genera `ADMIN_SESSION_SECRET` con `openssl rand -base64 32`. No uses `NEXT_PUBLIC_` para ninguna de estas credenciales.
6. `NEXT_PUBLIC_WHATSAPP_NUMBER` es el número comercial que los visitantes abren en WhatsApp; es información pública, no una credencial.
7. Ejecuta `npm run build` después de configurar el nombre de nube de Cloudinary y reinicia el servidor.
8. Ingresa a `/admin`. Si la pestaña `Products` está vacía, usa **Importar catálogo actual**. Los productos importados conservan stock desconocido y piden confirmación de disponibilidad; registra existencias reales en el panel antes de depender de la validación de inventario. Los productos nuevos sí requieren definir stock.

## Cambios de esta entrega

### Configuración, protección y documentación

- `next.config.ts`: source maps de producción desactivados; elimina `X-Powered-By`; añade HSTS en producción, `X-Frame-Options`, `nosniff`, política de referrer y permisos; permite solo la ruta de imágenes Cloudinary configurada; fija límites de cuerpo y una compilación Webpack reproducible en este entorno.
- `src/proxy.js`: CSP con nonce, protección de rutas ocultas y validación de sesión para `/admin` y `/api/admin`. Next 16 renombró el convenio `middleware` a `proxy`.
- `.gitignore` y `.env.example`: excluyen credenciales locales y ofrecen una plantilla sin secretos.
- `src/lib/admin-session.mjs`, `src/lib/admin-auth.js`, `src/app/api/admin/login/route.js`, `src/app/api/admin/logout/route.js`: verificación de clave con scrypt, sesión cifrada AES-GCM con caducidad de 8 horas, cookie `HttpOnly`, `SameSite=Strict` y `Secure` en producción.
- `src/lib/admin-api.js`, `src/lib/rate-limit.js`: controles de origen, respuestas sin caché y límites por proceso.
- `src/app/api/checkout/route.js` y `src/lib/checkout.mjs`: validación server-side del pedido y sanitización de campos antes de preparar el enlace de WhatsApp.
- `src/app/api/admin/products/route.js`, `src/app/api/admin/seed/route.js`: CRUD con sesión y revalidación inmediata de tienda y panel.
- `src/app/api/admin/images/route.js`, `src/lib/cloudinary.js`: carga autenticada, firma del lado servidor, comprobación de JPEG/PNG/WebP y borrado de imágenes sustituidas.
- `src/app/api/analytics/route.js`, `src/lib/analytics-client.js`: eventos ligeros de vista, carrito y clics a WhatsApp; no guardan datos personales.
- `SECURITY.md`: límites de seguridad y operación del rate limit.

### Datos, panel y tienda

- `src/lib/product-repository.js`: repositorio de Google Sheets y DTO público que retira costo e ID privado de Cloudinary; usa el catálogo local como fallback antes de configurar Sheets.
- `src/lib/product-validation.mjs`: valida catálogo, precios, descuentos, stock, textos e imágenes antes de escribir.
- `src/app/admin/page.js`, `src/app/admin/login/page.js`, `src/components/AdminDashboard.js`, `src/components/AdminLoginForm.js`: panel adaptable con métricas, listado, formulario CRUD y login.
- `src/app/api/products/route.js`, `src/app/page.js`: catálogo consultado en tiempo de petición para reflejar cambios de Sheets sin congelarlos en el build.
- `src/context/CartContext.js`, `src/components/CartDrawer.js`, `src/components/ProductCard.js`, `src/components/Navbar.js`: carrito basado en IDs, precios públicos de catálogo, flujo a WhatsApp y eventos de conversión.
- `src/app/globals.css`: estilos mobile-first de la tienda y del panel.
- `src/lib/whatsapp.js`: enlace de contacto con el número público Nexora.
- `scripts/hash-admin-password.mjs`, `src/lib/admin-password.mjs`: generan/verifican con una única implementación scrypt; el formato nuevo evita la expansión de `$` en dotenv y conserva compatibilidad con hashes existentes.
- `tests/checkout.test.mjs`, `tests/admin-security.test.mjs`, `package.json`: pruebas de seguridad/checkout y scripts `test` y `build`.

## Modelo de datos y límites conocidos

## Corrección de acceso de administrador — 16 de noviembre de 2026

- La causa probable del rechazo era el formato `scrypt$...`: Next.js expande referencias `$VARIABLE` dentro de archivos `.env*`, así que el hash podía cambiar al cargarse. El nuevo formato `scrypt:...` elimina esa ambigüedad.
- El verificador acepta tanto el formato nuevo como el anterior. También tolera que se pegue la línea completa `ADMIN_PASSWORD_HASH="..."`.
- El generador y el login ahora usan los mismos parámetros y el mismo módulo. Tras regenerar el hash, reinicia el servidor de desarrollo; en producción, reinicia la instancia que lee las variables.
- `node scripts/check-admin-password.mjs` comprueba interactivamente si la clave coincide con el hash cargado desde `.env.local`, sin mostrar ninguno de los dos valores. Si coincide pero el formulario rechaza el acceso, reinicia Next.js para que el proceso recoja el archivo actualizado.
- Verificación realizada con una clave de prueba: coincidencia correcta, clave distinta rechazada, línea de entorno copiada aceptada y compatibilidad legacy comprobada.

La fuente de inicio es `src/data/products.json`: tres productos con nombre, precio, imagen WebP, beneficios, disponibilidad, envío, garantía y especificaciones. Categoría se deriva para esos datos semilla; stock y costo no estaban definidos. Al copiar a Sheets, el stock desconocido no se convierte en una cifra inventada.

Google Sheets sirve como repositorio auditable para un catálogo pequeño y volúmenes iniciales. La analítica agrega una fila por evento, por lo que debe archivarse o migrarse si crece mucho. Las interfaces de repositorio permiten cambiar después a PostgreSQL/Supabase sin acoplar los componentes al proveedor.

El rate limit actual es una defensa básica en memoria por instancia: no reemplaza un límite global en CDN/WAF en despliegues con réplicas. La tienda y las imágenes son públicas por diseño; no es posible impedir que alguien inspeccione los datos o JavaScript que el navegador necesita descargar. La validación de pedido sí vuelve a la fuente del servidor.

## Actualización UX de tienda pública — 16 de noviembre de 2026

- `src/context/CartContext.js`: agregar un producto ya no abre el carrito; conserva almacenamiento local por IDs, cantidades y datos de catálogo.
- `src/components/Navbar.js`: el carrito se abre desde un botón explícito en la navegación; el contador tiene feedback breve al cambiar. `src/components/CartDrawer.js` conserva el checkout validado por servidor y ya no monta un botón flotante duplicado.
- `src/components/ProductCard.js` y `src/components/ProductDetailsModal.js`: feedback temporal “Agregado ✓” al añadir, incluido el flujo desde detalle; radios y controles de detalle más precisos.
- `src/components/FAQ.js`, `src/app/page.js`: acordeón accesible con detalles de cobertura y tiempos, garantía/cambios, confirmación y pago por WhatsApp, y seguridad de compra; se muestra antes del footer.
- `src/app/globals.css`: acabado de tienda con radios de 4–9 px, bordes sutiles, respuesta hover/active de movimiento corto y transiciones suaves, contador animado y diseño FAQ adaptable. Se respetan preferencias de movimiento reducido ya configuradas.
- La arquitectura de seguridad, `src/proxy.js`, las rutas de administración, el checkout server-side y las integraciones Google Sheets/Cloudinary no se modificaron.
- Estado: tienda pública y flujo visual listos; FAQ usa `<details>` nativo para teclado y sin JavaScript adicional. Validación de esta entrega: `npm test` y `npm run build`.

## Ajuste de presentación pública — 16 de noviembre de 2026

- `src/components/Navbar.js` y `src/app/globals.css`: la navegación usa contenedores con flex explícito, espacio no envolvente, botón de carrito con contador y contacto secundario delineado; evita que las acciones se apilen y fija radios de 6 px en controles públicos.
- `src/components/FAQ.js` y `src/app/globals.css`: cada pregunta se presenta como fila/tarjeta con borde, margen, marcador propio `+ / −`, ocultación del marcador nativo y expansión animada por CSS; se centra y adapta a móvil.
- `src/app/page.js`: los datos de tienda se cargan bajo `Suspense` para conservar el prerender del shell; Hero y catálogo comparten la misma lectura de productos.
- `src/components/Hero.js`: en la actualización posterior, la imagen dinámica de catálogo se sustituyó por una composición editorial fija de Nexora.
- `src/app/globals.css`: altura del Hero limitada al viewport en escritorio y altura intrínseca en móvil, para evitar recortar contenido o CTAs; transiciones de hover/active y radios compactos en controles de la tienda.
- El carrito se sigue abriendo solo desde `openCart` del Navbar; `addToCart` únicamente actualiza el estado del carrito. Seguridad, checkout validado en servidor, panel, Sheets y Cloudinary permanecen sin cambios.
- Validación final: `npm test`, `npm run lint`, `npx tsc --noEmit` y `npm run build` completaron correctamente.

## Ajuste de Hero y botón Agregar — 16 de noviembre de 2026

- `src/components/Hero.js`: retiró `next/image` y cualquier dependencia del catálogo. El lado derecho pasó a una composición CSS fija con fondo crema/salvia, bloque verde, monograma Nexora y señales de envío/pago/atención; en el ajuste posterior se quitó la tarjeta flotante.
- `src/app/page.js`: Hero y su fallback usan la misma pieza editorial; la sección de catálogo tiene el ancla `productos` y conserva `catalogo` como alias para enlaces existentes.
- `src/components/ProductCard.js`: el icono de bolsa tiene una clase propia para su movimiento al hover; el estado existente “Agregado ✓” y la acción de agregar se conservan.
- `src/app/globals.css`: la acción “Agregar” ahora se eleva 2 px, cambia a verde profundo, muestra sombra `0 8px 20px rgba(38, 65, 54, 0.22)` y mueve el icono; al presionar escala a `.98`. Usa `cubic-bezier(.22, 1, .36, 1)` y mantiene el estilo de confirmación.
- `addToCart` no abre el drawer: el único `openCart` enlazado a interfaz sigue siendo el botón del Navbar.
- Estado y validación: `npm run build` compiló sin errores; pruebas, lint y TypeScript también pasaron en esta entrega.

## Refinamiento de Hero y microinteracciones — 16 de noviembre de 2026

- `src/components/Hero.js`: eliminó la tarjeta flotante redundante. La etiqueta lima y el titular ahora comparten el bloque verde, con el monograma separado en el marco y los indicadores de confianza en una línea inferior despejada.
- `src/app/globals.css`: reorganizó tamaños, padding, márgenes y líneas del panel; añadió un movimiento de marco/monograma al hover en dispositivos con puntero.
- `src/app/globals.css`: implementó entrada escalonada para badge, título, subtítulo, CTA, prueba social y gráfico del Hero con fade y desplazamiento de 14 px. `prefers-reduced-motion` elimina estas animaciones.
- `src/app/globals.css`: enriqueció hover/active de CTA, carrito, contacto, detalles y checkout con elevación corta, sombra cálida, color bosque y presión a escala `.98`; el icono de flecha del CTA se mueve en hover.
- El Hero mantiene el enlace principal a productos y no depende de imágenes. Build y pruebas de esta entrega completados.
