import Contact from "../models/Contact";
import Setting from "../models/Setting";

const settingMap = async (): Promise<Record<string, string>> => {
  const settings = await Setting.findAll({
    where: {
      key: [
        "brandName",
        "companyFantasyName",
        "companyLegalName",
        "companyCnpj",
        "companyAddress",
        "companyPhone",
        "companyEmail",
        "companyWebsite",
        "companyPix",
        "companyPaymentInfo"
      ]
    }
  });

  return settings.reduce((acc, setting) => {
    acc[setting.key] = setting.value || "";
    return acc;
  }, {} as Record<string, string>);
};

export const replaceMessageVariables = (
  body: string,
  values: Record<string, string>
): string =>
  String(body || "").replace(/{{\s*([a-zA-Z0-9_]+)\s*}}/g, (match, key) => {
    const normalizedKey = String(key || "").toLowerCase();
    return Object.prototype.hasOwnProperty.call(values, normalizedKey)
      ? values[normalizedKey] || ""
      : match;
  });

const RenderMessageVariables = async (body: string, contact?: Contact | null): Promise<string> => {
  const settings = await settingMap();
  const companyName = settings.companyFantasyName || settings.brandName || settings.companyLegalName || "";

  return replaceMessageVariables(body || "", {
    name: contact?.name || "",
    nome: contact?.name || "",
    nome_contato: contact?.name || "",
    numero: contact?.number || "",
    number: contact?.number || "",
    telefone_contato: contact?.number || "",
    nome_empresa: companyName,
    empresa_nome: companyName,
    empresa_razao_social: settings.companyLegalName || "",
    empresa_cnpj: settings.companyCnpj || "",
    empresa_endereco: settings.companyAddress || "",
    empresa_telefone: settings.companyPhone || "",
    empresa_email: settings.companyEmail || "",
    empresa_site: settings.companyWebsite || "",
    empresa_pix: settings.companyPix || "",
    dados_pagamento: settings.companyPaymentInfo || ""
  });
};

export default RenderMessageVariables;
