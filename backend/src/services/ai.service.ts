export async function analyzeDeviceHealth(device: any) {

    const issues: any[] = [];

    const cpu = Number(device.cpu ?? 0);
    const ram = Number(device.ram ?? 0);

    // ================= CPU =================
    if (cpu >= 85) {

        issues.push({
            type: "CPU_RISK",
            severity: cpu >= 95 ? "CRITICAL" : "HIGH",

            reason: `System CPU utilisation is ${cpu.toFixed(1)}%`,

            action:
                cpu >= 95
                    ? "Investigate high CPU usage and terminate the offending process if required."
                    : "Monitor CPU usage and identify high CPU-consuming applications."
        });

    }

    // ================= RAM =================
    if (ram >= 90) {

        issues.push({
            type: "MEMORY_LEAK",
            severity: "HIGH",

            reason: `Memory utilisation is ${ram.toFixed(1)}%`,

            action: "Restart the application consuming excessive memory."
        });

    }

    // ================= SECURITY =================
    if (device.compliance?.bitlocker !== "ENABLED") {

        issues.push({
            type: "SECURITY",
            severity: "CRITICAL",

            reason: "BitLocker protection is disabled.",

            action: "Enable BitLocker to encrypt the system drive."
        });

    }

    return issues;
}
