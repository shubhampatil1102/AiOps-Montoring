interface EmptyStateProps {
  message?: string;
}

export default function EmptyState({
  message = "No data available.",
}: EmptyStateProps) {
  return <div>{message}</div>;
}
