-- Sangu — snapshot of the test data taken immediately before wiping it,
-- 2026-08-04, project swuqbwyauxepoeaxrtlk.
--
-- Restores the state that existed before the pilot with real Excel data began:
-- 4 accounts, 1 recurring expense, 1 instalment, 1 savings goal, base salary
-- 15jt, periods 2026-08 and 2026-09 with 8 items and 2 balances.
--
-- To restore, run the whole file in the Supabase SQL editor. Order matters —
-- the statements are already sorted so foreign keys resolve.
--
-- Only useful while the auth user 34be399e-5ee7-4bd6-b2ae-9f8c0711d012 exists;
-- every row is tied to it.

begin;

insert into accounts (id,user_id,name,is_salary_receiver,is_proxy,has_credit_card,is_active,sort_order) values ('f4c9ec75-c3f7-4948-91f4-101d8fdd9203','34be399e-5ee7-4bd6-b2ae-9f8c0711d012','BCA','t','f','f','t','0');
insert into accounts (id,user_id,name,is_salary_receiver,is_proxy,has_credit_card,is_active,sort_order) values ('bb55b4f7-3ae7-4e48-a3b0-a5ef22c8daa5','34be399e-5ee7-4bd6-b2ae-9f8c0711d012','Mandiri','f','f','t','t','0');
insert into accounts (id,user_id,name,is_salary_receiver,is_proxy,has_credit_card,is_active,sort_order) values ('264c7203-840c-450e-9df9-38022eee2241','34be399e-5ee7-4bd6-b2ae-9f8c0711d012','BRI','f','f','f','t','0');
insert into accounts (id,user_id,name,is_salary_receiver,is_proxy,has_credit_card,is_active,sort_order) values ('e090a1a1-5a1f-4113-9be8-f06892d84e00','34be399e-5ee7-4bd6-b2ae-9f8c0711d012','Jago','f','t','f','t','0');

insert into recurring_expenses (id,user_id,name,default_amount,account_id,payment_method,is_active) values ('5879f1d2-62a2-436f-973c-0c9074bfb98a','34be399e-5ee7-4bd6-b2ae-9f8c0711d012','Jajan','1750000','e090a1a1-5a1f-4113-9be8-f06892d84e00','debit','t');

insert into installments (id,user_id,name,monthly_amount,tenor_months,start_month,account_id,payment_method) values ('8875b9b6-9c4f-46b0-9a5e-353be56cf409','34be399e-5ee7-4bd6-b2ae-9f8c0711d012','Iphone','1000000','12','2026-08-01','f4c9ec75-c3f7-4948-91f4-101d8fdd9203','credit');

insert into savings_goals (id,user_id,name,target_amount,monthly_amount,account_id,target_date,is_active) values ('61a58ef5-51eb-4341-bdd3-b0269b5824ee','34be399e-5ee7-4bd6-b2ae-9f8c0711d012','Rumah','1500000000','5000000','264c7203-840c-450e-9df9-38022eee2241',NULL,'t');

insert into settings (user_id,base_salary) values ('34be399e-5ee7-4bd6-b2ae-9f8c0711d012','15000000');

insert into monthly_periods (id,user_id,month,actual_salary,note) values ('cf00f1fc-660f-4f65-9161-7f5fe283c8a4','34be399e-5ee7-4bd6-b2ae-9f8c0711d012','2026-08-01','18000000',NULL);
insert into monthly_periods (id,user_id,month,actual_salary,note) values ('1a7dfd7b-4811-486f-a6db-d59d12d39fed','34be399e-5ee7-4bd6-b2ae-9f8c0711d012','2026-09-01',NULL,NULL);

