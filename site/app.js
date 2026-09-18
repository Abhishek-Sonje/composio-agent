const state={records:[],bucketByApp:new Map()};
const $=id=>document.getElementById(id);
const clean=value=>value==null||value==="unknown"?"unknown":String(value);
const escapeHtml=value=>String(value).replace(/[&<>"']/g,character=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[character]));
const pill=value=>`<span class="pill${value==="unknown"?" unknown":""}">${escapeHtml(value)}</span>`;
const safeUrl=value=>{try{const url=new URL(value);return ["http:","https:"].includes(url.protocol)?url.href:"#"}catch{return "#"}};

async function boot(){
  try{
    const [dataset,analysis]=await Promise.all([fetch("data/research-dataset.json").then(r=>r.json()),fetch("data/analysis.json").then(r=>r.json())]);
    state.records=dataset.records;
    for(const [bucket,data] of Object.entries(analysis.opportunityBuckets)){for(const app of data.apps)state.bucketByApp.set(app.toLowerCase(),bucket)}
    const categories=[...new Set(state.records.map(r=>r.category))].sort();
    $("category").insertAdjacentHTML("beforeend",categories.map(c=>`<option>${escapeHtml(c)}</option>`).join(""));
    for(const id of ["search","category","bucket","mcp"]){$(id).addEventListener("input",render)}
    document.querySelectorAll("[data-bucket-jump]").forEach(button=>button.addEventListener("click",()=>{$("bucket").value=button.dataset.bucketJump;document.querySelector("#dataset").scrollIntoView();render()}));
    render();
  }catch(error){$("result-count").textContent="Dataset could not be loaded. Open the downloaded JSON or serve this directory over HTTP.";console.error(error)}
}

function filtered(){const q=$("search").value.trim().toLowerCase(),category=$("category").value,bucket=$("bucket").value,mcp=$("mcp").value;return state.records.filter(r=>(!q||r.app.toLowerCase().includes(q))&&(!category||r.category===category)&&(!bucket||state.bucketByApp.get(r.app.toLowerCase())===bucket)&&(!mcp||r.mcp.status===mcp))}
function apiLabel(r){const values=[];if(r.apiSurface.rest===true)values.push("REST");if(r.apiSurface.graphql===true)values.push("GraphQL");return values.length?values.join(" + "):"unknown"}
function render(){const records=filtered();$("result-count").textContent=`Showing ${records.length} of ${state.records.length} apps`;$("rows").innerHTML=records.map((r,i)=>{
  const key=`${r.app}-${i}`,auth=r.authMethods.length?r.authMethods.slice(0,2).map(pill).join(""):pill("unknown"),unknown=r.unknownFields.length;
  return `<tr class="summary" tabindex="0" role="button" aria-expanded="false" data-key="${escapeHtml(key)}"><td>${escapeHtml(r.app)}</td><td>${escapeHtml(r.category)}</td><td>${auth}</td><td>${pill(clean(r.accessModel))}</td><td>${pill(apiLabel(r))}</td><td>${pill(clean(r.mcp.status))}</td><td>${pill(clean(r.buildability))}</td><td>${unknown}</td></tr>`
  }).join("");
  document.querySelectorAll("tr.summary").forEach((row,index)=>{const activate=()=>toggle(row,records[index]);row.addEventListener("click",activate);row.addEventListener("keydown",e=>{if(e.key==="Enter"||e.key===" "){e.preventDefault();activate()}})})
}
function toggle(row,record){const next=row.nextElementSibling;if(next?.classList.contains("detail")){next.remove();row.setAttribute("aria-expanded","false");return}document.querySelectorAll("tr.detail").forEach(r=>r.remove());document.querySelectorAll("tr.summary").forEach(r=>r.setAttribute("aria-expanded","false"));const fragment=$("detail-template").content.cloneNode(true),detail=fragment.querySelector("tr");detail.querySelector("[data-description]").textContent=record.description;detail.querySelector("[data-blocker]").textContent=record.blocker||"No blocker claimed.";detail.querySelector("[data-unknown]").textContent=record.unknownFields.length?record.unknownFields.join(", "):"None";detail.querySelector("[data-evidence]").innerHTML=record.evidence.length?record.evidence.map(e=>`<li><a href="${escapeHtml(safeUrl(e.url))}" target="_blank" rel="noreferrer">${escapeHtml(e.title)}</a> <span class="unknown">&mdash; ${escapeHtml(e.sourceType)} &middot; ${escapeHtml(e.supports.join(", "))}</span></li>`).join(""):"<li>No retained evidence.</li>";row.after(fragment);row.setAttribute("aria-expanded","true")}
boot();
