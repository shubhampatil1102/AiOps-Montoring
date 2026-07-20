import { API_URL } from "./config";

export interface Suggestion {
  id: number;
  device_id: string;
  alert_type: string;
  reason: string;
  suggested_action: string;
  script: string;
  created_at: number;
}

export async function fetchSuggestions(): Promise<Suggestion[]> {
  const response = await fetch(`${API_URL}/suggestions`);

  if (!response.ok) {
    throw new Error("Failed to load AI suggestions");
  }

  return response.json();
}