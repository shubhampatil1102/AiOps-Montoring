import { useState } from "react";
import Button from "../ui/Button";
import Card from "../ui/Card";
import type { Device } from "@/types/device";
import type { HealRule, ScriptLibraryItem } from "@/types/autoHeal";
import styles from "./ManualRunCard.module.css";

interface ManualRunCardProps {
  devices: Device[];
  library: ScriptLibraryItem[];
  selectedRule: HealRule | null;
  isRunning: boolean;
  onRun: (deviceId: string, script: string) => void;
  onClearRule: () => void;
}

export default function ManualRunCard({
  devices,
  library,
  selectedRule,
  isRunning,
  onRun,
  onClearRule,
}: ManualRunCardProps) {
  const [deviceId, setDeviceId] = useState("");
  const [script, setScript] = useState("");

  const effectiveScript = selectedRule?.script || script;

  function applyLibraryScript(scriptId: string) {
    const item = library.find((entry) => String(entry.id) === scriptId);
    setScript(item?.script || "");
    onClearRule();
  }

  return (
    <Card title="Manual Run" subtitle="Run an existing rule or custom remediation script.">
      <div className={styles.form}>
        <select
          className={styles.input}
          onChange={(event) => setDeviceId(event.target.value)}
          value={deviceId}
        >
          <option value="">Select device</option>
          {devices.map((device) => (
            <option key={device.id} value={device.id}>
              {device.id}
            </option>
          ))}
        </select>

        <select
          className={styles.input}
          onChange={(event) => applyLibraryScript(event.target.value)}
          value=""
        >
          <option value="">Load script from library</option>
          {library.map((item) => (
            <option key={item.id} value={item.id}>
              {item.name}
            </option>
          ))}
        </select>

        {selectedRule && (
          <div className={styles.selected}>
            Using rule: <strong>{selectedRule.alertType}</strong>
            <button onClick={onClearRule} type="button">Clear</button>
          </div>
        )}

        <textarea
          className={styles.textarea}
          onChange={(event) => {
            setScript(event.target.value);
            onClearRule();
          }}
          placeholder="Write or load remediation script..."
          value={effectiveScript}
        />

        <Button
          disabled={!deviceId || !effectiveScript || isRunning}
          onClick={() => onRun(deviceId, effectiveScript)}
          type="button"
        >
          {isRunning ? "Running..." : "Run Script"}
        </Button>
      </div>
    </Card>
  );
}
