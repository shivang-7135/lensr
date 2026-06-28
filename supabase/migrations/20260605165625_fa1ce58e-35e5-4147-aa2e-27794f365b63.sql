
-- Enable pgcrypto for crypt() and gen_salt()
CREATE EXTENSION IF NOT EXISTS pgcrypto;

DO $$
DECLARE
  admin_uid uuid;
BEGIN
  SELECT id INTO admin_uid FROM auth.users WHERE email = 'admin@admin.com';

  IF admin_uid IS NULL THEN
    admin_uid := gen_random_uuid();
    INSERT INTO auth.users (
      instance_id, id, aud, role, email, encrypted_password,
      email_confirmed_at, raw_app_meta_data, raw_user_meta_data,
      created_at, updated_at, confirmation_token, email_change,
      email_change_token_new, recovery_token
    ) VALUES (
      '00000000-0000-0000-0000-000000000000', admin_uid, 'authenticated', 'authenticated',
      'admin@admin.com', extensions.crypt('Lensr@Admin2026!', extensions.gen_salt('bf')),
      now(), '{"provider":"email","providers":["email"]}'::jsonb,
      '{"display_name":"admin"}'::jsonb, now(), now(), '', '', '', ''
    );
    INSERT INTO auth.identities (id, user_id, identity_data, provider, provider_id, last_sign_in_at, created_at, updated_at)
    VALUES (gen_random_uuid(), admin_uid,
      jsonb_build_object('sub', admin_uid::text, 'email', 'admin@admin.com', 'email_verified', true),
      'email', admin_uid::text, now(), now(), now());
  END IF;

  INSERT INTO public.profiles (id, email, display_name)
  VALUES (admin_uid, 'admin@admin.com', 'admin')
  ON CONFLICT (id) DO NOTHING;

  INSERT INTO public.user_roles (user_id, role)
  VALUES (admin_uid, 'admin'),
         (admin_uid, 'user')
  ON CONFLICT (user_id, role) DO NOTHING;
END $$;
