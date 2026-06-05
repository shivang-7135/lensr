create table if not exists public.api_keys (
  name text primary key,
  value text not null default '',
  description text,
  updated_at timestamptz not null default now(),
  updated_by uuid
);

grant select, insert, update, delete on public.api_keys to authenticated;
grant all on public.api_keys to service_role;

alter table public.api_keys enable row level security;

create policy "Admins read api_keys" on public.api_keys for select to authenticated
  using (public.has_role(auth.uid(), 'admin'));
create policy "Admins insert api_keys" on public.api_keys for insert to authenticated
  with check (public.has_role(auth.uid(), 'admin'));
create policy "Admins update api_keys" on public.api_keys for update to authenticated
  using (public.has_role(auth.uid(), 'admin')) with check (public.has_role(auth.uid(), 'admin'));
create policy "Admins delete api_keys" on public.api_keys for delete to authenticated
  using (public.has_role(auth.uid(), 'admin'));

insert into public.api_keys (name, description) values
  ('SERPER_API_KEY', 'Serper.dev — Google Search results (primary)'),
  ('TAVILY_API_KEY', 'Tavily — deep web QA search (optional)'),
  ('AWS_ACCESS_KEY_ID', 'AWS access key for Bedrock'),
  ('AWS_SECRET_ACCESS_KEY', 'AWS secret access key for Bedrock'),
  ('AWS_REGION', 'AWS region (e.g. us-east-1)'),
  ('BEDROCK_MODEL_REASONING', 'Bedrock model id for reasoning'),
  ('BEDROCK_MODEL_ROUTER', 'Bedrock model id for intent routing'),
  ('BEDROCK_MODEL_VISION', 'Bedrock model id for vision (Insta)')
on conflict (name) do nothing;