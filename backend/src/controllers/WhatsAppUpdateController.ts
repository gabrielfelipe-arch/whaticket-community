import { Request, Response } from "express";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "fs";
import { join } from "path";
import axios from "axios";
import AppError from "../errors/AppError";
import {
  getWhatsAppProviderSettings,
  WHATSAPP_PROVIDER_LABELS
} from "../services/WhatsappProviderServices/WhatsappProviderSettingsService";

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
  target?: "whaileys" | "evolution";
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

const createSteps = (
  action: "install" | "rollback",
  target: "whaileys" | "evolution" = "whaileys"
): MaintenanceStep[] => {
  if (target === "evolution") {
    return action === "install"
      ? [
          { key: "rollback-image", label: "Criar ponto de rollback da Evolution", status: "pending" },
          { key: "docker-pull", label: "Baixar imagem atualizada da Evolution", status: "pending" },
          { key: "recreate", label: "Recriar servico Evolution", status: "pending" }
        ]
      : [
          { key: "restore-image", label: "Restaurar imagem anterior da Evolution", status: "pending" },
          { key: "recreate", label: "Recriar servico Evolution", status: "pending" }
        ];
  }

  return action === "install"
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
};

const startProgress = (
  action: "install" | "rollback",
  message: string,
  target: "whaileys" | "evolution" = "whaileys"
): void => {
  maintenanceProgress = {
    active: true,
    action,
    target,
    percent: 0,
    currentStep: "",
    message,
    steps: createSteps(action, target),
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
  method: "get" | "post" | "delete",
  url: string,
  data?: any,
  timeout = 300000
): Promise<T> => {
  const response = await axios.request<T>({
    method,
    url,
    baseURL: "http://docker",
    socketPath: DOCKER_SOCKET,
    data: method === "post" || method === "delete" ? (data || {}) : data,
    headers: method === "post" || method === "delete" ? { "Content-Type": "application/json" } : undefined,
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

const parseDockerImage = (image: string): { repository: string; tag: string } => {
  const cleanImage = String(image || "").trim();
  const lastSlash = cleanImage.lastIndexOf("/");
  const lastColon = cleanImage.lastIndexOf(":");

  if (lastColon > lastSlash) {
    return {
      repository: cleanImage.slice(0, lastColon),
      tag: cleanImage.slice(lastColon + 1) || "latest"
    };
  }

  return { repository: cleanImage, tag: "latest" };
};

const evolutionImageName = (): string =>
  process.env.EVOLUTION_API_IMAGE || "evoapicloud/evolution-api:v2.1.1";

const findEvolutionContainer = async (): Promise<any> => {
  const containers = await dockerRequest<any[]>(
    "get",
    "/containers/json?all=true",
    undefined,
    30000
  );

  const container = containers.find(item => {
    const labels = item.Labels || {};
    const names = item.Names || [];
    return (
      labels["com.docker.compose.service"] === "evolution-api" ||
      names.some((name: string) => String(name).includes("evolution-api"))
    );
  });

  if (!container) {
    throw new AppError("Nao foi possivel localizar o container da Evolution API.", 500);
  }

  return container;
};

const inspectContainer = async (containerId: string): Promise<any> =>
  dockerRequest("get", `/containers/${encodeURIComponent(containerId)}/json`, undefined, 30000);

const tagDockerImage = async (
  sourceImage: string,
  repository: string,
  tag: string
): Promise<string> => {
  await dockerRequest(
    "post",
    `/images/${encodeURIComponent(sourceImage)}/tag?repo=${encodeURIComponent(repository)}&tag=${encodeURIComponent(tag)}`,
    undefined,
    300000
  );

  return `${repository}:${tag}`;
};

const pullDockerImage = async (image: string): Promise<void> => {
  const { repository, tag } = parseDockerImage(image);
  await dockerRequest(
    "post",
    `/images/create?fromImage=${encodeURIComponent(repository)}&tag=${encodeURIComponent(tag)}`,
    undefined,
    600000
  );
};

const networkConfigFromInspect = (inspect: any): any => {
  const networks = inspect?.NetworkSettings?.Networks || {};
  const EndpointsConfig = Object.entries(networks).reduce<Record<string, any>>(
    (acc, [name, config]: [string, any]) => {
      acc[name] = {
        Aliases: config?.Aliases || undefined,
        Links: config?.Links || undefined,
        IPAMConfig: config?.IPAMConfig || undefined
      };
      return acc;
    },
    {}
  );

  return { EndpointsConfig };
};

const recreateContainerWithImage = async (
  inspect: any,
  image: string
): Promise<string> => {
  const name = String(inspect?.Name || "").replace(/^\//, "");
  if (!name) throw new AppError("Nome do container da Evolution nao identificado.", 500);

  await dockerRequest(
    "post",
    `/containers/${encodeURIComponent(inspect.Id)}/stop?t=10`,
    undefined,
    30000
  ).catch(() => undefined);

  await dockerRequest(
    "delete",
    `/containers/${encodeURIComponent(inspect.Id)}?force=true&v=false`,
    undefined,
    30000
  );

  const config = {
    ...inspect.Config,
    Image: image,
    Hostname: undefined,
    Domainname: undefined,
    MacAddress: undefined,
    NetworkDisabled: undefined,
    HostConfig: inspect.HostConfig,
    NetworkingConfig: networkConfigFromInspect(inspect)
  };

  delete config.Config;

  const created = await dockerRequest<{ Id: string }>(
    "post",
    `/containers/create?name=${encodeURIComponent(name)}`,
    config,
    30000
  );

  await dockerRequest(
    "post",
    `/containers/${encodeURIComponent(created.Id)}/start`,
    undefined,
    30000
  );

  return created.Id;
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
  const providerSettings = await getWhatsAppProviderSettings();
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

  if (providerSettings.provider === "evolution") {
    let evolutionInstalledVersion = "";
    let evolutionCheckError = "";

    try {
      const container = await findEvolutionContainer();
      const inspect = await inspectContainer(container.Id);
      const image = inspect?.Config?.Image || container.Image || evolutionImageName();
      const imageId = String(inspect?.Image || container.ImageID || "").replace(/^sha256:/, "");
      evolutionInstalledVersion = imageId
        ? `${image} (${imageId.slice(0, 12)})`
        : image;
    } catch (error) {
      evolutionCheckError = "Nao foi possivel consultar o container da Evolution API agora.";
    }

    return res.json({
      provider: providerSettings.provider,
      providerLabel: WHATSAPP_PROVIDER_LABELS[providerSettings.provider],
      updateProvider: "evolution",
      updateProviderLabel: WHATSAPP_PROVIDER_LABELS.evolution,
      declaredVersion: evolutionImageName(),
      installedVersion: evolutionInstalledVersion || "Nao verificada",
      latestVersion: evolutionImageName(),
      updateAvailable: true,
      checkError: evolutionCheckError,
      autoLibraryUpdate: true,
      autoWhatsAppWebVersion: false,
      installAutomationReady: await dockerAvailable(),
      rollbackAutomationReady: Boolean((await dockerAvailable()) && readRollbackPoint()?.provider === "evolution"),
      rollbackPoint: readRollbackPoint(),
      maintenance: maintenanceProgress
    });
  }

  return res.json({
    provider: providerSettings.provider,
    providerLabel: WHATSAPP_PROVIDER_LABELS[providerSettings.provider],
    updateProvider: "whaileys",
    updateProviderLabel: WHATSAPP_PROVIDER_LABELS.whaileys,
    declaredVersion,
    installedVersion,
    latestVersion,
    updateAvailable,
    checkError,
    autoLibraryUpdate: false,
    autoWhatsAppWebVersion: true,
    installAutomationReady: await dockerAvailable(),
    rollbackAutomationReady: Boolean((await dockerAvailable()) && readRollbackPoint()?.provider !== "evolution" && readRollbackPoint()?.active !== false),
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

  const providerSettings = await getWhatsAppProviderSettings();

  if (providerSettings.provider === "evolution") {
    const image = evolutionImageName();
    const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
    const rollbackTag = `evolution-${timestamp}`;

    startProgress("install", "Preparando atualizacao da Evolution API.", "evolution");

    setTimeout(async () => {
      try {
        setProgressStep("rollback-image", "Criando ponto de rollback da imagem atual da Evolution.");
        const container = await findEvolutionContainer();
        const inspect = await inspectContainer(container.Id);
        const currentImageId = inspect.Image || container.ImageID;
        const rollbackImage = await tagDockerImage(
          currentImageId,
          "whaticket-community-evolution-api-rollback",
          rollbackTag
        );

        writeRollbackPoint({
          active: true,
          provider: "evolution",
          previousVersion: inspect?.Config?.Image || container.Image || image,
          rollbackImage,
          rollbackTag,
          containerName: String(inspect?.Name || "").replace(/^\//, ""),
          createdAt: new Date().toISOString()
        });

        setProgressStep("docker-pull", `Baixando imagem ${image}.`);
        await pullDockerImage(image);

        setProgressStep("recreate", "Recriando o servico Evolution com a imagem atualizada.");
        const freshContainer = await findEvolutionContainer();
        const freshInspect = await inspectContainer(freshContainer.Id);
        await recreateContainerWithImage(freshInspect, image);

        const rollbackPoint = readRollbackPoint();
        writeRollbackPoint({
          ...rollbackPoint,
          installedVersion: image,
          installedAt: new Date().toISOString()
        });

        finishProgress("Evolution API atualizada. Reconecte os numeros se a sessao exigir novo pareamento.");
      } catch (error) {
        failProgress(`Falha ao atualizar Evolution API: ${maintenanceErrorMessage(error, "erro desconhecido")}`);
      }
    }, 100);

    return res.status(202).json({
      message: "Atualizacao da Evolution iniciada. Acompanhe o progresso na tela.",
      maintenance: maintenanceProgress
    });
  }

  const { packageLock } = readBackendPackage();
  const previousVersion = getInstalledWhaileysVersion(packageLock);
  if (!previousVersion) {
    throw new AppError("Nao foi possivel identificar a versao atual do Whaileys para rollback.", 500);
  }

  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  const rollbackTag = `whaileys-${previousVersion.replace(/[^a-zA-Z0-9_.-]/g, "-")}-${timestamp}`;
  startProgress("install", "Preparando atualizacao do provedor WhatsApp.", "whaileys");

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

  if (rollbackPoint.provider === "evolution") {
    startProgress("rollback", "Preparando rollback da Evolution API.", "evolution");

    setTimeout(async () => {
      try {
        setProgressStep("restore-image", "Restaurando imagem anterior da Evolution.");
        const container = await findEvolutionContainer();
        const inspect = await inspectContainer(container.Id);

        setProgressStep("recreate", "Recriando o servico Evolution com a imagem anterior.");
        await recreateContainerWithImage(inspect, rollbackPoint.rollbackImage);

        writeRollbackPoint({
          ...rollbackPoint,
          active: false,
          rolledBackAt: new Date().toISOString()
        });

        finishProgress("Rollback da Evolution aplicado.");
      } catch (error) {
        failProgress(`Falha ao desfazer atualizacao da Evolution API: ${maintenanceErrorMessage(error, "erro desconhecido")}`);
      }
    }, 100);

    return res.status(202).json({
      message: "Rollback da Evolution iniciado. Acompanhe o progresso na tela.",
      maintenance: maintenanceProgress
    });
  }

  startProgress("rollback", "Preparando rollback do provedor WhatsApp.", "whaileys");

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
