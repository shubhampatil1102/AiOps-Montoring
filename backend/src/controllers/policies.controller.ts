import { Request, Response } from "express";
import * as policyService from "../services/policyService";

export async function getPolicies(_: Request, res: Response) {
  const policy = await policyService.getPolicies();
  res.send(policy);
}

export async function savePolicies(req: Request, res: Response) {
  const result = await policyService.savePolicies(req.body);

  if (!result.ok) {
    return res.status(400).send({ error: "Invalid policy payload" });
  }

  res.send({ ok: true, policy: result.policy });
}
