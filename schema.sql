-- ================================================
-- ORIGEM OUTDOOR — Schema completo do banco
-- Execute no Supabase SQL Editor
-- ================================================

-- Extensão para UUIDs
create extension if not exists "uuid-ossp";

-- ================================================
-- CLIENTES
-- ================================================
create table clientes (
  id uuid primary key default uuid_generate_v4(),
  nome text not null,
  empresa text,
  cpf_cnpj text,
  telefone text,
  email text,
  data_nascimento date,
  pede_nota boolean default false,
  observacoes text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- ================================================
-- PLACAS
-- ================================================
create table placas (
  id uuid primary key default uuid_generate_v4(),
  nome text not null,
  endereco text not null,
  cidade text default 'Teixeira de Freitas',
  tipo text not null check (tipo in ('simples', 'dupla')),
  -- simples = 9x3m (1 face), dupla = 18x3m (2 faces)
  custo_montagem numeric(10,2) default 0,
  aluguel_terreno_mensal numeric(10,2) default 0,
  proprietario_terreno text,
  contato_proprietario text,
  em_sociedade boolean default false,
  percentual_sociedade numeric(5,2) default 100, -- % que é seu
  socio_nome text,
  status text default 'ativa' check (status in ('ativa', 'manutencao', 'inativa')),
  foto_url text,
  observacoes text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- ================================================
-- CONTRATOS
-- ================================================
create table contratos (
  id uuid primary key default uuid_generate_v4(),
  placa_id uuid references placas(id) on delete cascade,
  face text default 'A' check (face in ('A', 'B', 'AB')),
  -- A ou B para dupla individual, AB para dupla completa
  cliente_id uuid references clientes(id),
  
  -- Período
  data_inicio date not null,
  data_fim date not null,
  duracao_tipo text check (duracao_tipo in ('14d', '28d', '3m', '6m', '1a', 'custom')),
  
  -- Modalidade
  modalidade text not null check (modalidade in ('veiculacao', 'completo')),
  -- veiculacao = só espaço, completo = espaço + arte + impressão
  
  -- Receitas
  valor_veiculacao numeric(10,2) default 0,
  valor_arte numeric(10,2) default 0,
  valor_impressao numeric(10,2) default 0,
  valor_total numeric(10,2) generated always as (valor_veiculacao + valor_arte + valor_impressao) stored,
  
  -- Custos
  custo_colador numeric(10,2) default 0,
  custo_impressao numeric(10,2) default 0,
  custo_terreno_proporcional numeric(10,2) default 0,
  custo_extra numeric(10,2) default 0,
  descricao_custo_extra text,
  percentual_imposto numeric(5,2) default 0,
  valor_imposto numeric(10,2) default 0,
  
  -- Financeiro
  emite_nota boolean default false,
  forma_pagamento text check (forma_pagamento in ('pix', 'dinheiro', 'transferencia', 'boleto')),
  condicao_pagamento text check (condicao_pagamento in ('antecipado', 'pos_veiculacao', 'parcelado')),
  status_pagamento text default 'aguardando' check (status_pagamento in ('aguardando', 'pago', 'parcial', 'atrasado')),
  data_pagamento date,
  observacoes_pagamento text,
  
  -- Contrato histórico?
  historico boolean default false,
  
  -- Status geral
  status text default 'ativo' check (status in ('ativo', 'encerrado', 'renovado', 'cancelado')),
  observacoes text,
  
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- ================================================
-- COMISSÕES / SUBLOCAÇÃO (placas de terceiros)
-- ================================================
create table comissoes (
  id uuid primary key default uuid_generate_v4(),
  descricao text not null,
  -- ex: "Placa Fulano de Tal - Av. Brasil"
  cliente_id uuid references clientes(id),
  valor_negociado numeric(10,2) not null,
  percentual_comissao numeric(5,2) default 20,
  valor_comissao numeric(10,2) generated always as (valor_negociado * percentual_comissao / 100) stored,
  data_inicio date,
  data_fim date,
  status_pagamento text default 'aguardando' check (status_pagamento in ('aguardando', 'pago', 'atrasado')),
  data_pagamento date,
  observacoes text,
  created_at timestamptz default now()
);

-- ================================================
-- ALERTAS (gerados automaticamente via view)
-- ================================================
create view alertas as
  -- Contratos vencendo em 30 dias
  select
    'vencimento' as tipo,
    c.id,
    p.nome as placa_nome,
    cl.nome as cliente_nome,
    c.data_fim as data_referencia,
    (c.data_fim - current_date) as dias_restantes,
    case
      when (c.data_fim - current_date) <= 7 then 'critico'
      when (c.data_fim - current_date) <= 15 then 'atencao'
      else 'aviso'
    end as nivel
  from contratos c
  join placas p on p.id = c.placa_id
  left join clientes cl on cl.id = c.cliente_id
  where c.status = 'ativo'
    and c.data_fim between current_date and current_date + 30

  union all

  -- Aniversários de clientes em 30 dias
  select
    'aniversario' as tipo,
    cl.id,
    null as placa_nome,
    cl.nome as cliente_nome,
    (date_trunc('year', current_date) + (cl.data_nascimento - date_trunc('year', cl.data_nascimento)))::date as data_referencia,
    (
      (date_trunc('year', current_date) + (cl.data_nascimento - date_trunc('year', cl.data_nascimento)))::date
      - current_date
    ) as dias_restantes,
    'aviso' as nivel
  from clientes cl
  where cl.data_nascimento is not null
    and (
      (date_trunc('year', current_date) + (cl.data_nascimento - date_trunc('year', cl.data_nascimento)))::date
      - current_date
    ) between 0 and 30;

-- ================================================
-- RLS POLICIES (segurança)
-- ================================================
alter table clientes enable row level security;
alter table placas enable row level security;
alter table contratos enable row level security;
alter table comissoes enable row level security;

-- Usuários autenticados podem fazer tudo
create policy "auth_all_clientes" on clientes for all to authenticated using (true) with check (true);
create policy "auth_all_placas" on placas for all to authenticated using (true) with check (true);
create policy "auth_all_contratos" on contratos for all to authenticated using (true) with check (true);
create policy "auth_all_comissoes" on comissoes for all to authenticated using (true) with check (true);

-- ================================================
-- STORAGE para fotos das placas
-- ================================================
insert into storage.buckets (id, name, public) values ('placas-fotos', 'placas-fotos', true)
on conflict do nothing;

create policy "fotos_public_read" on storage.objects for select using (bucket_id = 'placas-fotos');
create policy "fotos_auth_write" on storage.objects for insert to authenticated with check (bucket_id = 'placas-fotos');
create policy "fotos_auth_delete" on storage.objects for delete to authenticated using (bucket_id = 'placas-fotos');

-- ================================================
-- FUNÇÃO: atualizar updated_at automaticamente
-- ================================================
create or replace function update_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger trg_clientes_updated before update on clientes for each row execute function update_updated_at();
create trigger trg_placas_updated before update on placas for each row execute function update_updated_at();
create trigger trg_contratos_updated before update on contratos for each row execute function update_updated_at();
