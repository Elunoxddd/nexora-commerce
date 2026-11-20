# Seguridad de Nexora

- `NEXT_PUBLIC_WHATSAPP_NUMBER` contiene el número comercial que el público necesita para abrir el chat; no es una clave ni un secreto. No pongas tokens, contraseñas ni credenciales en variables `NEXT_PUBLIC_*`.
- Los pedidos aceptan IDs y cantidades. El Route Handler vuelve a tomar nombres y precios de `src/data/products.json`, valida el total en el servidor y luego genera el enlace de WhatsApp. La disponibilidad, el costo de envío y el pago se confirman en la conversación; WhatsApp no es una pasarela ni una reserva de inventario.
- El carrito local solo guarda IDs y cantidades. Es almacenamiento controlado por el navegador y no se considera una fuente de verdad.
- `.env*` está excluido de Git; `.env.example` solo contiene el teléfono público de Nexora. Next sirve archivos desde `public/` intencionalmente y no expone listados de directorios. Las imágenes del catálogo son públicas y no requieren protección contra hotlinking.
- `src/proxy.js` añade una CSP con nonce y bloquea solicitudes directas comunes a archivos de configuración/código. `next.config.ts` añade cabeceras de seguridad y desactiva los source maps de producción.
- El limitador del endpoint es por proceso y en memoria: frena ráfagas en una instancia, pero no es un límite global duradero en despliegues serverless o con varias réplicas. Para producción, configura el rate limit también en el CDN/WAF del hosting. El catálogo público puede ser leído o copiado; el rate limit no pretende ocultarlo.
- `/admin` usa una sola clave de administrador almacenada como hash scrypt y una cookie de sesión cifrada AES-GCM con duración de ocho horas. Las rutas de escritura vuelven a verificar la sesión y el origen.
- Las imágenes entrantes se aceptan solo si coinciden MIME y firma JPEG, PNG o WebP; Cloudinary firma las cargas con la clave secreta del servidor y entrega transformaciones WebP. Los SVG no se aceptan.
- Google Sheets tiene límites de cuota y tamaño; la hoja de eventos guarda una fila por evento. Archiva o migra esos datos cuando el volumen crezca.
