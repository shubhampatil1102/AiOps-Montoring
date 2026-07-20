import ErrorPage from "@/components/errors/ErrorPage";

export default function Forbidden() {
  return (
    <ErrorPage
      code="403"
      title="Access denied"
      message="Your role doesn't have permission to view this page. If you think this is a mistake, contact an administrator."
    />
  );
}
