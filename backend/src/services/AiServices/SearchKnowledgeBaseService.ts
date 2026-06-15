import crypto from "crypto";
import { Op, QueryTypes } from "sequelize";
import sequelize from "../../database";
import KnowledgeBaseArticle from "../../models/KnowledgeBaseArticle";
import KnowledgeBaseChunk from "../../models/KnowledgeBaseChunk";
import { logger } from "../../utils/logger";

export interface KnowledgeFragment {
  id: number;
  chunkId?: number;
  articleId?: number;
  title: string;
  section?: string | null;
  tags: string | null;
  fragment: string;
  contentHtml?: string | null;
  rank: number;
  semanticScore?: number;
  keywordScore?: number;
  source: "hybrid" | "semantic" | "keyword" | "fts" | "fallback";
}

interface SearchOptions {
  ticketId?: number | null;
  aiSettingId?: number | null;
  companyId?: number | null;
  userMessage?: string;
  detectedIntent?: string | null;
  directedKnowledgeBaseQuery?: string;
  entities?: Record<string, string | number | boolean | null>;
  includeFullBaseFallback?: boolean;
  topK?: number;
  minScore?: number;
}

interface ChunkCandidate {
  id: number;
  articleId: number;
  aiSettingId?: number | null;
  title: string;
  section: string;
  content: string;
  tags: string | null;
  embedding: string;
  updatedAt: Date;
}

const EMBEDDING_DIMENSIONS = 128;
const DEFAULT_TOP_K = 5;
const MIN_HYBRID_SCORE = 0.08;

const STOPWORDS = new Set([
  "a", "as", "ao", "aos", "o", "os", "de", "da", "das", "do", "dos", "e",
  "em", "no", "na", "nos", "nas", "um", "uma", "uns", "umas", "me", "te",
  "se", "que", "qual", "quais", "quero", "queria", "saber", "sobre", "por",
  "pra", "para", "favor", "ola", "oi", "bom", "boa", "dia", "tarde", "noite",
  "tem", "ter", "como", "manda", "envia", "pode", "voce"
]);

const CRITICAL_TERMS = [
  "pix",
  "cartao",
  "debito",
  "credito",
  "reserva",
  "desconto",
  "professor",
  "mensalista",
  "endereco",
  "capacidade",
  "pessoas",
  "tabela",
  "valores",
  "precos",
  "incluso",
  "ar condicionado",
  "ar-condicionado"
];

const SYNONYMS: Record<string, string[]> = {
  pix: ["pagamento", "pagar"],
  cartao: ["credito", "debito", "pagamento"],
  debito: ["cartao", "pagamento"],
  credito: ["cartao", "pagamento"],
  pagamento: ["pix", "cartao", "debito", "credito", "reserva"],
  pagamentos: ["pix", "cartao", "debito", "credito", "reserva"],
  formas: ["pagamento", "pix", "cartao", "debito", "credito"],
  reserva: ["reservar", "data", "sinal", "pagamento"],
  reservar: ["reserva", "data", "sinal"],
  desconto: ["promocao", "condicao", "negociacao"],
  endereco: ["onde", "localizacao", "rua", "meier"],
  onde: ["endereco", "localizacao"],
  fica: ["endereco", "localizacao", "rua"],
  capacidade: ["pessoas", "participantes", "cabe"],
  cabe: ["capacidade", "pessoas"],
  pessoas: ["capacidade", "participantes"],
  preco: ["valor", "valores", "tabela", "orcamento", "custo"],
  precos: ["preco", "valor", "valores", "tabela", "orcamento"],
  valor: ["preco", "valores", "tabela", "orcamento"],
  valores: ["valor", "preco", "tabela", "orcamento"],
  tabela: ["valores", "precos", "orcamento"],
  incluso: ["inclui", "estrutura", "beneficios"],
  inclui: ["incluso", "estrutura"],
  ar: ["ar condicionado", "ar-condicionado", "estrutura"],
  professor: ["particular", "pacote"],
  mensalista: ["mensal", "recorrente"]
};

const normalizeText = (value = ""): string =>
  value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/ç/g, "c")
    .replace(/\s+/g, " ")
    .trim();

