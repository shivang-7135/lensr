
REVOKE EXECUTE ON FUNCTION public.has_role(UUID, public.app_role) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;

-- Storage policies for insta-images bucket
CREATE POLICY "Users upload own insta images" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'insta-images' AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY "Users read own insta images" ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'insta-images' AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY "Users delete own insta images" ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'insta-images' AND (storage.foldername(name))[1] = auth.uid()::text);
