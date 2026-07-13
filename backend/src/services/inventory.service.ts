import * as inventoryRepository from "../repositories/inventory.repository";

export async function getDeviceInventory(deviceId: string) {
  const result = await inventoryRepository.findDeviceInventory(deviceId);
  return result.rows[0] || {};
}
