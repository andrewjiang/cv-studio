insert into projects (id, name, slug)
values ('proj_machine_payments', 'Machine Payments', 'machine-payments')
on conflict (id) do nothing;

create table if not exists machine_payment_receipts (
  id text primary key,
  protocol text not null check (protocol in ('x402', 'mpp')),
  route_key text not null,
  amount_usd text not null,
  currency text not null default 'USD',
  network text,
  payment_method text,
  payer text,
  reference text,
  idempotency_key text,
  request_hash text not null,
  resume_id text references resumes(id),
  pdf_job_id text references pdf_jobs(id),
  raw_receipt jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create unique index if not exists machine_payment_receipts_protocol_reference_idx
on machine_payment_receipts(protocol, reference)
where reference is not null;

create index if not exists machine_payment_receipts_route_lookup_idx
on machine_payment_receipts(route_key, created_at desc);

create index if not exists machine_payment_receipts_resume_lookup_idx
on machine_payment_receipts(resume_id);

create index if not exists machine_payment_receipts_pdf_job_lookup_idx
on machine_payment_receipts(pdf_job_id);
