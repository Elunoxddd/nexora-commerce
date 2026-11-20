import AdminLoginForm from "@/components/AdminLoginForm";
import Link from "next/link";

export const metadata = {
  title: "Acceso de administración | Nexora",
  robots: { index: false, follow: false },
};

export default function AdminLoginPage() {
  return (
    <main className="admin-login-page">
      <Link href="/" className="admin-wordmark">NEXORA <span>ADMIN</span></Link>
      <section className="admin-login-card">
        <p className="admin-kicker">ÁREA PRIVADA</p>
        <h1>Hola de nuevo.</h1>
        <p>Ingresa con tu clave de administración para gestionar el catálogo y revisar el movimiento de la tienda.</p>
        <AdminLoginForm />
      </section>
      <p className="admin-login-foot">Acceso exclusivo para el equipo Nexora.</p>
    </main>
  );
}
