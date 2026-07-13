"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.startPresenceMonitor = startPresenceMonitor;
const dbRepository_1 = require("../repositories/dbRepository");
const eventService_1 = require("./eventService");
const policyService_1 = require("./policyService");
const IDLE_AFTER = 60 * 1000;
function startPresenceMonitor() {
    setInterval(async () => {
        const now = Date.now();
        const policy = (0, policyService_1.getPolicy)();
        const lostAfter = Math.max(1000, Number(policy.offline_seconds || 20) * 1000);
        const idleAfter = Math.min(IDLE_AFTER, lostAfter);
        const result = await (0, dbRepository_1.query)("SELECT * FROM devices");
        for (const d of result.rows) {
            const diff = now - Number(d.last_seen);
            if (diff < idleAfter) {
                await (0, dbRepository_1.query)("UPDATE devices SET state='ONLINE' WHERE id=$1", [d.id]);
                continue;
            }
            if (diff < lostAfter) {
                await (0, dbRepository_1.query)("UPDATE devices SET state='IDLE' WHERE id=$1", [d.id]);
                continue;
            }
            await (0, dbRepository_1.query)("UPDATE devices SET state='LOST' WHERE id=$1", [d.id]);
            const exist = await (0, dbRepository_1.query)("SELECT 1 FROM alerts WHERE id=$1 AND message='Device not reporting' AND resolved=false", [d.id]);
            if (exist.rowCount === 0) {
                await (0, dbRepository_1.query)("INSERT INTO alerts(id,message,time,acknowledged,resolved) VALUES ($1,'Device not reporting',$2,false,false)", [d.id, now]);
                await (0, eventService_1.addEvent)(d.id, "OFFLINE", "Device stopped reporting");
            }
        }
    }, 30000);
}
