-- BTech Audit — Migration inicial
-- Rodar no SQL Editor do Supabase

create table if not exists public.audit_profiles (
  id                    uuid primary key references auth.users(id) on delete cascade,
  email                 text,
  hotel_name            text not null default '',
  subscription_status   text not null default 'trial',  -- trial | active | canceled
  stripe_customer_id    text,
  stripe_subscription_id text,
  total_uh              int default null,               -- total de UHs do hotel (para calcular ocupação %)
  created_at            timestamptz default now(),
  updated_at            timestamptz default now()
);

-- Configuração de mapeamento por hotel (multi-tenant)
create table if not exists public.audit_hotel_config (
  id               uuid primary key default gen_random_uuid(),
  user_id          uuid references auth.users(id) on delete cascade,
  sep_csv          text default ';',
  col_status       text default 'Status',
  col_hospede      text default 'Hóspede',
  col_uh           text default 'UH',
  col_diaria       text default 'Vlr. diária',
  col_chegada      text default 'Chegada',
  col_partida      text default 'Partida',
  col_segmento     text default 'Segmento',
  col_origem       text default 'Origem',
  col_obs          text default 'OBSERVACOES',
  col_confidencial text default 'Confidencial',
  col_grupo        text default 'Grupo',
  created_at       timestamptz default now(),
  updated_at       timestamptz default now(),
  unique (user_id)
);

-- RLS
alter table public.audit_profiles     enable row level security;
alter table public.audit_hotel_config enable row level security;

create policy "users_own_profile" on public.audit_profiles
  for all using (auth.uid() = id);

create policy "users_own_config" on public.audit_hotel_config
  for all using (auth.uid() = user_id);

-- Trigger para copiar email do auth.users
create or replace function public.audit_handle_new_user()
returns trigger language plpgsql security definer as $$
begin
  insert into public.audit_profiles (id, email, hotel_name, subscription_status)
  values (new.id, new.email, '', 'trial')
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_audit_auth_user_created on auth.users;
create trigger on_audit_auth_user_created
  after insert on auth.users
  for each row execute procedure public.audit_handle_new_user();
