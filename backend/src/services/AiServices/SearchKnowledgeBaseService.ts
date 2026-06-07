import { QueryTypes } from "sequelize";
import sequelize from "../../database";
import { logger } from "../../utils/logger";

export interface KnowledgeFragment {
  id: number;
  title: string;
  tags: string | null;
  fragment: string;
  contentHtml?: string | null;
  rank: number;
  source: "fts" | "fallback";
}

const normalizeQuery = (message: string): string =>
  (message || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .split(/\s+/)
    .map(term => term.trim())
    .filter(Boolean)
    .join(" ");

const STOPWORDS = new Set([
  "a",
  "as",
  "ao",
  "aos",
  "o",
  "os",
  "de",
  "da",
  "das",
  "do",
  "dos",
  "e",
  "em",
  "no",
  "na",
  "nos",
  "nas",
  "um",
  "uma",
  "uns",
  "umas",
  "me",
  "te",
  "se",
  "que",
  "qual",
  "quais",
  "quero",
  "queria",
  "saber",
  "sobre",
  "por",
  "pra",
  "para",
  "favor",
  "ola",
  "oi",
  "bom",
  "boa",
  "dia",
  "tarde",
  "noite"
]);

const SYNONYMS: Record<string, string[]> = {
  preco: ["valor", "orcamento", "custo", "custar", "precos"],
  precos: ["preco", "valor", "orcamento", "custo"],
  valor: ["preco", "orcamento", "custo"],
  valores: ["valor", "preco", "orcamento", "custo"],
  custa: ["valor", "preco", "orcamento", "custo"],
  custar: ["valor", "preco", "orcamento", "custo"],
  custo: ["valor", "preco", "orcamento"],
  orcamento: ["valor", "preco", "custo", "proposta"],
  orsameto: ["orcamento", "valor", "preco", "custo"],
  orcamentos: ["orcamento", "valor", "preco"],
  qto: ["quanto", "valor", "preco", "orcamento", "custo"],
  quanto: ["valor", "preco", "orcamento", "custo"],
  diaria: ["diarias", "dia", "valor", "preco"],
  diarias: ["diaria", "dia", "valor", "preco"],
  senha: ["password", "login", "acesso"],
  password: ["senha", "login", "acesso"],
  erro: ["problema", "falha", "bug", "travamento", "funciona"],
  problema: ["erro", "falha", "bug", "travamento"],
  falha: ["erro", "problema", "bug"],
  travando: ["travamento", "erro", "problema"],
  travamento: ["travando", "erro", "problema"],
  finalizar: ["encerrar", "concluir", "salvar"],
  finaliza: ["finalizar", "encerrar", "concluir"],
  encerrar: ["finalizar", "concluir", "fechar"],
  concluir: ["finalizar", "encerrar", "salvar"],
  salvar: ["gravar", "concluir", "finalizar"],
  tela: ["pagina", "janela", "sistema"],
  branco: ["branca", "vazia", "carrega"],
  branca: ["branco", "vazia", "carrega"],
  agendar: ["marcar", "agenda", "horario", "consulta"],
  agendamento: ["agenda", "marcar", "horario", "consulta"],
  promocao: ["desconto", "oferta", "condicao"],
  desconto: ["promocao", "oferta", "condicao"]
};

const getSearchTerms = (message: string): string[] => {
  const normalized = normalizeQuery(message);
  if (!normalized) return [];

  const terms = normalized
    .split(/\s+/)
    .map(term => term.trim())
    .filter(term => term.length >= 2 && !STOPWORDS.has(term));

  const expanded = terms.reduce<string[]>(
    (acc, term) => [...acc, term, ...(SYNONYMS[term] || [])],
    []
  );
  return Array.from(new Set(expanded)).slice(0, 16);
};

const buildTsQuery = (terms: string[]): string =>
  terms
    .map(term => term.replace(/[^a-zA-Z0-9]/g, ""))
    .filter(Boolean)
    .map(term => `${term}:*`)
    .join(" | ");

const KNOWLEDGE_CONTEXT_LIMIT = 16000;

const runFullTextSearch = async (query: string): Promise<KnowledgeFragment[]> =>
  sequelize.query<KnowledgeFragment>(
    `
      with search as (
        select to_tsquery('portuguese', :query) as q
      ),
      weighted_articles as (
        select
        k.id,
        k.title,
        k.tags,
        k."contentHtml",
        k.content,
          k."updatedAt",
          (
            setweight(to_tsvector('portuguese', coalesce(k.title, '')), 'A') ||
            setweight(to_tsvector('portuguese', coalesce(k.tags, '')), 'A') ||
            setweight(to_tsvector('portuguese', coalesce(k.content, '')), 'B')
          ) as document
        from "KnowledgeBaseArticles" k
        where k.active = true
      )
      select
        k.id,
        k.title,
        k.tags,
        k."contentHtml",
        left(k.content, ${KNOWLEDGE_CONTEXT_LIMIT}) as fragment,
        ts_rank_cd(k.document, search.q) as rank,
        'fts' as source
      from weighted_articles k, search
      where k.document @@ search.q
      order by rank desc, k."updatedAt" desc
      limit 2
    `,
    {
      replacements: { query },
      type: QueryTypes.SELECT
    }
  );

const runFallbackSearch = async (terms: string[]): Promise<KnowledgeFragment[]> => {
  const safeTerms = terms.slice(0, 8);
  if (!safeTerms.length) return [];

  const conditions = safeTerms
    .map((_, index) => `
      k.title ilike :term${index}
      or k.tags ilike :term${index}
      or k.content ilike :term${index}
    `)
    .join(" or ");

  const scoreParts = safeTerms
    .map((_, index) => `
      case when k.title ilike :term${index} then 4 else 0 end +
      case when k.tags ilike :term${index} then 3 else 0 end +
      case when k.content ilike :term${index} then 1 else 0 end
    `)
    .join(" + ");

  const replacements = safeTerms.reduce<Record<string, string>>((acc, term, index) => {
    acc[`term${index}`] = `%${term}%`;
    return acc;
  }, {});

  return sequelize.query<KnowledgeFragment>(
    `
      select
        k.id,
        k.title,
        k.tags,
        k."contentHtml",
        left(k.content, ${KNOWLEDGE_CONTEXT_LIMIT}) as fragment,
        (${scoreParts})::float as rank,
        'fallback' as source
      from "KnowledgeBaseArticles" k
      where k.active = true
        and (${conditions})
      order by rank desc, k."updatedAt" desc
      limit 2
    `,
    {
      replacements,
      type: QueryTypes.SELECT
    }
  );
};

const SearchKnowledgeBaseService = async (
  message: string
): Promise<KnowledgeFragment[]> => {
  const terms = getSearchTerms(message);
  const query = buildTsQuery(terms);
  if (!query) return [];

  let rows = await runFullTextSearch(query);
  if (!rows.length) {
    rows = await runFallbackSearch(terms);
  }

  logger.info(
    {
      terms,
      query,
      found: rows.length,
      results: rows.map(row => ({
        id: row.id,
        title: row.title,
        rank: row.rank,
        source: row.source
      }))
    },
    "[AI RAG] Knowledge search completed"
  );

  return rows;
};

export default SearchKnowledgeBaseService;
