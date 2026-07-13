import { Request, Response } from "express";
import { query } from "../repositories/dbRepository";

export async function getTopProcesses(req: Request, res: Response) {
  const since = Date.now() - 600000;

  const result = await query(
    `SELECT name,
            ROUND(AVG(cpu)::numeric,2) as cpu,
            ROUND(AVG(ram)::numeric,2) as ram
     FROM processes
     WHERE device_id=$1 AND time > $2
     GROUP BY name
     ORDER BY cpu DESC
     LIMIT 5`,
    [req.params.id, since]
  );

  res.send(result.rows);
}
