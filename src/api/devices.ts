export const fetchDevices = async () => {
  try {
    const r = await fetch("http://localhost:4000/devices");

    if (!r.ok) throw new Error("API failed");

    const data = await r.json();

    if (!Array.isArray(data)) return [];

    return data;
  } catch (err) {
    console.error("Devices API error:", err);
    return [];
  }
};


export async function fetchDevice(id: string) {
  const res = await fetch(`http://localhost:4000/devices/${id}`);
  return res.json();
}

// export async function fetchDeviceHistory(id: string) {
//   const res = await fetch(`http://localhost:4000/devices/${id}/history`);
//   return res.json();
// }

export async function fetchDeviceHistory(id: string, range: string) {
  const res = await fetch(`http://localhost:4000/devices/${id}/history?range=${range}`);
  return res.json();
}
