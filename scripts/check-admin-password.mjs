import { stdin, stdout } from "node:process";
import { loadEnvConfig } from "@next/env";
import { verifyAdminPasswordHash } from "../src/lib/admin-password.mjs";

loadEnvConfig(process.cwd());

function readHiddenPassword() {
  return new Promise((resolve, reject) => {
    if (!stdin.isTTY || !stdin.setRawMode) {
      reject(new Error("Ejecuta este comando en una terminal interactiva."));
      return;
    }

    let password = "";
    stdout.write("Clave que usas en /admin (no se mostrará): ");
    stdin.setRawMode(true);
    stdin.resume();
    stdin.setEncoding("utf8");
    const finish = (error) => {
      stdin.setRawMode(false);
      stdin.pause();
      stdin.removeListener("data", onData);
      stdout.write("\n");
      if (error) reject(error);
      else resolve(password);
    };
    const onData = (chunk) => {
      if (chunk === "\u0003") return finish(new Error("Cancelado."));
      if (chunk === "\r" || chunk === "\n") return finish();
      if (chunk === "\u007f" || chunk === "\b") password = password.slice(0, -1);
      else if (chunk >= " " && password.length < 256) password += chunk;
    };
    stdin.on("data", onData);
  });
}

try {
  const password = await readHiddenPassword();
  const matches = await verifyAdminPasswordHash(password, process.env.ADMIN_PASSWORD_HASH || "");
  stdout.write(matches
    ? "La clave coincide con ADMIN_PASSWORD_HASH. Si el login aún falla, reinicia Next.js y revisa el mensaje exacto del formulario.\n"
    : "La clave no coincide con ADMIN_PASSWORD_HASH. Genera un hash nuevo y reemplaza esa línea en .env.local.\n");
  if (!matches) process.exitCode = 1;
} catch (error) {
  stdout.write(`${error instanceof Error ? error.message : "No se pudo validar la clave."}\n`);
  process.exitCode = 1;
}
