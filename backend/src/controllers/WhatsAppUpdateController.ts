import { Request, Response } from "express";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "fs";
import { join } from "path";
import axios from "axios";
import AppError from "../errors/AppError";

const DOCKER_SOCKET = "/var/run/docker.sock";
const MAINTENANCE_DIR = join(__dirname, "..", "..", "public", "maintenance");
const ROLLBACK_FILE = join(MAINTENANCE_DIR, "whatsapp-provider-rollback.json");
const BACKEND_WORKDIR = join(__dirname, "..", "..");

type MaintenanceStep = {
  key: string;
  label: string;
  status: "pending" | "running" | "done" | "error";
};

type MaintenanceProgress = {
  active: boolean;
  action: "install" | "rollback" | "";
  percent: number;
  currentStep: string;
  message: string;
  steps: MaintenanceStep[];
  startedAt?: string;
  finishedAt?: string;
  error?: string;
};

const emptyProgress = (): MaintenanceProgress => ({
  active: false,
  action: "",
  percent: 0,
  currentStep: "",
  message: "",
  steps: []
});

let maintenanceProgress: MaintenanceProgress = emptyProgress();

const createSteps = (action: "install" | "rollback"): MaintenanceStep[] =>
  action === "install"
    ? [
        { key: "rollback-image", label: "Criar ponto de rollback Docker", status: "pending" },
        { key: "npm-install", label: "Instalar nova versao do Whaileys", status: "pending" },
        { key: "commit-updated", label: "Salvar imagem Docker atualizada", status: "pending" },
        { key: "restart", label: "Reiniciar backend", status: "pending" }
      ]
    : [
        { key: "npm-rollback", label: "Restaurar versao anterior do Whaileys", status: "pending" },
        { key: "commit-restored", label: "Salvar imagem Docker restaurada", status: "pending" },
        { key: "restart", label: "Reiniciar backend", status: "pending" }
      ];

const startProgress = (action: "install" | "rollback", message: string): void => {
  maintenanceProgress = {
    active: true,
    action,
    percent: 0,
    currentStep: "",
    message,
    steps: createSteps(action),
    startedAt: new Date().toISOString()
  };
};

const setProgressStep = (key: string, message: string): void => {
  const currentIndex = maintenanceProgress.steps.findIndex(step => step.key === key);
  const total = maintenanceProgress.steps.length || 1;

  maintenanceProgress = {
    ...maintenanceProgress,
    currentStep: key,
    message,
    percent: Math.max(5, Math.round((currentIndex / total) * 100)),
    steps: maintenanceProgress.steps.map((step, index) => {
      if (index < currentIndex) return { ...step, status: "done" };
      if (step.key === key) return { ...step, status: "running" };
      return { ...step, status: "pending" };
    })
  };
};

const finishProgress = (message: string): void => {
  maintenanceProgress = {
    ...maintenanceProgress,
    active: false,
    percent: 100,
    currentStep: "",
    message,
    finishedAt: new Date().toISOString(),
    steps: maintenanceProgress.steps.map(step => ({ ...step, status: "done" }))
  };
};

const failProgress = (message: string): void => {
  maintenanceProgress = {
    ...maintenanceProgress,
    active: false,
    message,
    error: message,
    finishedAt: new Date().toISOString(),
    steps: maintenanceProgress.steps.map(step =>
      step.status === "running" ? { ...step, status: "error" } : step
    )
  };
};

const requireAdmin = (req: Request): void => {
  if (req.user.profile !== "admin") throw new AppError("ERR_NO_PERMISSION", 403);
};

const maintenanceErrorMessage = (error: any, fallback: string): string =>
  error?.response?.data?.message ||
  error?.response?.data?.error ||
  error?.message ||
  fallback;

const dockerRequest = async <T = any>(
  method: "get" | "post",
  url: string,
  data?: any,
  timeout = 300000
): Promise<T> => {
  const response = await axios.request<T>({
    method,
    url,
    baseURL: "http://docker",
    socketPath: DOCKER_SOCKET,
    data: method === "post" ? (data || {}) : data,
    headers: method === "post" ? { "Content-Type": "application/json" } : undefined,
    timeout
  });

  return response.data;
};

