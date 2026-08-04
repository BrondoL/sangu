-- Budget control. Reads recurring_expenses; never writes it.

-- Which recurring expenses are followed here. Membership only.
create table tracked_budgets (
  user_id uuid not null references auth.users(id) default auth.uid(),
  recurring_expense_id uuid not null references recurring_expenses(id) on delete cascade,
  sort_order integer not null default 0,
  primary key (user_id, recurring_expense_id)
);

-- What the budget was in a given month, captured the first time the month is
-- seen. Without this, raising a budget rewrites the history that justified
-- raising it.
create table budget_months (
  user_id uuid not null references auth.users(id) default auth.uid(),
  recurring_expense_id uuid not null references recurring_expenses(id) on delete cascade,
  month date not null,
  amount bigint not null,
  primary key (user_id, recurring_expense_id, month)
);

-- One expense, as it happened. A null recurring_expense_id is "tak terduga":
-- deleting a definition must never delete money that was actually spent.
create table spending (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) default auth.uid(),
  occurred_on date not null,
  amount bigint not null check (amount > 0),
  recurring_expense_id uuid references recurring_expenses(id) on delete set null,
  note text,
  created_at timestamptz not null default now()
);
create index spending_by_month on spending (user_id, occurred_on);

alter table tracked_budgets enable row level security;
alter table budget_months   enable row level security;
alter table spending        enable row level security;

do $$
declare t text;
begin
  foreach t in array array['tracked_budgets','budget_months','spending'] loop
    execute format(
      'create policy owner_all on %I for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid())',
      t
    );
  end loop;
end $$;
