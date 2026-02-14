export function getDeviceState(state?: string) {

  switch (state) {
    case "ONLINE":
      return { label: "Online", color: "#22c55e" };

    case "IDLE":
      return { label: "Inactive", color: "#f59e0b" };

    case "EXPECTED_OFFLINE":
      return { label: "Powered Off", color: "#9ca3af" };

    case "LOST":
      return { label: "Not Reporting", color: "#ef4444" };

    default:
      return { label: "Unknown", color: "#6b7280" };
  }
}
