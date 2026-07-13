"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getTopProcesses = getTopProcesses;
const dbRepository_1 = require("../repositories/dbRepository");
async function getTopProcesses(req, res) {
    const since = Date.now() - 600000;
    const result = await (0, dbRepository_1.query)(`SELECT name,
            ROUND(AVG(cpu)::numeric,2) as cpu,
            ROUND(AVG(ram)::numeric,2) as ram
     FROM processes
     WHERE device_id=$1 AND time > $2
     GROUP BY name
     ORDER BY cpu DESC
     LIMIT 5`, [req.params.id, since]);
    res.send(result.rows);
}
