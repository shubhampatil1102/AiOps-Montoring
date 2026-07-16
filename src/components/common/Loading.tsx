interface LoadingProps {
  label?: string;
}

export default function Loading({ label = "Loading..." }: LoadingProps) {
  return <div>{label}</div>;
}
