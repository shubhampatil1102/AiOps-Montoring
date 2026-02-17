const API = "http://localhost:4000";

// export async function runScript(device: string, script: string) {
//   const r = await fetch(`${API}/scripts/run`, {
//     method: "POST",
//     headers: { "Content-Type": "application/json" },
//     body: JSON.stringify({ device, script })
//   });
//   return r.json();
// }


  export async function runScript(device: string, script: string) {

  if (!device || !script) {
    alert("Select device and write script");
    return;
  }

  await fetch("http://localhost:4000/scripts/run", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      device_id: device,
      script: script
    })
  });

  alert("Script sent to agent");
}

export async function fetchJobs() {
  const r = await fetch(`${API}/scripts/jobs`);
  return r.json();
}

export async function fetchLibrary() {
  const r = await fetch("http://localhost:4000/scripts/library");
  return r.json();
}

export async function runLibrary(device:string,script_id:number){
  const r = await fetch("http://localhost:4000/scripts/run-library",{
    method:"POST",
    headers:{ "Content-Type":"application/json"},
    body:JSON.stringify({device,script_id})
  });
  return r.json();
}
