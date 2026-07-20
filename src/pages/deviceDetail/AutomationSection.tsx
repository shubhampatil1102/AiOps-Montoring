import { AutomationCard } from "@/components/intelligence";
import EmptyState from "@/components/common/EmptyState";
import type { AutomationSuggestion } from "@/lib/intelligence/types";

interface AutomationSectionProps {
  automations: AutomationSuggestion[];
}

export default function AutomationSection({ automations }: AutomationSectionProps) {
  if (automations.length === 0) {
    return <EmptyState message="No automation opportunities detected for this device." />;
  }

  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
        gap: 16,
      }}
    >
      {automations.map((automation, index) => (
        <AutomationCard key={`${automation.actionType}-${index}`} automation={automation} />
      ))}
    </div>
  );
}
