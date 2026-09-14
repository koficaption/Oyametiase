-- Correct the local assembly spelling to Oyame Tease.
-- Emails, login domains, and member codes stay as they are.

UPDATE public.assemblies
SET
  assembly_name = 'Oyame Tease Assembly',
  location = CASE
    WHEN location ILIKE '%Tiase%' THEN regexp_replace(location, 'Tiase', 'Tease', 'gi')
    WHEN location IS NULL OR btrim(location) = '' THEN 'Oyame Tease'
    ELSE location
  END,
  address = CASE
    WHEN address ILIKE '%Tiase%' THEN regexp_replace(address, 'Tiase', 'Tease', 'gi')
    ELSE address
  END
WHERE assembly_name ILIKE '%Tiase%'
   OR location ILIKE '%Tiase%'
   OR address ILIKE '%Tiase%';

ALTER TABLE public.assemblies
  ALTER COLUMN assembly_name SET DEFAULT 'Oyame Tease Assembly';

UPDATE public.church_themes
SET description = regexp_replace(description, 'Oyame Tiase Assembly', 'Oyame Tease Assembly', 'gi')
WHERE description ILIKE '%Tiase%';
