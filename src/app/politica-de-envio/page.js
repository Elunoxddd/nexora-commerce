import Link from "next/link";
import Navbar from "@/components/Navbar";
import { connection } from "next/server";
import { Suspense } from "react";

async function CurrentYear() {
  await connection();
  return new Date().getFullYear();
}

export const metadata = {
  title: "Envíos y políticas | Nexora",
  description: "Cobertura, despacho, tiempos de entrega y rastreo de pedidos Nexora en Colombia.",
};

const shippingSteps = [
  {
    number: "01",
    title: "Confirmación del pago",
    description: "Después de confirmar el pago por adelantado, validamos los datos del pedido y preparamos el despacho.",
  },
  {
    number: "02",
    title: "Preparación y despacho",
    description: "El pedido se prepara y despacha entre 24 y 48 horas hábiles después de la confirmación.",
  },
  {
    number: "03",
    title: "Guía y seguimiento",
    description: "Te compartimos el número de guía por WhatsApp para que puedas consultar el recorrido con la transportadora.",
  },
];

export default function ShippingPolicyPage() {
  return (
    <>
      <Navbar />
      <main className="min-h-[70vh] bg-gray-50 px-5 py-12 sm:px-8 sm:py-16">
        <article className="mx-auto max-w-4xl">
          <Link href="/" className="text-sm font-semibold text-[#08704e] hover:underline">← Volver a Nexora</Link>
          <header className="mt-7 rounded-3xl bg-[#004B36] px-6 py-9 text-white sm:px-10 sm:py-12">
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-emerald-200">Nexora</p>
            <h1 className="mt-3 text-3xl font-bold tracking-tight sm:text-5xl">Política de Envío</h1>
            <p className="mt-4 max-w-2xl leading-7 text-emerald-50">Enviamos tus productos a destinos de Colombia con seguimiento y acompañamiento por WhatsApp.</p>
          </header>

          <section className="mt-8 grid gap-4 sm:grid-cols-2">
            <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
              <span className="text-xs font-bold uppercase tracking-[0.14em] text-[#18845d]">Cobertura</span>
              <h2 className="mt-2 text-xl font-bold text-gray-950">Envíos nacionales</h2>
              <p className="mt-2 text-sm leading-6 text-gray-600">Realizamos envíos a ciudades y municipios de Colombia. La disponibilidad se confirma al validar tu dirección con nuestro equipo.</p>
            </div>
            <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
              <span className="text-xs font-bold uppercase tracking-[0.14em] text-[#18845d]">Tiempos estimados</span>
              <h2 className="mt-2 text-xl font-bold text-gray-950">Despacho y entrega</h2>
              <p className="mt-2 text-sm leading-6 text-gray-600"><strong>Despacho:</strong> 24 a 48 horas hábiles tras confirmar el pago. <strong>Entrega nacional:</strong> de 2 a 5 días hábiles desde el despacho, según el destino y la transportadora.</p>
            </div>
          </section>

          <section className="mt-8 rounded-2xl border border-gray-200 bg-white p-6 shadow-sm sm:p-8">
            <h2 className="text-xl font-bold text-gray-950">Así llega tu pedido</h2>
            <ol className="mt-5 space-y-5">
              {shippingSteps.map((step) => (
                <li key={step.number} className="flex gap-4">
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-emerald-50 text-sm font-bold text-[#004B36]">{step.number}</span>
                  <div><h3 className="font-semibold text-gray-900">{step.title}</h3><p className="mt-1 text-sm leading-6 text-gray-600">{step.description}</p></div>
                </li>
              ))}
            </ol>
          </section>

          <section className="mt-8 rounded-2xl border border-gray-200 bg-white p-6 shadow-sm sm:p-8">
            <h2 className="text-xl font-bold text-gray-950">Transportadoras aliadas</h2>
            <p className="mt-2 text-sm leading-6 text-gray-600">Según la cobertura y el destino, el envío puede gestionarse con alguna de estas transportadoras:</p>
            <ul className="mt-4 flex flex-wrap gap-2">
              {["Servientrega", "Inter Rapidísimo", "Envía"].map((carrier) => <li key={carrier} className="rounded-full bg-gray-100 px-4 py-2 text-sm font-semibold text-gray-700">{carrier}</li>)}
            </ul>
          </section>

          <aside className="mt-8 rounded-2xl border border-emerald-200 bg-emerald-50 p-5 text-sm leading-6 text-emerald-950">
            Los tiempos indicados son estimados y pueden variar por la ubicación, las condiciones de operación de la transportadora o situaciones externas. Para consultar cobertura o estado de tu pedido, escríbenos por WhatsApp.
          </aside>
          <Link href="/" className="mt-8 inline-flex min-h-12 items-center justify-center rounded-xl bg-[#004B36] px-6 font-semibold text-white transition hover:bg-[#006148]">Volver al catálogo</Link>
        </article>
      </main>
      <footer className="bg-[#073b2b] px-5 py-6 text-center text-sm text-emerald-100 sm:px-8">
        © <Suspense fallback=""><CurrentYear /></Suspense> Nexora. Todos los derechos reservados.
      </footer>
    </>
  );
}
