-- =====================================================================
-- Cidade Viva -- Tabela de notícias (aba "Notícias" da tela Aprender)
--
-- Rode no painel do Supabase: SQL Editor > New query > colar > Run.
--
-- Curadoria manual: as notícias são cadastradas por você, pelo painel
-- (Table Editor > noticia > Insert row) ou por SQL. O app só LÊ.
--
-- Direitos autorais: guarde apenas título, fonte, link e um RESUMO
-- ESCRITO POR VOCÊ. Não copie o texto da matéria.
-- =====================================================================

-- Mesmo critério da tabela "registro": um tipo fixo e exclusivo, garantido
-- pelo próprio ENUM.
create type tipo_noticia as enum ('POLITICA_LEIS', 'CULTURA_DEBATE', 'ACAO_CONTRA');

create table noticia (
  id               serial primary key,
  titulo           text not null,
  fonte            text not null,            -- nome do veículo, ex.: "Nome do jornal"
  url              text not null,            -- link para a matéria original
  data_publicacao  date not null,            -- data da matéria (não a do cadastro)
  resumo           text not null,            -- 1 a 2 frases, escritas por você
  tipo             tipo_noticia not null,
  criado_em        timestamptz not null default now(),

  -- O app só transforma em link o que começa com http(s). Esta regra impede
  -- que um endereço fora do padrão entre no banco.
  constraint noticia_url_http check (url ~* '^https?://')
);

-- Ordenação da lista, da mais recente para a mais antiga.
create index noticia_data_idx on noticia (data_publicacao desc);

-- RLS: leitura pública. Sem política de insert/update/delete, ninguém
-- altera pela API; o painel do Supabase continua podendo, porque age com
-- permissão de administrador.
alter table noticia enable row level security;

create policy "Notícias são públicas para leitura"
  on noticia for select
  using (true);

-- =====================================================================
-- EXEMPLOS (apenas para ver a tela funcionando)
--
-- Textos e links são FICTÍCIOS e marcados como exemplo. Troque pelas
-- matérias reais e apague estes depois com:
--
--   delete from noticia where url like 'https://example.com/exemplo-%';
-- =====================================================================

insert into noticia (titulo, fonte, url, data_publicacao, resumo, tipo) values
  ('[EXEMPLO] Título de uma notícia sobre projeto de lei',
   'Nome do veículo', 'https://example.com/exemplo-1', '2026-10-01',
   'Resumo de exemplo, que você escreve com suas palavras.', 'POLITICA_LEIS'),
  ('[EXEMPLO] Título de uma matéria sobre debate cultural',
   'Nome do veículo', 'https://example.com/exemplo-2', '2026-09-20',
   'Resumo de exemplo, que você escreve com suas palavras.', 'CULTURA_DEBATE'),
  ('[EXEMPLO] Título de uma matéria sobre ação contra arquitetura hostil',
   'Nome do veículo', 'https://example.com/exemplo-3', '2026-09-05',
   'Resumo de exemplo, que você escreve com suas palavras.', 'ACAO_CONTRA');

-- Conferir: deve listar 3 linhas, da mais recente para a mais antiga.
select id, titulo, tipo, data_publicacao from noticia order by data_publicacao desc;