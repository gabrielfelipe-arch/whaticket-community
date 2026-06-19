import { Request, Response } from "express";
import { readFileSync } from "fs";
import { join } from "path";
import axios from "axios";
import AppError from "../errors/AppError";

const requireAdmin = (req: Request): void => {
  if (req.user.profile !== "admin") throw new AppError("ERR_NO_PERMISSION", 403);
};

const readBackendPackage = () => {
  const packageJson = JSON.parse(
    readFileSync(join(__dirname, "..", "..", "package.json"), "utf8")
  );
  const packageLock = JSON.parse(
    readFileSync(join(__dirname, "..", "..", "package-lock.json"), "utf8")
  );

  return { packageJson, packageLock };
};

const getInstalledWhaileysVersion = (packageLock: any): string => {
  return (
    packageLock?.packages?.["node_modules/whaileys"]?.version ||
    packageLock?.dependencies?.whaileys?.version ||
    ""
  );
};

export const status = async (req: Request, res: Response): Promise<Response> => {
  requireAdmin(req);

  const { packageJson, packageLock } = readBackendPackage();
  const installedVersion = getInstalledWhaileysVersion(packageLock);
  const declaredVersion = packageJson?.dependencies?.whaileys || "";

  let latestVersion = "";
  let updateAvailable = false;
  let checkError = "";

  try {
    const { data } = await axios.get("https://registry.npmjs.org/whaileys/latest", {
      timeout: 8000
    });
    latestVersion = String(data?.version || "");
    updateAvailable = Boolean(latestVersion && installedVersion && latestVersion !== installedVersion);
  } catch (error) {
    checkError = "Nao foi possivel consultar o registro npm agora.";
  }

  return res.json({
    provider: "whaileys",
    declaredVersion,
    installedVersion,
    latestVersion,
    updateAvailable,
    checkError,
    autoLibraryUpdate: false,
    autoWhatsAppWebVersion: true,
    installAutomationReady: false,
    rollbackAutomationReady: false
  });
};

export const install = async (req: Request, res: Response): Promise<Response> => {
  requireAdmin(req);
  throw new AppError("Instalacao automatica ainda nao habilitada. Use a verificacao de versao antes de ativarmos a rotina de manutencao.", 501);
};

export const rollback = async (req: Request, res: Response): Promise<Response> => {
  requireAdmin(req);
  throw new AppError("Rollback automatico ainda nao habilitado. Primeiro precisamos criar o ponto de restauracao por imagem Docker.", 501);
};
