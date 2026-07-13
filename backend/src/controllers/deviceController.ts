import { Request, Response } from "express";
import { query } from "../repositories/dbRepository";

export async function getDevices(_: Request, res: Response) {
  const result = await query("SELECT * FROM devices");
  res.send(result.rows);
}

export async function getDevicesHardware(req: Request, res: Response) {
  const idsParam = String(req.query.ids || "").trim();
  if (!idsParam) {
    return res.send({});
  }

  const ids = idsParam
    .split(",")
    .map((id) => id.trim())
    .filter(Boolean);

  if (!ids.length) {
    return res.send({});
  }

  const result = await query(
    `SELECT *
     FROM device_hardware
     WHERE device_id = ANY($1::text[])`,
    [ids]
  );

  const hardwareByDevice = result.rows.reduce((acc, row) => {
    acc[row.device_id] = row;
    return acc;
  }, {} as Record<string, unknown>);

  res.send(hardwareByDevice);
}

export async function getDeviceCompliance(req: Request, res: Response) {
  const r = await query(
    "SELECT * FROM device_compliance WHERE device_id=$1",
    [req.params.id]
  );
  res.send(r.rows[0] || {});
}

export async function getDeviceHardware(req: Request, res: Response) {
  const r = await query(
    "SELECT * FROM device_hardware WHERE device_id=$1",
    [req.params.id]
  );

  res.send(r.rows[0] || {});
}

export async function getDeviceUpdates(req: Request, res: Response) {
  const r = await query(
    "SELECT * FROM device_updates WHERE device_id=$1",
    [req.params.id]
  );

  res.send(r.rows[0] || {});
}

export async function getDeviceInventory(req: Request, res: Response) {
  const r = await query(
    "SELECT * FROM device_inventory WHERE device_id=$1",
    [req.params.id]
  );

  res.send(r.rows[0] || {});
}

export async function getDeviceHistory(req: Request, res: Response) {
  const range = req.query.range || "1h";
  let duration = 3600;
  if (range === "1d") duration = 86400;
  if (range === "1w") duration = 604800;

  const since = Date.now() - duration * 1000;

  const result = await query(
    `SELECT * FROM metrics_history
     WHERE id=$1 AND time > $2
     ORDER BY time ASC`,
    [req.params.id, since]
  );

  res.send(result.rows);
}

export async function getDeviceEvents(req: Request, res: Response) {
  const result = await query(
    `SELECT * FROM device_events
     WHERE id=$1
     ORDER BY time DESC
     LIMIT 100`,
    [req.params.id]
  );
  res.send(result.rows.map(r => ({
    ...r,
    time: Number(r.time)
  })));
}

export async function getDevice(req: Request, res: Response) {
  const result = await query(
    "SELECT * FROM devices WHERE id=$1",
    [req.params.id]
  );
  res.send(result.rows[0] || {});
}
