export function groupAlerts(alerts: any[]) {
  const map: any = {};

  for (const a of alerts) {
    if (!map[a.id]) map[a.id] = [];
    map[a.id].push(a);
  }

  return Object.entries(map).map(([device, items]: any) => {

    const hasActive = items.some((a:any)=>!a.resolved);
    const hasOnlyResolved = items.every((a:any)=>a.resolved);

    return {
      device,
      items,
      defaultOpen: hasActive || !hasOnlyResolved
    };
  })
  // active devices 
  .sort((a:any,b:any)=>b.defaultOpen - a.defaultOpen);
}
