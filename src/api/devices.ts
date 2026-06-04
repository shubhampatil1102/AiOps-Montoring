import { API_URL } from './config';

export const fetchDevices = async () => {
  try {
    const r = await fetch(`${API_URL}/devices`);

    if (!r.ok) throw new Error("API failed");

    const data = await r.json();

    if (!Array.isArray(data)) return [];

    return data;
  } catch (err) {
    console.error("Devices API error:", err);
    return [];
  }
};

async function safeFetchJson<T>(url: string, fallback: T): Promise<T> {
  try {
    const res = await fetch(url);
    if (!res.ok) {
      console.error(`API request failed: ${url}`, res.status);
      return fallback;
    }
    return (await res.json()) as T;
  } catch (err) {
    console.error(`API request error: ${url}`, err);
    return fallback;
  }
}

export async function fetchDevice(id: string) {
  return safeFetchJson(`${API_URL}/devices/${id}`, {} as any);
}

export async function fetchDeviceHistory(id: string, range: string) {
  return safeFetchJson(`${API_URL}/devices/${id}/history?range=${range}`, [] as any);
}
