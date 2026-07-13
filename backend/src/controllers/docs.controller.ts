import { Request, Response } from "express";

export function createOpenApiJsonHandler(openApiDocument: unknown) {
  return (_: Request, res: Response) => {
    res.json(openApiDocument);
  };
}

export function createSwaggerUiHandler() {
  return (_: Request, res: Response) => {
    res.type("html").send(`<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <title>AiOps API Docs</title>
    <link rel="stylesheet" href="https://unpkg.com/swagger-ui-dist@5/swagger-ui.css" />
    <style>
      body { margin: 0; background: #fafafa; }
    </style>
  </head>
  <body>
    <div id="swagger-ui"></div>
    <script src="https://unpkg.com/swagger-ui-dist@5/swagger-ui-bundle.js"></script>
    <script>
      window.ui = SwaggerUIBundle({
        url: "/openapi.json",
        dom_id: "#swagger-ui",
      });
    </script>
  </body>
</html>`);
  };
}
