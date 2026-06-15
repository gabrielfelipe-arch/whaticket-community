import fs from "fs";
import XLSX from "xlsx";

import Contact from "../../models/Contact";
import ContactTag from "../../models/ContactTag";
import Tag from "../../models/Tag";

type ImportResult = {
  created: number;
  updated: number;
  skipped: number;
  errors: string[];
};

type ContactRow = {
  name: string;
  number: string;
  email: string;
  tags: string[];
};

const normalizeHeader = (value: string): string =>
  String(value || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^\w]+/g, "");

const normalizePhone = (value: string): string =>
  String(value || "").replace(/\D/g, "");

const splitTags = (value: string): string[] =>
  String(value || "")
    .split(/[;,|]/)
    .map(item => item.trim())
    .filter(Boolean);

const getCellValue = (row: Record<string, any>, aliases: string[]): string => {
  const normalizedAliases = aliases.map(normalizeHeader);
  const key = Object.keys(row).find(item => normalizedAliases.includes(normalizeHeader(item)));
  return key ? String(row[key] || "").trim() : "";
};

const parseRows = (filePath: string): ContactRow[] => {
  const workbook = XLSX.readFile(filePath, { cellDates: false });
  const sheetName = workbook.SheetNames[0];
  if (!sheetName) return [];

  const rows = XLSX.utils.sheet_to_json<Record<string, any>>(workbook.Sheets[sheetName], {
    defval: "",
    raw: false
  });

  return rows.map(row => ({
    name: getCellValue(row, ["nome", "name", "contato", "contact"]),
    number: normalizePhone(getCellValue(row, ["numero", "número", "telefone", "phone", "whatsapp", "celular"])),
    email: getCellValue(row, ["email", "e-mail", "mail"]),
    tags: splitTags(getCellValue(row, ["tags", "tag", "etiquetas", "etiqueta"]))
  }));
};

const findOrCreateTags = async (tagNames: string[]): Promise<Tag[]> => {
  const uniqueNames = Array.from(new Set(tagNames.map(name => name.trim()).filter(Boolean)));
  const tags: Tag[] = [];

  for (const name of uniqueNames) {
    const [tag] = await Tag.findOrCreate({
      where: { name },
      defaults: { name, color: "#607d8b", fixed: false }
    });
    tags.push(tag);
  }

  return tags;
};

const ImportContactsSpreadsheetService = async (filePath: string): Promise<ImportResult> => {
  const result: ImportResult = {
    created: 0,
    updated: 0,
    skipped: 0,
    errors: []
  };

  try {
    const rows = parseRows(filePath);

    for (const [index, row] of rows.entries()) {
      const lineNumber = index + 2;
      if (!row.name && !row.number) {
        result.skipped += 1;
        continue;
      }

      if (!row.name || !row.number) {
        result.skipped += 1;
        result.errors.push(`Linha ${lineNumber}: nome ou telefone ausente.`);
        continue;
      }

      try {
        const tags = await findOrCreateTags(row.tags);
        const tagIds = tags.map(tag => tag.id);
        const [contact, created] = await Contact.findOrCreate({
          where: { number: row.number },
          defaults: {
            name: row.name,
            number: row.number,
            email: row.email || "",
            isGroup: false
          }
        });

        if (created) {
          result.created += 1;
        } else {
          await contact.update({
            name: row.name || contact.name,
            email: row.email || contact.email
          });
          result.updated += 1;
        }

        if (tagIds.length) {
          await contact.$set("tags", tags);
          await ContactTag.update(
            { appliedAt: new Date() },
            { where: { contactId: contact.id, tagId: tagIds } }
          );
        }
      } catch (error) {
        result.skipped += 1;
        result.errors.push(`Linha ${lineNumber}: ${error.message}`);
      }
    }
  } finally {
    fs.unlink(filePath, () => undefined);
  }

  return result;
};

export default ImportContactsSpreadsheetService;
