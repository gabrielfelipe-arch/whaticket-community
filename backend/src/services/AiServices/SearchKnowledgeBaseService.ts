import { QueryTypes } from "sequelize";
import sequelize from "../../database";

export interface KnowledgeFragment {
  id: number;
  title: string;
  tags: string | null;
  fragment: string;
  rank: number;
}

const normalizeQuery = (message: string): string =>
  (message || "")
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
  diaria: ["diarias", "dia", "valor", "preco"],
  diarias: ["diaria", "dia", "valor", "preco"],
  senha: ["password", "login", "acesso"],
  password: ["senha", "login", "acesso"]
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

const SearchKnowledgeBaseService = async (
  message: string
): Promise<KnowledgeFragment[]> => {
  const terms = getSearchTerms(message);
  const query = buildTsQuery(terms);
  if (!query) return [];

  const rows = await sequelize.query<KnowledgeFragment>(
    `
      with search as (
        select to_tsquery('portuguese', :query) as q
      ),
      weighted_articles as (
        select
          k.id,
          k.title,
          k.tags,
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
        left(k.content, 900) as fragment,
        ts_rank_cd(k.document, search.q) as rank
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

  return rows;
};

export default SearchKnowledgeBaseService;