const dockerAvailable = async (): Promise<boolean> => {
  if (!existsSync(DOCKER_SOCKET)) return false;

  try {
    await dockerRequest("get", "/_ping", undefined, 5000);
    return true;
  } catch (error) {
    return false;
  }
};

const currentContainerId = (): string => process.env.HOSTNAME || "";

const ensureMaintenanceDir = (): void => {
  if (!existsSync(MAINTENANCE_DIR)) mkdirSync(MAINTENANCE_DIR, { recursive: true });
};

const readRollbackPoint = (): any | null => {
  if (!existsSync(ROLLBACK_FILE)) return null;

  try {
    return JSON.parse(readFileSync(ROLLBACK_FILE, "utf8"));
  } catch (error) {
    return null;
  }
};

const writeRollbackPoint = (data: any): void => {
  ensureMaintenanceDir();
  writeFileSync(ROLLBACK_FILE, JSON.stringify(data, null, 2), "utf8");
};

const dockerCommitCurrentContainer = async (repo: string, tag: string): Promise<string> => {
  const containerId = currentContainerId();
  if (!containerId) throw new AppError("Nao foi possivel identificar o container atual do backend.", 500);

  await dockerRequest(
    "post",
    `/commit?container=${encodeURIComponent(containerId)}&repo=${encodeURIComponent(repo)}&tag=${encodeURIComponent(tag)}`,
    undefined,
    300000
  );

  return `${repo}:${tag}`;
};

const runCommandInCurrentContainer = async (cmd: string[], timeout = 300000): Promise<void> => {
  const containerId = currentContainerId();
  if (!containerId) throw new AppError("Nao foi possivel identificar o container atual do backend.", 500);

  const exec = await dockerRequest<{ Id: string }>(
    "post",
    `/containers/${encodeURIComponent(containerId)}/exec`,
    {
      AttachStdout: true,
      AttachStderr: true,
      Cmd: cmd,
      WorkingDir: BACKEND_WORKDIR
    },
    timeout
  );

  await dockerRequest(
    "post",
    `/exec/${encodeURIComponent(exec.Id)}/start`,
    { Detach: false, Tty: false },
    timeout
  );

  const inspect = await dockerRequest<{ ExitCode: number }>(
    "get",
    `/exec/${encodeURIComponent(exec.Id)}/json`,
    undefined,
    30000
  );

  if (inspect.ExitCode !== 0) {
    throw new AppError(`Comando de manutencao falhou: ${cmd.join(" ")}`, 500);
  }
};

const restartBackendSoon = (): void => {
  const containerId = currentContainerId();
  if (!containerId) return;

  setTimeout(() => {
    dockerRequest(
      "post",
      `/containers/${encodeURIComponent(containerId)}/restart?t=3`,
      undefined,
      30000
    ).catch(() => undefined);
  }, 1200);
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
    installAutomationReady: await dockerAvailable(),
    rollbackAutomationReady: Boolean((await dockerAvailable()) && readRollbackPoint()?.active !== false),
    rollbackPoint: readRollbackPoint(),
    maintenance: maintenanceProgress
  });
};

export const progress = async (req: Request, res: Response): Promise<Response> => {
  requireAdmin(req);

  return res.json({ maintenance: maintenanceProgress });
};

