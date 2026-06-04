import { API_URL } from './config';

export async function fetchAlerts() {
  const res = await fetch(`${API_URL}/alerts`);
  return res.json();
}

export async function fetchIssues() {
  const res = await fetch(`${API_URL}/issues`);
  return res.json();
}