insert into monthly_items (id,user_id,period_id,name,amount,account_id,category,payment_method,is_paid,source_type,source_id) values ('1c2fc433-b6c0-4784-b8c0-9c625c438e1a','34be399e-5ee7-4bd6-b2ae-9f8c0711d012','cf00f1fc-660f-4f65-9161-7f5fe283c8a4','Tagihan Kartu Kredit','5000000','bb55b4f7-3ae7-4e48-a3b0-a5ef22c8daa5','card_bill','credit','f',NULL,NULL);
insert into monthly_items (id,user_id,period_id,name,amount,account_id,category,payment_method,is_paid,source_type,source_id) values ('459deadd-20ad-4cb0-a397-de89ee444c11','34be399e-5ee7-4bd6-b2ae-9f8c0711d012','cf00f1fc-660f-4f65-9161-7f5fe283c8a4','Iphone','1000000','f4c9ec75-c3f7-4948-91f4-101d8fdd9203','installment','credit','t','installment','8875b9b6-9c4f-46b0-9a5e-353be56cf409');
insert into monthly_items (id,user_id,period_id,name,amount,account_id,category,payment_method,is_paid,source_type,source_id) values ('a082b8c2-ff5c-45be-af5f-69b0e9de3d09','34be399e-5ee7-4bd6-b2ae-9f8c0711d012','cf00f1fc-660f-4f65-9161-7f5fe283c8a4','Jajan','1250000','e090a1a1-5a1f-4113-9be8-f06892d84e00','expense','debit','f','recurring','5879f1d2-62a2-436f-973c-0c9074bfb98a');
insert into monthly_items (id,user_id,period_id,name,amount,account_id,category,payment_method,is_paid,source_type,source_id) values ('dbd3fcbb-c005-40f9-9d04-400a66bab915','34be399e-5ee7-4bd6-b2ae-9f8c0711d012','cf00f1fc-660f-4f65-9161-7f5fe283c8a4','Rumah','5000000','264c7203-840c-450e-9df9-38022eee2241','saving','debit','t','saving','61a58ef5-51eb-4341-bdd3-b0269b5824ee');
insert into monthly_items (id,user_id,period_id,name,amount,account_id,category,payment_method,is_paid,source_type,source_id) values ('6c969e85-c681-4f3f-b3b3-1378d485ba90','34be399e-5ee7-4bd6-b2ae-9f8c0711d012','1a7dfd7b-4811-486f-a6db-d59d12d39fed','Jajan','1250000','e090a1a1-5a1f-4113-9be8-f06892d84e00','expense','debit','f','recurring','5879f1d2-62a2-436f-973c-0c9074bfb98a');
insert into monthly_items (id,user_id,period_id,name,amount,account_id,category,payment_method,is_paid,source_type,source_id) values ('86a44e7a-17d0-41e3-861f-0b5ff9aece61','34be399e-5ee7-4bd6-b2ae-9f8c0711d012','1a7dfd7b-4811-486f-a6db-d59d12d39fed','Iphone','1000000','f4c9ec75-c3f7-4948-91f4-101d8fdd9203','installment','credit','f','installment','8875b9b6-9c4f-46b0-9a5e-353be56cf409');
insert into monthly_items (id,user_id,period_id,name,amount,account_id,category,payment_method,is_paid,source_type,source_id) values ('06f12dd5-98c4-4400-822d-d61540a54e9e','34be399e-5ee7-4bd6-b2ae-9f8c0711d012','1a7dfd7b-4811-486f-a6db-d59d12d39fed','Rumah','5000000','264c7203-840c-450e-9df9-38022eee2241','saving','debit','f','saving','61a58ef5-51eb-4341-bdd3-b0269b5824ee');
insert into monthly_items (id,user_id,period_id,name,amount,account_id,category,payment_method,is_paid,source_type,source_id) values ('3f5c5306-9805-42d8-ba3c-4fe93bbda30b','34be399e-5ee7-4bd6-b2ae-9f8c0711d012','1a7dfd7b-4811-486f-a6db-d59d12d39fed','Tagihan Kartu Kredit','0','bb55b4f7-3ae7-4e48-a3b0-a5ef22c8daa5','card_bill','credit','f',NULL,NULL);

insert into monthly_balances (user_id,period_id,account_id,balance) values ('34be399e-5ee7-4bd6-b2ae-9f8c0711d012','cf00f1fc-660f-4f65-9161-7f5fe283c8a4','f4c9ec75-c3f7-4948-91f4-101d8fdd9203','700000');
insert into monthly_balances (user_id,period_id,account_id,balance) values ('34be399e-5ee7-4bd6-b2ae-9f8c0711d012','cf00f1fc-660f-4f65-9161-7f5fe283c8a4','e090a1a1-5a1f-4113-9be8-f06892d84e00','60000');

commit;
