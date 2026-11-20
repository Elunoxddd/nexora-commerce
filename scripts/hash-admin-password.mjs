import { stdin, stdout } from "node:process";
import { hashAdminPassword, verifyAdminPasswordHash } from "../src/lib/admin-password.mjs";

function readHiddenPassword() {
  return new Promise((resolve, reject) => {
    if (!stdin.isTTY || !stdin.setRawMode) {
      reject(new Error("Run this command in an interactive terminal."));
      return;
    }

    let password = "";
    stdout.write("Clave nueva para /admin (mínimo 12 caracteres): ");
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
      if (chunk === "\u0003") return finish(new Error("Cancelled."));
      if (chunk === "\r" || chunk === "\n") return finish();
      if (chunk === "\u007f" || chunk === "\b") password = password.slice(0, -1);
      else if (chunk >= " " && password.length < 256) password += chunk;
    };
    stdin.on("data", onData);
  });
}

const password = await readHiddenPassword();
if (password.length < 12) {
  stdout.write("La clave debe tener al menos 12 caracteres.\n");
  process.exitCode = 1;
} else {
  const hash = hashAdminPassword(password);
  if (!(await verifyAdminPasswordHash(password, hash))) {
    stdout.write("No se pudo comprobar el hash generado. No copies el resultado.\n");
    process.exitCode = 1;
  } else {
  stdout.write(`\nCopia esta línea completa en .env.local y reinicia Next.js:\nADMIN_PASSWORD_HASH="${hash}"\n`);
  }
}
