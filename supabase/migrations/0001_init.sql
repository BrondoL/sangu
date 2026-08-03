-- Enums
create type category as enum ('expense', 'installment', 'saving', 'card_bill');
create type payment_method as enum ('debit', 'credit');
create type source_type as enum ('recurring', 'installment', 'saving');

-- Definitions
create table accounts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) default auth.uid(),
  name text not null,
  is_salary_receiver boolean not null default false,
  is_proxy boolean not null default false,
  has_credit_card boolean not null default false,
  is_active boolean not null default true,
  sort_order integer not null default 0
);
-- At most one salary receiver / proxy per user.
create unique index one_salary_receiver on accounts (user_id) where is_salary_receiver;
create unique index one_proxy on accounts (user_id) where is_proxy;

create table recurring_expenses (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) default auth.uid(),
  name text not null,
  default_amount bigint not null default 0,
  account_id uuid not null references accounts(id),
  payment_method payment_method not null default 'debit',
  is_active boolean not null default true
);

create table installments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) default auth.uid(),
  name text not null,
  monthly_amount bigint not null default 0,
  tenor_months integer not null check (tenor_months > 0),
  start_month date not null,
  account_id uuid not null references accounts(id),
  payment_method payment_method not null default 'debit'
);

create table savings_goals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) default auth.uid(),
  name text not null,
  target_amount bigint,
  monthly_amount bigint not null default 0,
  account_id uuid not null references accounts(id),
  target_date date,
  is_active boolean not null default true
);

create table settings (
  user_id uuid primary key references auth.users(id) default auth.uid(),
  base_salary bigint not null default 0
);

-- Monthly snapshot
create table monthly_periods (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) default auth.uid(),
  month date not null,
  actual_salary bigint,
  note text,
  unique (user_id, month)
);

create table monthly_items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) default auth.uid(),
  period_id uuid not null references monthly_periods(id) on delete cascade,
  name text not null,
  amount bigint not null default 0,
  account_id uuid not null references accounts(id),
  category category not null,
  payment_method payment_method not null default 'debit',
  is_paid boolean not null default false,
  source_type source_type,
  source_id uuid
);
create index monthly_items_period on monthly_items (period_id);

create table monthly_balances (
  user_id uuid not null references auth.users(id) default auth.uid(),
  period_id uuid not null references monthly_periods(id) on delete cascade,
  account_id uuid not null references accounts(id),
  balance bigint not null default 0,
  primary key (period_id, account_id)
);

-- RLS
alter table accounts            enable row level security;
alter table recurring_expenses  enable row level security;
alter table installments        enable row level security;
alter table savings_goals       enable row level security;
alter table settings            enable row level security;
alter table monthly_periods     enable row level security;
alter table monthly_items       enable row level security;
alter table monthly_balances    enable row level security;

do $$
declare t text;
begin
  foreach t in array array[
    'accounts','recurring_expenses','installments','savings_goals',
    'settings','monthly_periods','monthly_items','monthly_balances'
  ] loop
    execute format(
      'create policy owner_all on %I for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid())',
      t
    );
  end loop;
end $$;
