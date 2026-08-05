import{h as c,i as n,D as r,j as e,b as l,f as d,e as o,E as p}from"./index-BkKRKN6T.js";/**
 * @license lucide-react v0.462.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const x=c("CalendarClock",[["path",{d:"M21 7.5V6a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h3.5",key:"1osxxc"}],["path",{d:"M16 2v4",key:"4m81vk"}],["path",{d:"M8 2v4",key:"1cmpym"}],["path",{d:"M3 10h5",key:"r794hk"}],["path",{d:"M17.5 17.5 16 16.3V14",key:"akvzfd"}],["circle",{cx:"16",cy:"16",r:"6",key:"qoo3c4"}]]);/**
 * @license lucide-react v0.462.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const h=c("RotateCcw",[["path",{d:"M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8",key:"1357e3"}],["path",{d:"M3 3v5h5",key:"1xhq8a"}]]);/**
 * @license lucide-react v0.462.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const y=c("Terminal",[["polyline",{points:"4 17 10 11 4 5",key:"akl6gq"}],["line",{x1:"12",x2:"20",y1:"19",y2:"19",key:"q2wloq"}]]);/**
 * @license lucide-react v0.462.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const k=c("Trash2",[["path",{d:"M3 6h18",key:"d0wm0j"}],["path",{d:"M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6",key:"4alrt4"}],["path",{d:"M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2",key:"v07s0e"}],["line",{x1:"10",x2:"10",y1:"11",y2:"17",key:"1uufr5"}],["line",{x1:"14",x2:"14",y1:"11",y2:"17",key:"xtxkd"}]]),m="_card_27zxl_1",_="_header_27zxl_7",g="_titleRow_27zxl_14",f="_iconWrapper_27zxl_20",u="_title_27zxl_14",v="_description_27zxl_38",j="_footer_27zxl_44",w="_suggestOnly_27zxl_52",t={card:m,header:_,titleRow:g,iconWrapper:f,title:u,description:v,footer:j,suggestOnly:w},C={"restart-service":h,"clean-temp-files":k,"install-updates":r,"notify-admin":n,"run-script":y,"schedule-maintenance":x},M={Low:"success",Medium:"warning",High:"danger",Critical:"danger"};function z({automation:s}){const a=C[s.actionType];return e.jsx(l,{fill:!0,children:e.jsxs("div",{className:t.card,children:[e.jsxs("div",{className:t.header,children:[e.jsxs("div",{className:t.titleRow,children:[e.jsx("div",{className:t.iconWrapper,children:e.jsx(a,{size:16})}),e.jsx("div",{className:t.title,children:s.title})]}),e.jsxs(d,{variant:M[s.riskLevel],children:[s.riskLevel," risk"]})]}),e.jsx("p",{className:t.description,children:s.description}),e.jsxs("div",{className:t.footer,children:[e.jsx(o,{confidence:s.confidence}),e.jsx("span",{className:t.suggestOnly,children:"Suggestion only — not executed"})]})]})})}function R({automations:s}){return s.length===0?e.jsx(p,{message:"No automation opportunities detected for this device."}):e.jsx("div",{style:{display:"grid",gridTemplateColumns:"repeat(auto-fit, minmax(260px, 1fr))",gap:16},children:s.map((a,i)=>e.jsx(z,{automation:a},`${a.actionType}-${i}`))})}export{R as default};
