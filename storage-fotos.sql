-- =====================================================================
-- Cidade Viva -- Storage das fotos dos registros
--
-- Rode no painel do Supabase: SQL Editor > New query > colar > Run.
--
-- Decisões:
--  * Bucket PÚBLICO: o mapa mostra a foto por um endereço direto, sem
--    precisar de login para ver (leitura pública, como a tabela registro).
--  * Só usuário logado envia, e só para a PRÓPRIA pasta (o primeiro
--    trecho do caminho é o id do usuário: "<uuid>/<arquivo>.jpg").
--  * Sem política de update/delete: ninguém altera nem apaga arquivos.
--  * O app sempre envia JPEG já reduzido, então o bucket aceita só
--    image/jpeg e até 5 MB.
--
-- NÃO testado contra um Supabase real (o ambiente de desenvolvimento não
-- tem o Storage). Se algum comando der erro, confira o nome das colunas
-- de storage.buckets e de storage.foldername() na documentação atual.
-- =====================================================================

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('fotos', 'fotos', true, 5242880, array['image/jpeg'])
on conflict (id) do nothing;

create policy "Fotos: usuario envia na propria pasta"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'fotos'
    and (storage.foldername(name))[1] = auth.uid()::text
  );