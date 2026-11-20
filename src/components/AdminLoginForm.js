"use client";

import { useState } from "react";

export default function AdminLoginForm() {
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function submit(event) {
    event.preventDefault();
    if (isSubmitting) return;
    setIsSubmitting(true);
    setError("");
    try {
      const response = await fetch("/api/admin/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "No pudimos iniciar sesión.");
      window.location.replace("/admin");
    } catch (submissionError) {
      setError(submissionError instanceof Error ? submissionError.message : "No pudimos iniciar sesión.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form className="admin-login-form" onSubmit={submit}>
      <label htmlFor="admin-password">Clave de acceso</label>
      <input id="admin-password" type="password" autoComplete="current-password" required minLength={12} maxLength={256} value={password} onChange={(event) => setPassword(event.target.value)} />
      {error && <p className="admin-error" role="alert">{error}</p>}
      <button className="admin-primary-button" type="submit" disabled={isSubmitting}>{isSubmitting ? "Validando…" : "Entrar al panel"}</button>
      <p className="admin-login-hint">Sesión privada de 8 horas. La tienda nunca almacena tu clave.</p>
    </form>
  );
}
