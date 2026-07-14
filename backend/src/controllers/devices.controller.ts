import { Request, Response } from "express";
import * as deviceService from "../services/device.service";

export async function getDevices(_: Request, res: Response) {
  const devices = await deviceService.getDevices();
  res.send(devices);
}

export async function getDevicesHardware(req: Request, res: Response) {
  const hardwareByDevice = await deviceService.getDevicesHardware(String(req.query.ids || ""));
  res.send(hardwareByDevice);
}

export async function getDeviceCompliance(req: Request, res: Response) {
  const compliance = await deviceService.getDeviceCompliance(String(req.params.id));
  res.send(compliance);
}

export async function getDeviceHardware(req: Request, res: Response) {
  const hardware = await deviceService.getDeviceHardware(String(req.params.id));
  res.send(hardware);
}

export async function getDeviceUpdates(req: Request, res: Response) {
  const updates = await deviceService.getDeviceUpdates(String(req.params.id));
  res.send(updates);
}

export async function getDeviceHistory(req: Request, res: Response) {
  const range = req.query.range || "1h";
  const history = await deviceService.getDeviceHistory(String(req.params.id), range);
  res.send(history);
}

export async function getDeviceEvents(req: Request, res: Response) {
  const events = await deviceService.getDeviceEvents(String(req.params.id));
  res.send(events);
}

export async function getTopProcesses(req: Request, res: Response) {
  const processes = await deviceService.getTopProcesses(String(req.params.id));
  res.send(processes);
}

export async function getDevice(req: Request, res: Response) {
  const device = await deviceService.getDevice(String(req.params.id));
  res.send(device);
}
