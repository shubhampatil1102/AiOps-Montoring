interface ErrorStateProps {
  message?: string;
}

export default function ErrorState({
  message = "Something went wrong.",
}: ErrorStateProps) {
  return <div>{message}</div>;
}
