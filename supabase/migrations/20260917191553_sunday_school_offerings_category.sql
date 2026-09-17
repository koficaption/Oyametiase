INSERT INTO public.financial_categories (assembly_id, name, slug, type, is_system)
SELECT a.id, 'Sunday school offerings', 'sunday-school-offerings', 'income', true
FROM public.assemblies a
ON CONFLICT (assembly_id, slug) DO NOTHING;

NOTIFY pgrst, 'reload schema';
