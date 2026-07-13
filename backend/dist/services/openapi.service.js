"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateOpenApiDocument = generateOpenApiDocument;
function generateOpenApiDocument(app) {
    const routes = collectRoutes(app);
    const paths = {};
    for (const route of routes) {
        const openApiPath = toOpenApiPath(route.path);
        const parameters = extractPathParameters(openApiPath);
        paths[openApiPath] = paths[openApiPath] || {};
        paths[openApiPath][route.method] = {
            summary: `${route.method.toUpperCase()} ${route.path}`,
            ...(parameters.length ? { parameters } : {}),
            responses: {
                "200": { description: "Successful response" },
                default: { description: "Error response" },
            },
        };
    }
    return {
        openapi: "3.0.0",
        info: {
            title: "AiOps Monitoring Backend API",
            version: "1.0.0",
            description: "Automatically generated from registered Express routes.",
        },
        paths,
    };
}
function collectRoutes(app) {
    const rootStack = app.router?.stack || app._router?.stack || [];
    const routes = [];
    collectFromStack(rootStack, routes);
    return routes.sort((a, b) => {
        if (a.path === b.path)
            return a.method.localeCompare(b.method);
        return a.path.localeCompare(b.path);
    });
}
function collectFromStack(stack, routes) {
    for (const layer of stack) {
        if (layer.route?.path && layer.route?.methods) {
            for (const method of Object.keys(layer.route.methods)) {
                routes.push({
                    method: method.toLowerCase(),
                    path: String(layer.route.path),
                });
            }
            continue;
        }
        if (Array.isArray(layer.handle?.stack)) {
            collectFromStack(layer.handle.stack, routes);
        }
    }
}
function toOpenApiPath(path) {
    return path.replace(/:([A-Za-z0-9_]+)/g, "{$1}");
}
function extractPathParameters(path) {
    const matches = [...path.matchAll(/\{([^}]+)\}/g)];
    return matches.map((match) => ({
        name: match[1],
        in: "path",
        required: true,
        schema: { type: "string" },
    }));
}
