-- Fix admin password to meet 8-char minimum
UPDATE auth.users
SET encrypted_password = crypt('admin123', gen_salt('bf')),
    updated_at = now()
WHERE email = 'admin@admin.com';
