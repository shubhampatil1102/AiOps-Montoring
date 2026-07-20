import ErrorPage from "@/components/errors/ErrorPage";

export default function NotFoundPage() {
  return (
    <ErrorPage
      code="404"
      title="Page not found"
      message="The page you're looking for doesn't exist or may have been moved."
    />
  );
}
