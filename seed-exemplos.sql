insert into registro
  (categoria, subcategoria_id, descricao, foto_url, localizacao,
   endereco_rua, endereco_bairro, endereco_cidade)
values
  ('HOSTIL',
   (select id from subcategoria where nome = 'Espeto' and categoria = 'HOSTIL'),
   null,
   'https://example.com/seed-teste-1.jpg',
   extensions.st_setsrid(extensions.st_makepoint(-40.3372, -20.3188), 4326)::extensions.geography,
   'Av. Jerônimo Monteiro', 'Centro', 'Vitória'),

  ('HOSPITALEIRO',
   (select id from subcategoria where nome = 'Banco de Descanso' and categoria = 'HOSPITALEIRO'),
   'Banco sob a sombra de uma árvore.',
   'https://example.com/seed-teste-2.jpg',
   extensions.st_setsrid(extensions.st_makepoint(-40.3401, -20.3210), 4326)::extensions.geography,
   'Parque Moscoso', 'Centro', 'Vitória'),

  ('HOSTIL',
   (select id from subcategoria where nome = 'Outro' and categoria = 'HOSTIL'),
   'Grade baixa que impede sentar na mureta.',
   'https://example.com/seed-teste-3.jpg',
   extensions.st_setsrid(extensions.st_makepoint(-40.3355, -20.3172), 4326)::extensions.geography,
   'Rua Sete de Setembro', 'Centro', 'Vitória');

-- Conferir: deve listar 3 linhas.
select * from registros_do_mapa();
