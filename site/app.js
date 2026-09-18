

const state = { records: [], view: [], bucketByApp: new Map() };
const $ = (id) => document.getElementById(id);

const clean = (value) =>
  value == null || value === "unknown" ? "unknown" : String(value);
const words = (value) => value.replace(/_/g, " ");

const escapeHtml = (value) =>
  String(value).replace(
    /[&<>"']/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        c
      ],
  );

const safeUrl = (value) => {
  try {
    const url = new URL(value);
    return ["http:", "https:"].includes(url.protocol) ? url.href : "#";
  } catch {
    return "#";
  }
};

const tone = (value) => {
  if (value === "unknown") return " is-dim";
  if (value === "available") return " is-good";
  if (value === "not_found" || /block/.test(value)) return " is-bad";
  return "";
};

const pill = (value) =>
  `<span class="pill${tone(value)}">${escapeHtml(words(value))}</span>`;

async function boot() {
  try {
    const [dataset, analysis] = await Promise.all([
      fetch("data/research-dataset.json").then((r) => r.json()),
      fetch("data/analysis.json").then((r) => r.json()),
    ]);
    state.records = dataset.records;
    for (const [bucket, data] of Object.entries(analysis.opportunityBuckets)) {
      for (const app of data.apps)
        state.bucketByApp.set(app.toLowerCase(), bucket);
    }

    const categories = [
      ...new Set(state.records.map((r) => r.category)),
    ].sort();
    $("category").insertAdjacentHTML(
      "beforeend",
      categories.map((c) => `<option>${escapeHtml(c)}</option>`).join(""),
    );

    for (const id of ["search", "category", "bucket", "mcp"]) {
      $(id).addEventListener("input", render);
    }
    document.querySelectorAll("[data-bucket-jump]").forEach((button) =>
      button.addEventListener("click", () => {
        $("bucket").value = button.dataset.bucketJump;
        goToDataset();
      }),
    );

    $("rows").addEventListener("click", onRowActivate);
    $("rows").addEventListener("keydown", (e) => {
      if (e.key === "Enter" || e.key === " ") onRowActivate(e);
    });

    render();
  } catch (error) {
    $("result-count").textContent =
      "Dataset could not be loaded. Serve this directory over HTTP or open the downloaded JSON.";
    console.error(error);
  }
}

function goToDataset() {
  $("dataset").scrollIntoView();
  render();
}


function filtered() {
  const q = $("search").value.trim().toLowerCase();
  const category = $("category").value;
  const bucket = $("bucket").value;
  const mcp = $("mcp").value;
  return state.records.filter(
    (r) =>
      (!q || r.app.toLowerCase().includes(q)) &&
      (!category || r.category === category) &&
      (!bucket || state.bucketByApp.get(r.app.toLowerCase()) === bucket) &&
      (!mcp || r.mcp.status === mcp),
  );
}

function apiLabel(r) {
  const values = [];
  if (r.apiSurface.rest === true) values.push("REST");
  if (r.apiSurface.graphql === true) values.push("GraphQL");
  return values.length ? values.join(" + ") : "unknown";
}

function render() {
  state.view = filtered();
  $("result-count").textContent =
    `Showing ${state.view.length} of ${state.records.length} apps`;
  $("rows").innerHTML = state.view
    .map((r, i) => {
      const auth = r.authMethods.length
        ? r.authMethods.slice(0, 2).map(pill).join("")
        : pill("unknown");
      return `<tr class="summary" tabindex="0" role="button" aria-expanded="false" data-index="${i}"><td>${escapeHtml(r.app)}</td><td>${escapeHtml(r.category)}</td><td>${auth}</td><td>${pill(clean(r.accessModel))}</td><td>${pill(apiLabel(r))}</td><td>${pill(clean(r.mcp.status))}</td><td>${pill(clean(r.buildability))}</td><td>${r.unknownFields.length}</td></tr>`;
    })
    .join("");
}

function onRowActivate(e) {
  const row = e.target.closest("tr.summary");
  if (!row) return;
  if (e.type === "keydown") e.preventDefault();
  toggle(row, state.view[Number(row.dataset.index)]);
}

function toggle(row, record) {
  const next = row.nextElementSibling;
  if (next?.classList.contains("detail")) {
    next.remove();
    row.setAttribute("aria-expanded", "false");
    return;
  }
  document.querySelectorAll("tr.detail").forEach((r) => r.remove());
  document
    .querySelectorAll("tr.summary")
    .forEach((r) => r.setAttribute("aria-expanded", "false"));

  const fragment = $("detail-template").content.cloneNode(true);
  const detail = fragment.querySelector("tr");
  detail.querySelector("[data-description]").textContent = record.description;
  detail.querySelector("[data-blocker]").textContent =
    record.blocker || "No blocker claimed.";
  detail.querySelector("[data-unknown]").textContent = record.unknownFields
    .length
    ? record.unknownFields.join(", ")
    : "None";
  detail.querySelector("[data-evidence]").innerHTML = record.evidence.length
    ? record.evidence
        .map(
          (e) =>
            `<li><a href="${escapeHtml(safeUrl(e.url))}" target="_blank" rel="noreferrer">${escapeHtml(e.title)}</a> <span class="unknown">${escapeHtml(e.sourceType)} · ${escapeHtml(e.supports.join(", "))}</span></li>`,
        )
        .join("")
    : "<li>No retained evidence.</li>";
  row.after(fragment);
  row.setAttribute("aria-expanded", "true");
}

boot();
