import Badge from "../../ui/Badge/Badge";
import { confidenceLevel } from "@/lib/intelligence/confidenceCalculator";

interface ConfidenceBadgeProps {
  confidence: number;
}

const variantByLevel = {
  Low: "default",
  Medium: "warning",
  High: "success",
} as const;

export default function ConfidenceBadge({ confidence }: ConfidenceBadgeProps) {
  const level = confidenceLevel(confidence);

  return <Badge variant={variantByLevel[level]}>{level} confidence</Badge>;
}
