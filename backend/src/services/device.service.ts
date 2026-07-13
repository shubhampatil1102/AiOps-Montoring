import * as deviceRepository from "../repositories/device.repository";

export async function getDevices() {
  const result = await deviceRepository.findAllDevices();
  return result.rows;
}

export async function getDevicesHardware(idsParam: string) {
  const normalizedIdsParam = String(idsParam || "").trim();
  if (!normalizedIdsParam) {
    return {};
  }

  const ids = normalizedIdsParam
    .split(",")
    .map((id) => id.trim())
    .filter(Boolean);

  if (!ids.length) {
    return {};
  }

  const result = await deviceRepository.findHardwareByDeviceIds(ids);

  return result.rows.reduce((acc, row) => {
    acc[row.device_id] = row;
    return acc;
  }, {} as Record<string, unknown>);
}

export async function getDeviceCompliance(id: string) {
  const r = await deviceRepository.findDeviceCompliance(id);
  return r.rows[0] || {};
}

export async function getDeviceHardware(id: string) {
  const r = await deviceRepository.findDeviceHardware(id);

  return r.rows[0] || {};
}

export async function getDeviceUpdates(id: string) {
  const r = await deviceRepository.findDeviceUpdates(id);

  return r.rows[0] || {};
}

export async function getDeviceHistory(id: string, range: unknown) {
  let duration = 3600;
  if (range === "1d") duration = 86400;
  if (range === "1w") duration = 604800;

  const since = Date.now() - duration * 1000;

  const result = await deviceRepository.findDeviceHistory(id, since);

  return result.rows;
}

export async function getDeviceEvents(id: string) {
  const result = await deviceRepository.findDeviceEvents(id);

  return result.rows.map(r => ({
    ...r,
    time: Number(r.time)
  }));
}

export async function getTopProcesses(id: string) {
  const since = Date.now() - 600000;

  const result = await deviceRepository.findTopProcesses(id, since);

  return result.rows;
}

export async function getDevice(id: string) {
  const result = await deviceRepository.findDeviceById(id);
  return result.rows[0] || {};
}