const tokenize = (value = ""): string[] => {
  const normalized = normalizeText(value).replace(/[^\p{L}\p{N}\s-]/gu, " ");
  const baseTerms = normalized
    .split(/\s+/)
    .map(term => term.trim())
    .filter(term => term.length >= 2 && !STOPWORDS.has(term));

  const expanded = baseTerms.reduce<string[]>((acc, term) => {
    acc.push(term);
    if (SYNONYMS[term]) acc.push(...SYNONYMS[term]);
    return acc;
  }, []);

  for (const critical of CRITICAL_TERMS) {
    const normalizedCritical = normalizeText(critical);
    if (normalized.includes(normalizedCritical)) expanded.push(normalizedCritical);
  }

  return Array.from(new Set(expanded)).slice(0, 40);
};

const hashToken = (token: string): number => {
  const hash = crypto.createHash("sha1").update(token).digest();
  return hash.readUInt32BE(0);
};

const createEmbedding = (text: string): number[] => {
  const vector = Array.from({ length: EMBEDDING_DIMENSIONS }, () => 0);
  const terms = tokenize(text);

  for (const term of terms) {
    const hash = hashToken(term);
    const index = hash % EMBEDDING_DIMENSIONS;
    const sign = hash % 2 === 0 ? 1 : -1;
    vector[index] += sign;
  }

  const magnitude = Math.sqrt(vector.reduce((sum, value) => sum + value * value, 0)) || 1;
  return vector.map(value => Number((value / magnitude).toFixed(6)));
};

const parseEmbedding = (value = "[]"): number[] => {
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed.map(Number) : [];
  } catch (err) {
    return [];
  }
};

const cosineSimilarity = (left: number[], right: number[]): number => {
  if (!left.length || !right.length) return 0;
  const limit = Math.min(left.length, right.length);
  let dot = 0;
  let leftMagnitude = 0;
  let rightMagnitude = 0;

  for (let index = 0; index < limit; index += 1) {
    dot += left[index] * right[index];
    leftMagnitude += left[index] * left[index];
    rightMagnitude += right[index] * right[index];
  }

  const denominator = Math.sqrt(leftMagnitude) * Math.sqrt(rightMagnitude);
  return denominator ? dot / denominator : 0;
};

const contentHash = (value: string): string =>
  crypto.createHash("sha1").update(value).digest("hex");

const stripHtml = (value = ""): string =>
  value
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/p>/gi, "\n\n")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/\r\n/g, "\n")
    .trim();

const splitLongBlock = (text: string, maxLength = 1600): string[] => {
  if (text.length <= maxLength) return [text];

  const paragraphs = text.split(/\n{2,}/).map(item => item.trim()).filter(Boolean);
  const chunks: string[] = [];
  let current = "";

  for (const paragraph of paragraphs) {
    if (`${current}\n\n${paragraph}`.trim().length > maxLength && current) {
      chunks.push(current.trim());
      current = paragraph;
    } else {
      current = `${current}\n\n${paragraph}`.trim();
    }
  }

  if (current) chunks.push(current.trim());
  return chunks.length ? chunks : [text.slice(0, maxLength)];
};

