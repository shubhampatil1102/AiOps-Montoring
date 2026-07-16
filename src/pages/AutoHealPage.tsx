import { useMemo, useState } from "react";
import DashboardWidget from "../components/dashboard/DashboardWidget";
import PageHeader from "../layouts/PageHeader";
import {
  AutoHealStats,
  AutoHealToolbar,
  HealRulesTable,
  JobsTable,
  ManualRunCard,
  SuggestionsTable,
} from "../components/autoheal";
import { useDevices } from "@/hooks/useDevices";
import { useAutoHealActions, useAutoHealData } from "@/hooks/useAutoHeal";
import type { HealRule, HealSuggestion, ScriptJob } from "@/types/autoHeal";
import styles from "./AutoHealPage.module.css";

export default function AutoHealPage() {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [selectedRule, setSelectedRule] = useState<HealRule | null>(null);

  const autoHeal = useAutoHealData();
  const actions = useAutoHealActions();
  const devicesQuery = useDevices();

  const suggestions = autoHeal.suggestions.data || [];
  const jobs = autoHeal.jobs.data || [];
  const library = autoHeal.library.data || [];
  const devices = devicesQuery.data || [];

  const rules = useMemo(
    () => buildRules(suggestions, library),
    [library, suggestions]
  );

  const filteredRules = useMemo(
    () => filterRules(rules, search),
    [rules, search]
  );

  const filteredSuggestions = useMemo(
    () => filterSuggestions(suggestions, search),
    [search, suggestions]
  );

  const activeJobs = useMemo(
    () => filterJobs(jobs.filter(isActiveJob), search, statusFilter),
    [jobs, search, statusFilter]
  );

  const historyJobs = useMemo(
    () => filterJobs(jobs.filter((job) => !isActiveJob(job)), search, statusFilter),
    [jobs, search, statusFilter]
  );

  function handleManualRun(deviceId: string, script: string) {
    actions.run.mutate({ deviceId, script });
  }

  function handleRetry(job: ScriptJob) {
    actions.run.mutate({
      deviceId: job.device_id,
      script: job.script,
    });
  }

  return (
    <div className={styles.page}>
      <PageHeader
        title="Auto Heal"
        description="Review remediation rules, run scripts, and track automated recovery jobs."
      />

      <AutoHealStats
        activeCount={activeJobs.length}
        jobs={jobs}
        ruleCount={rules.length}
      />

      <DashboardWidget
        title="Controls"
        subtitle="Search and filter rules, jobs, and scripts."
        toolbar={(
          <AutoHealToolbar
            onSearchChange={setSearch}
            onStatusChange={setStatusFilter}
            search={search}
            status={statusFilter}
          />
        )}
      >
        <div className={styles.state}>
          {autoHeal.isLoading && "Loading auto-heal data..."}
          {autoHeal.isError && "Unable to load some auto-heal data."}
          {!autoHeal.isLoading && !autoHeal.isError && "Auto-heal data is live."}
        </div>
      </DashboardWidget>

      <div className={styles.grid}>
        <DashboardWidget
          title="Heal Rules"
          subtitle="Rule priority and auto-run controls."
        >
          <HealRulesTable
            onManualRun={setSelectedRule}
            rules={filteredRules}
          />
        </DashboardWidget>

        <ManualRunCard
          devices={devices}
          isRunning={actions.run.isPending}
          library={library}
          onClearRule={() => setSelectedRule(null)}
          onRun={handleManualRun}
          selectedRule={selectedRule}
        />
      </div>

      <DashboardWidget
        title="AI Suggestions"
        subtitle="Approve or reject generated remediation actions."
      >
        <SuggestionsTable
          onApprove={(id) => actions.approve.mutate(id)}
          onReject={(id) => actions.reject.mutate(id)}
          suggestions={filteredSuggestions}
        />
      </DashboardWidget>

      <DashboardWidget
        title="Active Jobs"
        subtitle="Pending and running script executions."
      >
        <JobsTable jobs={activeJobs} mode="active" />
      </DashboardWidget>

      <DashboardWidget
        title="Job History"
        subtitle="Completed jobs, failed jobs, retry actions, and execution logs."
      >
        <JobsTable
          jobs={historyJobs}
          mode="history"
          onRetry={handleRetry}
        />
      </DashboardWidget>
    </div>
  );
}

function buildRules(
  suggestions: HealSuggestion[],
  library: Array<{ id: number; name: string; script: string }>
): HealRule[] {
  const suggestionRules = suggestions.map((suggestion, index) => ({
    id: `suggestion-${suggestion.id}`,
    alertType: suggestion.alert_type,
    scriptName: suggestion.suggested_action,
    script: suggestion.script,
    autoEnabled: false,
    priority: index + 1,
    source: "suggestion" as const,
  }));

  const libraryRules = library.map((item, index) => ({
    id: `library-${item.id}`,
    alertType: item.name,
    scriptName: item.name,
    script: item.script,
    autoEnabled: false,
    priority: suggestionRules.length + index + 1,
    source: "library" as const,
  }));

  return [...suggestionRules, ...libraryRules];
}

function filterRules(rules: HealRule[], search: string) {
  const query = search.trim().toLowerCase();
  if (!query) return rules;

  return rules.filter((rule) =>
    `${rule.alertType} ${rule.scriptName} ${rule.script}`.toLowerCase().includes(query)
  );
}

function filterSuggestions(suggestions: HealSuggestion[], search: string) {
  const query = search.trim().toLowerCase();
  if (!query) return suggestions;

  return suggestions.filter((suggestion) =>
    `${suggestion.device_id} ${suggestion.alert_type} ${suggestion.reason} ${suggestion.suggested_action} ${suggestion.script}`
      .toLowerCase()
      .includes(query)
  );
}

function filterJobs(jobs: ScriptJob[], search: string, statusFilter: string) {
  const query = search.trim().toLowerCase();

  return jobs.filter((job) => {
    const matchesSearch =
      !query ||
      `${job.id} ${job.device_id} ${job.status} ${job.script} ${job.output || ""} ${job.error || ""}`
        .toLowerCase()
        .includes(query);
    const matchesStatus =
      statusFilter === "all" ||
      normalizeStatus(job.status) === statusFilter;

    return matchesSearch && matchesStatus;
  });
}

function isActiveJob(job: ScriptJob) {
  const status = normalizeStatus(job.status);
  return status === "PENDING" || status === "RUNNING";
}

function normalizeStatus(status: string) {
  return String(status || "").toUpperCase();
}
