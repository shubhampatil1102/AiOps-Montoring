export async function analyzeDeviceHealth(device:any) {

    const issues:any[] = [];

    /* CPU Intelligence */
    if(device.cpu > 85){
        issues.push({
            type:"CPU_RISK",
            severity:"HIGH",
            reason:`CPU constantly ${device.cpu}%`,
            action:"Kill high CPU process"
        });
    }

    /* RAM Intelligence */
    if(device.ram > 90){
        issues.push({
            type:"MEMORY_LEAK",
            severity:"HIGH",
            reason:"Possible memory leak",
            action:"Restart heavy service"
        });
    }

    /* Security Compliance AI */
    if(device.compliance?.bitlocker !== "ENABLED"){
        issues.push({
            type:"SECURITY",
            severity:"CRITICAL",
            reason:"Bitlocker disabled",
            action:"Enable Bitlocker"
        });
    }

    return issues;
}