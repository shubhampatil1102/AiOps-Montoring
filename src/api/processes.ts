export async function fetchTopProcesses(id: string) {
  try {
    const r = await fetch(`http://localhost:4000/devices/${id}/top-processes`);
    if (!r.ok) {
      console.error(`Top processes API failed for ${id}`, r.status);
      return [];
    }
    const data = await r.json();
    return Array.isArray(data) ? data : [];
  } catch (err) {
    console.error(`Top processes API error for ${id}:`, err);
    return [];
  }
}
