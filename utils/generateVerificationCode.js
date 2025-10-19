import crypto from "crypto";

export function generateVerificationCode(lenght = 6) {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ1234567890";
  let code = "";
  for (let i = 0; i < lenght; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}
