import { Request, Response } from "express";
import { query } from "../repositories/dbRepository";

export async function getAlerts(req: Request, res: Response) {
  const since = Number(req.query.since);

  if (!since || isNaN(since)) {
    const result = await query(
      "SELECT * FROM alerts ORDER BY time DESC LIMIT 100"
    );
    return res.send(result.rows);
  }

  const result = await query(
    "SELECT * FROM alerts WHERE time > $1 ORDER BY time DESC",
    [since]
  );
  res.send(result.rows);
}

export async function acknowledgeAlert(req: Request, res: Response) {
  await query(
    "UPDATE alerts SET acknowledged=true WHERE time=$1",
    [req.params.time]
  );
  res.send({ ok: true });
}
