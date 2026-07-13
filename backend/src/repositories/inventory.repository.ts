import { query } from "./dbRepository";

export async function findDeviceInventory(deviceId: string) {
  return query(
    "SELECT * FROM device_inventory WHERE device_id=$1",
    [deviceId]
  );
}
