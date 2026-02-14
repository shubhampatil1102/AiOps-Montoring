export async function fetchTopProcesses(id: string) {
  const r = await fetch(`http://localhost:4000/devices/${id}/top-processes`);
  return r.json();
}
