import AdminDashboard from "@/components/AdminDashboard";
import { isAuthenticatedAdmin } from "@/lib/admin-auth";
import { getAdminMetrics, getAdminProducts, RepositoryConfigurationError } from "@/lib/product-repository";
import { redirect } from "next/navigation";
import { Suspense } from "react";

export const metadata = {
  title: "Panel de administración | Nexora",
  robots: { index: false, follow: false },
};

function AdminFallback() {
  return <main className="admin-shell"><header className="admin-topbar"><span className="admin-wordmark">NEXORA <span>ADMIN</span></span></header><div className="admin-main"><p className="admin-empty">Cargando el panel de Nexora…</p></div></main>;
}

export default function AdminPage() {
  return <Suspense fallback={<AdminFallback />}><AdminDashboardPage /></Suspense>;
}

async function AdminDashboardPage() {
  if (!(await isAuthenticatedAdmin())) redirect("/admin/login");

  let products = [];
  let metrics = null;
  let setupMessage = "";
  try {
    [products, metrics] = await Promise.all([getAdminProducts(), getAdminMetrics()]);
  } catch (error) {
    setupMessage = error instanceof RepositoryConfigurationError
      ? error.message
      : "No pudimos conectar con Google Sheets. Revisa el acceso del servicio y vuelve a cargar esta página.";
  }

  return <AdminDashboard initialProducts={products} initialMetrics={metrics} setupMessage={setupMessage} />;
}