export const install = async (req: Request, res: Response): Promise<Response> => {
  requireAdmin(req);

  if (maintenanceProgress.active) {
    throw new AppError("Ja existe uma manutencao do WhatsApp em andamento.", 409);
  }

  if (!(await dockerAvailable())) {
    throw new AppError("Docker nao esta acessivel pelo backend. Verifique o volume /var/run/docker.sock.", 501);
  }

  const { packageLock } = readBackendPackage();
  const previousVersion = getInstalledWhaileysVersion(packageLock);
  if (!previousVersion) {
    throw new AppError("Nao foi possivel identificar a versao atual do Whaileys para rollback.", 500);
  }

  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  const rollbackTag = `whaileys-${previousVersion.replace(/[^a-zA-Z0-9_.-]/g, "-")}-${timestamp}`;
  startProgress("install", "Preparando atualizacao do provedor WhatsApp.");

  setTimeout(async () => {
    try {
      setProgressStep("rollback-image", "Criando ponto de rollback Docker antes da atualizacao.");
      const rollbackImage = await dockerCommitCurrentContainer("whaticket-community-backend-rollback", rollbackTag);

      writeRollbackPoint({
        active: true,
        provider: "whaileys",
        previousVersion,
        rollbackImage,
        rollbackTag,
        createdAt: new Date().toISOString()
      });

      setProgressStep("npm-install", "Instalando a nova versao do Whaileys.");
      await runCommandInCurrentContainer(["npm", "install", "whaileys@latest", "--save-exact"], 300000);

      const { packageLock: updatedLock } = readBackendPackage();
      const installedVersion = getInstalledWhaileysVersion(updatedLock);
      setProgressStep("commit-updated", "Salvando a imagem Docker atualizada do backend.");
      const updatedImage = await dockerCommitCurrentContainer("whaticket-community-backend", "latest");

      const rollbackPoint = readRollbackPoint();
      writeRollbackPoint({
        ...rollbackPoint,
        installedVersion,
        updatedImage,
        installedAt: new Date().toISOString()
      });

      setProgressStep("restart", "Reiniciando o backend para carregar a nova versao.");
      finishProgress("Atualizacao instalada. O backend sera reiniciado em instantes.");
      restartBackendSoon();
    } catch (error) {
      failProgress(`Falha ao instalar atualizacao do WhatsApp: ${maintenanceErrorMessage(error, "erro desconhecido")}`);
    }
  }, 100);

  return res.status(202).json({
    message: "Atualizacao iniciada. Acompanhe o progresso na tela.",
    maintenance: maintenanceProgress
  });
};

export const rollback = async (req: Request, res: Response): Promise<Response> => {
  requireAdmin(req);

  if (maintenanceProgress.active) {
    throw new AppError("Ja existe uma manutencao do WhatsApp em andamento.", 409);
  }

  if (!(await dockerAvailable())) {
    throw new AppError("Docker nao esta acessivel pelo backend. Verifique o volume /var/run/docker.sock.", 501);
  }

  const rollbackPoint = readRollbackPoint();
  if (!rollbackPoint?.previousVersion) {
    throw new AppError("Nao existe ponto de rollback salvo para o provedor WhatsApp.", 400);
  }

  startProgress("rollback", "Preparando rollback do provedor WhatsApp.");

  setTimeout(async () => {
    try {
      setProgressStep("npm-rollback", "Restaurando a versao anterior do Whaileys.");
      await runCommandInCurrentContainer(["npm", "install", `whaileys@${rollbackPoint.previousVersion}`, "--save-exact"], 300000);
      setProgressStep("commit-restored", "Salvando a imagem Docker restaurada do backend.");
      const restoredImage = await dockerCommitCurrentContainer("whaticket-community-backend", "latest");

      writeRollbackPoint({
        ...rollbackPoint,
        active: false,
        restoredImage,
        rolledBackAt: new Date().toISOString()
      });

      setProgressStep("restart", "Reiniciando o backend para carregar a versao restaurada.");
      finishProgress("Rollback aplicado. O backend sera reiniciado em instantes.");
      restartBackendSoon();
    } catch (error) {
      failProgress(`Falha ao desfazer atualizacao do WhatsApp: ${maintenanceErrorMessage(error, "erro desconhecido")}`);
    }
  }, 100);

  return res.status(202).json({
    message: "Rollback iniciado. Acompanhe o progresso na tela.",
    maintenance: maintenanceProgress
  });
};
