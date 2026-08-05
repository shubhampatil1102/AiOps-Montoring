import { Request, Response } from "express";
import * as windowsUpdateInventoryService from "../services/windowsUpdateInventory.service";
import * as updateRepository from "../repositories/windowsUpdateInventory.repository";

export async function getDeviceUpdateSummary(req: Request, res: Response) {
  const summary = await windowsUpdateInventoryService.getDeviceUpdateSummary(String(req.params.id));
  res.send(summary);
}

export async function getDeviceUpdateHistory(req: Request, res: Response) {
  const result = await updateRepository.findDeviceUpdateHistory(String(req.params.id));
  res.send(result.rows);
}

export async function getDeviceUpdateEvents(req: Request, res: Response) {
  const result = await updateRepository.findDeviceUpdateEvents(String(req.params.id));
  res.send(result.rows);
}
