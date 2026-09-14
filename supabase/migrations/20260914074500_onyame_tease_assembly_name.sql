-- Correct the local assembly name to Onyame Tease.
-- Emails, login domains, and member codes stay as they are.

UPDATE public.assemblies
SET
  assembly_name = 'Onyame Tease Assembly',
  location = CASE
    WHEN location ILIKE '%Oyame%' THEN regexp_replace(location, 'Oyame', 'Onyame', 'gi')
    WHEN location IS NULL OR btrim(location) = '' THEN 'Onyame Tease'
    ELSE location
  END,
  address = CASE
    WHEN address ILIKE '%Oyame%' THEN regexp_replace(address, 'Oyame', 'Onyame', 'gi')
    ELSE address
  END
WHERE assembly_name ILIKE '%Oyame%'
   OR location ILIKE '%Oyame%'
   OR address ILIKE '%Oyame%';

ALTER TABLE public.assemblies
  ALTER COLUMN assembly_name SET DEFAULT 'Onyame Tease Assembly';

UPDATE public.church_themes
SET description = regexp_replace(description, 'Oyame', 'Onyame', 'gi')
WHERE description ILIKE '%Oyame%';