const splitArticleIntoChunks = (article: KnowledgeBaseArticle): Array<{ section: string; content: string }> => {
  const source = stripHtml(article.contentHtml || article.content || "");
  const lines = source.split("\n");
  const sections: Array<{ section: string; content: string }> = [];
  let currentSection = article.title || "Geral";
  let currentLines: string[] = [];

  const flush = () => {
    const content = currentLines.join("\n").trim();
    if (!content) return;
    for (const part of splitLongBlock(content)) {
      sections.push({ section: currentSection, content: part });
    }
    currentLines = [];
  };

  for (const rawLine of lines) {
    const line = rawLine.trim();
    const heading = line.match(/^(#{1,4})\s+(.+)$/);
    const cleanLine = line.replace(/[*_`]/g, "").trim();
    const titleLike =
      !heading &&
      line.length >= 4 &&
      line.length <= 90 &&
      !/[.!?;]$/.test(line) &&
      /^[A-Z????????????0-9]/.test(line) &&
      currentLines.length > 0 &&
      (
        /:$/.test(line) ||
        /^\d+(?:\.\d+)*\.\s+/.test(line) ||
        cleanLine === cleanLine.toUpperCase()
      );

    if (heading || titleLike) {
      flush();
      currentSection = (heading ? heading[2] : line).trim();
      continue;
    }

    currentLines.push(rawLine);
  }

  flush();

  if (!sections.length && source) {
    return splitLongBlock(source).map((content, index) => ({
      section: index === 0 ? article.title || "Geral" : `${article.title || "Geral"} ${index + 1}`,
      content
    }));
  }

  return sections;
};

const chunksTableExists = async (): Promise<boolean> => {
  const rows = await sequelize.query<{ exists: boolean }>(
    `select to_regclass('"KnowledgeBaseChunks"') is not null as exists`,
    { type: QueryTypes.SELECT }
  );
  return rows[0]?.exists === true;
};

const ensureChunksIndexed = async (): Promise<boolean> => {
  if (!(await chunksTableExists())) return false;

  const articles = await KnowledgeBaseArticle.findAll({
    where: { active: true },
    order: [["updatedAt", "ASC"]]
  });

  for (const article of articles) {
    const sections = splitArticleIntoChunks(article);
    const activeHashes: string[] = [];

    for (const section of sections) {
      const payload = [
        article.title || "",
        section.section || "",
        article.tags || "",
        section.content
      ].join("\n");
      const hash = contentHash(payload);
      activeHashes.push(hash);

      const existing = await KnowledgeBaseChunk.findOne({
        where: { articleId: article.id, contentHash: hash }
      });

      if (existing) {
        if (!existing.active) await existing.update({ active: true });
        continue;
      }

      await KnowledgeBaseChunk.create({
        articleId: article.id,
        aiSettingId: null,
        title: article.title,
        section: section.section,
        content: section.content,
        tags: article.tags,
        embedding: JSON.stringify(createEmbedding(payload)),
        contentHash: hash,
        active: true
      });
    }

    if (activeHashes.length) {
      await KnowledgeBaseChunk.update(
        { active: false },
        {
          where: {
            articleId: article.id,
            contentHash: { [Op.notIn]: activeHashes }
          }
        }
      );
    }
  }

  return true;
};

const keywordScore = (messageTerms: string[], chunk: ChunkCandidate): number => {
  if (!messageTerms.length) return 0;

  const haystack = normalizeText([
    chunk.title,
    chunk.section,
    chunk.tags || "",
    chunk.content
  ].join(" "));

  let score = 0;
  for (const term of messageTerms) {
    if (!term) continue;
    if (normalizeText(chunk.section || "").includes(term)) score += 0.3;
    if (normalizeText(chunk.title || "").includes(term)) score += 0.25;
    if (normalizeText(chunk.tags || "").includes(term)) score += 0.25;
    if (haystack.includes(term)) score += 0.12;
  }

  for (const critical of CRITICAL_TERMS) {
    const normalizedCritical = normalizeText(critical);
    if (messageTerms.includes(normalizedCritical) && haystack.includes(normalizedCritical)) {
      score += 0.45;
    }
  }

  return Math.min(score, 2);
};

const searchChunks = async (
  message: string,
  options: SearchOptions
): Promise<KnowledgeFragment[]> => {
  const messageTerms = tokenize(message);
  const queryEmbedding = createEmbedding(message);
  const topK = options.topK || DEFAULT_TOP_K;
  const rows = await KnowledgeBaseChunk.findAll({
    where: {
      active: true,
      ...(options.aiSettingId
        ? { [Op.or]: [{ aiSettingId: null }, { aiSettingId: options.aiSettingId }] }
        : {})
    },
    order: [["updatedAt", "DESC"]],
    limit: 300
  }) as ChunkCandidate[];

  const ranked = rows
    .map(row => {
      const semanticScore = Math.max(0, cosineSimilarity(queryEmbedding, parseEmbedding(row.embedding)));
      const lexicalScore = keywordScore(messageTerms, row);
      const rank = semanticScore * 0.65 + Math.min(lexicalScore, 1) * 0.35;

      return {
        id: row.articleId,
        chunkId: row.id,
        articleId: row.articleId,
        title: row.title,
        section: row.section,
        tags: row.tags,
        fragment: row.content,
        rank,
        semanticScore,
        keywordScore: lexicalScore,
        source: lexicalScore > semanticScore ? "hybrid" : "semantic"
      } as KnowledgeFragment;
    })
    .filter(row =>
      row.rank >= (options.minScore ?? MIN_HYBRID_SCORE) &&
      (Number(row.keywordScore || 0) >= 0.5 || Number(row.semanticScore || 0) >= 0.5)
    )
    .sort((left, right) => right.rank - left.rank)
    .slice(0, topK);

  return ranked;
};

const fallbackArticleSearch = async (message: string): Promise<KnowledgeFragment[]> => {
  const terms = tokenize(message).slice(0, 8);
  if (!terms.length) return [];

  const conditions = terms
    .map((_, index) => `
      k.title ilike :term${index}
      or k.tags ilike :term${index}
      or k.content ilike :term${index}
    `)
    .join(" or ");

  const scoreParts = terms
    .map((_, index) => `
      case when k.title ilike :term${index} then 4 else 0 end +
      case when k.tags ilike :term${index} then 3 else 0 end +
      case when k.content ilike :term${index} then 1 else 0 end
    `)
    .join(" + ");

  const replacements = terms.reduce<Record<string, string>>((acc, term, index) => {
    acc[`term${index}`] = `%${term}%`;
    return acc;
  }, {});

  return sequelize.query<KnowledgeFragment>(
    `
      select
        k.id,
        k.id as "articleId",
        k.title,
        k.title as section,
        k.tags,
        k."contentHtml",
        left(k.content, 1600) as fragment,
        (${scoreParts})::float as rank,
        'fallback' as source
      from "KnowledgeBaseArticles" k
      where k.active = true
        and (${conditions})
      order by rank desc, k."updatedAt" desc
      limit 5
    `,
    {
      replacements,
      type: QueryTypes.SELECT
    }
  );
};

const getFullBaseFallback = async (): Promise<KnowledgeFragment[]> => {
  const articles = await KnowledgeBaseArticle.findAll({
    where: { active: true },
    order: [["updatedAt", "DESC"]],
    limit: 3
  });

  return articles.map(article => ({
    id: article.id,
    articleId: article.id,
    chunkId: undefined,
    title: article.title,
    section: "BASE COMPLETA AUTORIZADA",
    tags: article.tags,
    contentHtml: article.contentHtml,
    fragment: article.content || "",
    rank: 0.01,
    semanticScore: 0,
    keywordScore: 0,
    source: "fallback"
  }));
};

const SearchKnowledgeBaseService = async (
  message: string,
  options: SearchOptions = {}
): Promise<KnowledgeFragment[]> => {
  const terms = tokenize(message);
  const indexed = await ensureChunksIndexed();
  const rows = indexed
    ? await searchChunks(message, options)
    : await fallbackArticleSearch(message);

  const baseRows = rows.length
    ? rows
    : indexed
      ? rows
      : await fallbackArticleSearch(message);
  const fullBaseFallback = options.includeFullBaseFallback
    ? await getFullBaseFallback()
    : [];
  const finalRows = [
    ...baseRows,
    ...fullBaseFallback.filter(row =>
      !baseRows.some(baseRow => (baseRow.articleId || baseRow.id) === (row.articleId || row.id) && !baseRow.chunkId)
    )
  ];

  logger.info(
    {
      ticketId: options.ticketId || null,
      companyId: options.companyId || null,
      assistantId: options.aiSettingId || null,
      userMessage: options.userMessage || message,
      detectedIntent: options.detectedIntent || null,
      directedKnowledgeBaseQuery: options.directedKnowledgeBaseQuery || message,
      entities: options.entities || {},
      pendingResolved: false,
      knowledgeBaseSearch: true,
      searchQuery: terms.join(" "),
      retrievedChunks: finalRows.map(row => ({
        chunkId: row.chunkId || null,
        articleId: row.articleId || row.id,
        section: row.section || row.title,
        title: row.title,
        score: Number(row.rank || 0),
        semanticScore: Number(row.semanticScore || 0),
        keywordScore: Number(row.keywordScore || 0),
        contentPreview: row.fragment.slice(0, 200)
      })),
      toolCalled: null,
      toolResult: null,
      finalAnswer: null,
      grounded: finalRows.length > 0,
      usedOldFlow: false
    },
    "[AI RAG] Retrieved chunks before answer"
  );

  return finalRows;
};

export default SearchKnowledgeBaseService;
