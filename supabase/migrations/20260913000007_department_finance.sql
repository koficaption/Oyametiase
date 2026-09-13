-- Each ministry keeps its own money books, separate from assembly tithes/offerings
-- and from every other department. NULL department_id = main church treasury.

ALTER TABLE public.financial_transactions
  ADD COLUMN IF NOT EXISTS department_id uuid REFERENCES public.departments (id) ON DELETE SET NULL;

COMMENT ON COLUMN public.financial_transactions.department_id IS
  'NULL = assembly / main church treasury. Non-null = that ministry''s isolated books.';

CREATE INDEX IF NOT EXISTS financial_transactions_department_idx
  ON public.financial_transactions (assembly_id, department_id)
  WHERE department_id IS NOT NULL;

-- Assembly treasury helpers stay PE + treasurer so finance documents/storage
-- policies do not change. Transaction row access is scoped below.

CREATE OR REPLACE FUNCTION app_private.can_read_transaction(txn public.financial_transactions)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
  SELECT
    CASE
      WHEN app_private.is_admin() THEN true
      WHEN app_private.has_role(ARRAY['treasurer']) THEN txn.department_id IS NULL
      WHEN app_private.has_role(ARRAY['department_leader'])
        AND txn.department_id IS NOT NULL
        AND app_private.leads_department(txn.department_id) THEN true
      ELSE false
    END;
$$;

CREATE OR REPLACE FUNCTION app_private.can_write_transaction(txn public.financial_transactions)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
  SELECT
    CASE
      WHEN app_private.has_role(ARRAY['treasurer']) THEN txn.department_id IS NULL
      WHEN app_private.has_role(ARRAY['department_leader'])
        AND txn.department_id IS NOT NULL
        AND app_private.leads_department(txn.department_id) THEN true
      ELSE false
    END;
$$;

GRANT EXECUTE ON FUNCTION app_private.can_read_transaction(public.financial_transactions) TO authenticated;
GRANT EXECUTE ON FUNCTION app_private.can_write_transaction(public.financial_transactions) TO authenticated;

DROP POLICY IF EXISTS financial_transactions_select ON public.financial_transactions;
DROP POLICY IF EXISTS financial_transactions_insert ON public.financial_transactions;
DROP POLICY IF EXISTS financial_transactions_update ON public.financial_transactions;
DROP POLICY IF EXISTS financial_transactions_delete ON public.financial_transactions;

CREATE POLICY financial_transactions_select ON public.financial_transactions
  FOR SELECT TO authenticated
  USING (app_private.can_read_transaction(financial_transactions));
CREATE POLICY financial_transactions_insert ON public.financial_transactions
  FOR INSERT TO authenticated
  WITH CHECK (app_private.can_write_transaction(financial_transactions));
CREATE POLICY financial_transactions_update ON public.financial_transactions
  FOR UPDATE TO authenticated
  USING (app_private.can_write_transaction(financial_transactions))
  WITH CHECK (app_private.can_write_transaction(financial_transactions));
CREATE POLICY financial_transactions_delete ON public.financial_transactions
  FOR DELETE TO authenticated
  USING (app_private.can_write_transaction(financial_transactions));

-- Category labels only (no amounts). Ministry leaders need them to record income.
DROP POLICY IF EXISTS financial_categories_select ON public.financial_categories;
CREATE POLICY financial_categories_select ON public.financial_categories
  FOR SELECT TO authenticated
  USING (
    app_private.can_read_finance()
    OR app_private.has_role(ARRAY['department_leader'])
  );

NOTIFY pgrst, 'reload schema';
