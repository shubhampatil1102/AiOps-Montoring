export async function fetchDevices() {
  const res = await fetch("http://localhost:4000/devices");
  return res.json();
}

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
