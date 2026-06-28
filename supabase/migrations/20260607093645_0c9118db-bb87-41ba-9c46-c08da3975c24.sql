
-- 1. (Removed) No longer rotate admin password — it is set in the seed migration.

-- 2. Lock down user_roles: only admins may insert/update/delete
DROP POLICY IF EXISTS "Admins manage user_roles insert" ON public.user_roles;
DROP POLICY IF EXISTS "Admins manage user_roles update" ON public.user_roles;
DROP POLICY IF EXISTS "Admins manage user_roles delete" ON public.user_roles;

CREATE POLICY "Admins manage user_roles insert"
  ON public.user_roles FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));

CREATE POLICY "Admins manage user_roles update"
  ON public.user_roles FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::public.app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));

CREATE POLICY "Admins manage user_roles delete"
  ON public.user_roles FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::public.app_role));

-- 3. Storage UPDATE policy for insta-images (owner-only by first folder segment)
DROP POLICY IF EXISTS "Users update own insta images" ON storage.objects;
CREATE POLICY "Users update own insta images"
  ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'insta-images' AND (storage.foldername(name))[1] = auth.uid()::text)
  WITH CHECK (bucket_id = 'insta-images' AND (storage.foldername(name))[1] = auth.uid()::text);
