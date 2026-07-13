import { QueryConfig, QueryResult, QueryResultRow } from "pg";
import { db } from "../config/database";

export function query<T extends QueryResultRow = any>(
  text: string | QueryConfig,
  params?: any[]
): Promise<QueryResult<T>> {
  return db.query<T>(text as any, params);
}
