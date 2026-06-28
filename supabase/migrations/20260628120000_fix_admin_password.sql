-- Enable pgcrypto for crypt() and gen_salt()
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Fix admin password to a strong non-breached value
UPDATE auth.users
SET encrypted_password = extensions.crypt('Lensr@Admin2026!', extensions.gen_salt('bf')),
    email_confirmed_at = now(),
    updated_at = now()
WHERE email = 'admin@admin.com';
