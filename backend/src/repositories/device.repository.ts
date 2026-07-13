import { query } from "./dbRepository";

export async function findAllDevices() {
  return query("SELECT * FROM devices");
}

export async function findHardwareByDeviceIds(ids: string[]) {
  return query(
    `SELECT *
     FROM device_hardware
     WHERE device_id = ANY($1::text[])`,
    [ids]
  );
}

export async function findDeviceCompliance(deviceId: string) {
  return query(
    "SELECT * FROM device_compliance WHERE device_id=$1",
    [deviceId]
  );
}

export async function findDeviceHardware(deviceId: string) {
  return query(
    "SELECT * FROM device_hardware WHERE device_id=$1",
    [deviceId]
  );
}

export async function findDeviceUpdates(deviceId: string) {
  return query(
    "SELECT * FROM device_updates WHERE device_id=$1",
    [deviceId]
  );
}

export async function findDeviceHistory(deviceId: string, since: number) {
  return query(
    `SELECT * FROM metrics_history
     WHERE id=$1 AND time > $2
     ORDER BY time ASC`,
    [deviceId, since]
  );
}

export async function findDeviceEvents(deviceId: string) {
  return query(
    `SELECT * FROM device_events
     WHERE id=$1
     ORDER BY time DESC
     LIMIT 100`,
    [deviceId]
  );
}

export async function findTopProcesses(deviceId: string, since: number) {
  return query(
    `SELECT name,
            ROUND(AVG(cpu)::numeric,2) as cpu,
            ROUND(AVG(ram)::numeric,2) as ram
     FROM processes
     WHERE device_id=$1 AND time > $2
     GROUP BY name
     ORDER BY cpu DESC
     LIMIT 5`,
    [deviceId, since]
  );
}

export async function findDeviceById(deviceId: string) {
  return query(
    "SELECT * FROM devices WHERE id=$1",
    [deviceId]
  );
}
