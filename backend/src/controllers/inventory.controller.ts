import { Request, Response } from "express";
import * as inventoryService from "../services/inventory.service";

export async function getDeviceInventory(req: Request, res: Response) {
  const inventory = await inventoryService.getDeviceInventory(String(req.params.id));
  res.send(inventory);
}
