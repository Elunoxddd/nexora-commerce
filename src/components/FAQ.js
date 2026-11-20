const questions = [
  {
    question: "¿A qué lugares de Colombia hacen envíos y cuánto tarda?",
    answer: "Llegamos a ciudades y municipios con cobertura de transportadora. El despacho toma de 24 a 48 horas hábiles después de confirmar el pago; la entrega suele tardar de 2 a 5 días hábiles desde el despacho, según el destino. Confirmamos cobertura y estimado para tu dirección por WhatsApp.",
  },
  {
    question: "¿Cómo funcionan la garantía y los cambios?",
    answer: "La garantía depende del producto y sus condiciones. Escríbenos por WhatsApp antes de comprar y te confirmamos el cubrimiento vigente. Si recibes un producto con un problema, contáctanos con tu número de pedido y fotos para revisar el caso y explicarte los pasos a seguir.",
  },
  {
    question: "¿Cómo confirmo el pedido y hago el pago?",
    answer: "Arma tu pedido en el carrito y envíalo por WhatsApp. Nuestro equipo confirma disponibilidad, valor total, cobertura y datos de entrega. El pago se realiza por anticipado con las opciones que te compartamos por el canal oficial; despachamos una vez confirmado.",
  },
  {
    question: "¿Es seguro comprar por WhatsApp?",
    answer: "Sí: el pedido se confirma directamente con el equipo Nexora y te compartimos los datos del pedido y las opciones de pago antes de que pagues. No compartas claves, códigos de verificación ni datos de acceso bancario. Si tienes dudas, vuelve a escribirnos desde el botón de contacto de esta página.",
  },
];

export default function FAQ() {
  return (
    <section className="faq-section" aria-labelledby="faq-title">
      <div className="faq-inner">
        <div className="faq-heading">
          <p className="eyebrow">Antes de hacer tu pedido</p>
          <h2 id="faq-title">Resolvamos tus dudas.</h2>
          <p>Información clara para que compres con tranquilidad.</p>
        </div>
        <div className="faq-list">
          {questions.map(({ question, answer }) => (
            <details className="faq-item" key={question}>
              <summary className="faq-summary">{question}<span aria-hidden="true" /></summary>
              <div className="faq-answer"><p>{answer}</p></div>
            </details>
          ))}
        </div>
      </div>
    </section>
  );
}
