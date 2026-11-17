-- Add nullable profile fields without changing any existing customer values.
ALTER TABLE public.customers
 ADD COLUMN IF NOT EXISTS first_name text,
 ADD COLUMN IF NOT EXISTS last_name text;
