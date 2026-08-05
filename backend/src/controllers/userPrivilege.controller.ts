import { Request, Response } from "express";
import * as userPrivilegeService from "../services/userPrivilege.service";
import * as userPrivilegeRepository from "../repositories/userPrivilege.repository";

export async function getDeviceUserPrivilege(req: Request, res: Response) {
  const summary = await userPrivilegeService.getDeviceUserPrivilegeSummary(String(req.params.id));
  res.send(summary);
}

export async function getDeviceUserPrivilegeEvents(req: Request, res: Response) {
  const result = await userPrivilegeRepository.findDeviceAdminEvents(String(req.params.id));
  res.send(result.rows);
}
