import { RecommendationCard } from "@/components/intelligence";
import EmptyState from "@/components/common/EmptyState";
import type { Recommendation } from "@/lib/intelligence/types";

interface RecommendationsSectionProps {
  recommendations: Recommendation[];
}

export default function RecommendationsSection({ recommendations }: RecommendationsSectionProps) {
  if (recommendations.length === 0) {
    return <EmptyState message="No recommendations for this device right now." />;
  }

  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
        gap: 16,
      }}
    >
      {recommendations.map((recommendation, index) => (
        <RecommendationCard key={`${recommendation.relatedMetric}-${index}`} recommendation={recommendation} />
      ))}
    </div>
  );
}
