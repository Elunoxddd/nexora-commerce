import "./globals.css";
import CartDrawer from "@/components/CartDrawer";
import { CartProvider } from "@/context/CartContext";

export const metadata = {
  applicationName: "Nexora",
  title: "Nexora | Tecnología y hogar, bien elegidos",
  description:
    "Productos útiles para tu casa y tu día a día. Compra acompañada por WhatsApp y recibe en cualquier lugar de Colombia.",
  openGraph: {
    title: "Nexora | Buenos hallazgos para todos los días",
    description: "Tecnología y productos para tu hogar, elegidos con intención. Envíos a toda Colombia.",
    locale: "es_CO",
    type: "website",
  },
};

export default function RootLayout({ children }) {
  return (
    <html lang="es-CO">
      <body>
        <CartProvider>
          {children}
          <CartDrawer />
        </CartProvider>
      </body>
    </html>
  );
}
