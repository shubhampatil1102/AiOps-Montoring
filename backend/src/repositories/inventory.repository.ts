import { query } from "./db.repository";

export async function findDeviceInventory(deviceId: string) {
  return query(
    "SELECT * FROM device_inventory WHERE device_id=$1",
    [deviceId]
  );
}
