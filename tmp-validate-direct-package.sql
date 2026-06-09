select title,
       position('REGRA DE PACOTE DIRETO EXATO' in content) as has_direct_rule,
       position('Recomendacao principal: pacote de 15h = R$ 900' in content) as has_simplified_example,
       position('NÃ£o precisa mencionar turno de 5h x 3' in content) as has_matrix_rule_encoding,
       position('Nao precisa mencionar turno de 5h x 3' in content) as has_matrix_rule_ascii,
       "updatedAt"
from "KnowledgeBaseArticles"
where title in ('Salinha', 'Matriz de Simulacao de Orcamentos - Salinha')
order by id;
