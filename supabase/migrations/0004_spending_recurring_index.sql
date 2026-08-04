-- spending.recurring_expense_id carries an `on delete set null` FK, so deleting
-- a recurring expense makes Postgres find every spending row pointing at it.
-- spending_by_month is (user_id, occurred_on) and cannot serve that lookup, and
-- unlike tracked_budgets and budget_months this column is in no key at all.
-- Same reasoning as 0003; this table was the one it missed.
create index spending_recurring on spending (recurring_expense_id);
