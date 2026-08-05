import { Request, Response } from "express";
import { getCloudIncidents, getCloudStatus } from "../services/cloudStatus.service";

export async function getCloudStatusList(_: Request, res: Response) {
  res.send(await getCloudStatus());
}

export async function getCloudIncidentsList(_: Request, res: Response) {
  res.send(await getCloudIncidents());
}
