import crypto from "crypto";
import AppError from "../errors/AppError";

const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 12;

const getEncryptionKey = (): Buffer => {
  const rawKey = process.env.CALENDAR_TOKEN_ENCRYPTION_KEY || "";

  if (!rawKey && process.env.NODE_ENV === "production") {
    throw new AppError("CALENDAR_TOKEN_ENCRYPTION_KEY nao configurada.", 500);
  }

  const keySource = rawKey || process.env.JWT_SECRET || process.env.SECRET || "rocketservice-calendar-dev-key";
  return crypto.createHash("sha256").update(keySource).digest();
};

export const encryptCalendarToken = (value?: string | null): string | null => {
  if (!value) return null;

  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, getEncryptionKey(), iv);
  const encrypted = Buffer.concat([cipher.update(value, "utf8"), cipher.final()]);
  const authTag = cipher.getAuthTag();

  return [
    iv.toString("base64"),
    authTag.toString("base64"),
    encrypted.toString("base64")
  ].join(":");
};

export const decryptCalendarToken = (value?: string | null): string | null => {
  if (!value) return null;

  const [ivBase64, authTagBase64, encryptedBase64] = value.split(":");
  if (!ivBase64 || !authTagBase64 || !encryptedBase64) {
    throw new AppError("Token de agenda criptografado invalido.", 500);
  }

  const decipher = crypto.createDecipheriv(
    ALGORITHM,
    getEncryptionKey(),
    Buffer.from(ivBase64, "base64")
  );
  decipher.setAuthTag(Buffer.from(authTagBase64, "base64"));

  return Buffer.concat([
    decipher.update(Buffer.from(encryptedBase64, "base64")),
    decipher.final()
  ]).toString("utf8");
};
