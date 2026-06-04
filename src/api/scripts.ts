import { API_URL } from './config';

const API = API_URL;

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

  await fetch(`${API_URL}/scripts/run`, {
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
  const r = await fetch(`${API_URL}/scripts/library`);
  return r.json();
}

export async function runLibrary(device:string,script_id:number){
  const r = await fetch(`${API_URL}/scripts/run-library`,{
    method:"POST",
    headers:{ "Content-Type":"application/json"},
    body:JSON.stringify({device,script_id})
  });
  return r.json();
}

export async function fetchApprovals(){
  const r = await fetch(`${API_URL}/scripts/approvals`);
  return r.json();
}
