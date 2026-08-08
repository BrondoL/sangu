-- A month may deliberately leave out a definition: a subscription is paused, or
-- a sync produced a row that should not be there. Deleting the row is not
-- enough. generateMonth decides what to create by asking which source_ids are
-- already in the period, so an absence reads as an omission to repair and the
-- next sync puts the row straight back. This column is the month's memory of
-- what it left out on purpose.
--
-- The ids are polymorphic — recurring_expenses, installments or savings_goals —
-- so no foreign key is possible, which is also why this is a column and not a
-- table. monthly_periods already carries the owner_all policy from 0001, so
-- there is no new RLS to write.
alter table monthly_periods
  add column excluded_source_ids uuid[] not null default '{}';
