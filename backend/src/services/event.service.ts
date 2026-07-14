import { query } from "../repositories/db.repository";

export async function addEvent(id: string, type: string, message: string) {
  await query(
    "INSERT INTO device_events (id,type,message,time) VALUES ($1,$2,$3,$4)",
    [id, type, message, Date.now()]
  );
}
