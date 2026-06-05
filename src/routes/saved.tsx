import { createFileRoute, redirect } from "@tanstack/react-router";

// Convenience redirect so the header can link to /saved without knowing the
// authenticated layout path.
export const Route = createFileRoute("/saved")({
  beforeLoad: () => { throw redirect({ to: "/_authenticated/saved" as never }); },
  component: () => null,
});
