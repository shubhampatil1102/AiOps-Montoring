import { Request, Response } from "express";

export function testRoute(_: Request, res: Response) {
  res.send("Working");
}
