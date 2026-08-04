-- Both tables cascade from recurring_expenses, but recurring_expense_id is only
-- the second column of their composite primary keys, which Postgres cannot use
-- for a lookup by that column alone. Same reason monthly_items_period exists in
-- 0001.
create index tracked_budgets_recurring on tracked_budgets (recurring_expense_id);
create index budget_months_recurring on budget_months (recurring_expense_id);
