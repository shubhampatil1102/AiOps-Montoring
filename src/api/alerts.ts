export async function fetchAlerts() {
  const res = await fetch("http://localhost:4000/alerts");
  return res.json();
}

// export async function fetchAlerts() {
//   const res = await fetch("http://localhost:4000/alerts");
//   return res.json();
// }
