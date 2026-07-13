"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.configureMiddleware = configureMiddleware;
const cors_1 = __importDefault(require("cors"));
const express_1 = __importDefault(require("express"));
function configureMiddleware(app) {
    app.use((0, cors_1.default)());
    app.use(express_1.default.json());
    app.use(express_1.default.urlencoded({ limit: "50mb", extended: true }));
}
