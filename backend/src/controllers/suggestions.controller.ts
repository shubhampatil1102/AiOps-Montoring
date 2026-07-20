import { Request, Response } from "express";
import { fetchSuggestions } from "../services/suggestion.service";

export async function getSuggestions(
  req: Request,
  res: Response
) {
  try {
    const data = await fetchSuggestions();

    res.json(data);
  } catch (err) {
    console.error(err);

    res.status(500).json({
      error: "Unable to load suggestions",
    });
  }
}