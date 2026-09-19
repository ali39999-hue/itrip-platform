#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Generator for iTrip / Firuzo Domain Architecture Graph Dashboard
Transforms graphify-out/graph.json into an interactive 4-level visualizer
Cleaned, domain-oriented, with Vazirmatn font, clean labels, and direct Level 2 domain focus.
"""

import json
import os
import sys
import re
from pathlib import Path
from collections import defaultdict

def clean_label(raw_label, node_id, source_file):
    lbl = raw_label or node_id or ""
    # Remove awkward prefixes
    lbl = re.sub(r"^src_app_\[?locale\]?_", "", lbl, flags=re.IGNORECASE)
    lbl = re.sub(r"^src_components_", "", lbl, flags=re.IGNORECASE)
    lbl = re.sub(r"^src_domains_", "", lbl, flags=re.IGNORECASE)
    lbl = re.sub(r"^src_services_", "", lbl, flags=re.IGNORECASE)
    lbl = re.sub(r"^src_actions_", "", lbl, flags=re.IGNORECASE)
    lbl = re.sub(r"^src_lib_", "", lbl, flags=re.IGNORECASE)

    # If label ends with redundant filename repeated, clean it
    parts = lbl.split("_")
    if len(parts) > 1 and parts[-1].lower() == parts[-2].lower():
        parts.pop()
        lbl = "_".join(parts)

    return lbl or raw_label

def classify_layer(source_file, node_id, file_type):
    sf = (source_file or "").lower().replace("\\", "/")
    nid = (node_id or "").lower()

    if file_type == "external" or sf.startswith("node_modules") or nid.startswith("ref_") or nid.startswith("ext_"):
        return "external"
    if any(k in sf for k in ["/tests/", "/__tests__/", ".test.", ".spec."]):
        return "test"
    if any(k in sf for k in ["docs/", "_docs/", ".md"]):
        return "docs"
    if any(k in sf for k in ["scripts/", "bin/"]):
        return "script"
    if "prisma/migrations" in sf:
        return "migration"
    if any(k in sf for k in [".config", "config.", "package.json", "tsconfig", ".yaml", ".yml", ".env"]):
        return "config"
    if any(k in sf for k in ["docker", "k8s", "deploy", "nginx"]):
        return "infra"
    if any(k in sf for k in ["src/components/", "src/app/", "src/hooks/", "src/stores/", "src/i18n/"]):
        return "frontend"
    if any(k in sf for k in ["src/domains/", "src/services/", "src/actions/", "src/workers/", "src/lib/", "prisma/", "src/auth."]):
        return "backend"
    if sf.startswith("src/"):
        return "backend"
    return "other"

def classify_domain(source_file, node_id, label):
    s = (source_file + " " + node_id + " " + label).lower().replace("\\", "/")
    if "booking" in s:
        return "booking (رزرواسیون)"
    if "inventory" in s or "allotment" in s:
        return "inventory (انبار و ظرفیت)"
    if "ledger" in s or "finance" in s or "money" in s or "accounting" in s or "transaction" in s:
        return "finance (مالی و لجر)"
    if "payment" in s or "shetab" in s or "gateway" in s or "wallet" in s or "zarinpal" in s:
        return "payments (درگاه‌ها و پرداخت)"
    if "refund" in s:
        return "refund (استرداد)"
    if "identity" in s or "auth" in s or "permission" in s or "user" in s or "role" in s:
        return "identity (احراز هویت و دسترسی)"
    if "supplier" in s or "parto" in s or "nadia" in s or "ecardo" in s or "eghamat" in s or "crs" in s:
        return "supplier (تأمین‌کنندگان سفر)"
    if "hotel" in s or "room" in s:
        return "hotels (هتل و اقامت)"
    if "flight" in s or "airport" in s or "airline" in s:
        return "flights (پرواز و بلیت)"
    if "content" in s or "cms" in s or "destination" in s:
        return "content (محتوا و مقاصد)"
    if "observability" in s or "logger" in s or "telemetry" in s or "error" in s or "metrics" in s:
        return "observability (مانیتورینگ)"
    if "admin" in s or "operator" in s:
        return "admin (پنل مدیریت)"
    if "plan" in s or "trip" in s or "itinerary" in s or "planner" in s:
        return "planner (برنامه‌ریز سفر)"
    if "ocr" in s or "passport" in s:
        return "ocr (پاسپورت خوان)"
    if "i18n" in s or "locale" in s or "translation" in s:
        return "i18n (چندزبانه)"
    if "shared" in s or "lib/" in s:
        return "shared (کتابخانه‌ها)"
    return "core (هسته سیستم)"

def classify_fe_type(source_file, label):
    sf = (source_file or "").lower()
    lbl = (label or "").lower()
    if sf.endswith("page.tsx") or sf.endswith("page.jsx"):
        return "page"
    if sf.endswith("layout.tsx") or sf.endswith("layout.jsx"):
        return "layout"
    if sf.endswith("route.ts") or sf.endswith("route.js"):
        return "route"
    if "hooks/" in sf or lbl.startswith("use"):
        return "hook"
    if "stores/" in sf or "store" in lbl:
        return "store"
    if "services/" in sf or "service" in lbl:
        return "service"
    if "actions/" in sf or "action" in lbl:
        return "action"
    if "components/" in sf:
        return "component"
    return ""

def classify_role(label, source_file):
    name = (label + " " + (source_file or "")).lower()
    for r in ["modal", "sheet", "drawer", "dialog", "form", "card", "table", "button", "picker", "calendar", "selector", "engine"]:
        if r in name:
            return r
    return ""

def main():
    root_dir = Path(__file__).resolve().parent.parent

    candidates = [
        root_dir / "graphify-out" / "graph.json",
        root_dir / "src" / "graphify-out" / "graph.json",
        Path("graphify-out/graph.json"),
        Path("src/graphify-out/graph.json")
    ]
    graph_path = None
    for c in candidates:
        if c.exists():
            graph_path = c
            break

    if not graph_path:
        print("ERROR: graphify-out/graph.json not found.")
        sys.exit(1)

    print(f"[build_arch_graph] Reading graph from: {graph_path}")
    with open(graph_path, "r", encoding="utf-8") as f:
        raw_data = json.load(f)

    raw_nodes = raw_data.get("nodes", [])
    raw_links = raw_data.get("links", []) or raw_data.get("edges", [])

    # Filter out noisy non-code items (e.g., pure image assets or traineddata)
    valid_nodes = []
    for n in raw_nodes:
        sf = (n.get("source_file") or "").lower()
        if any(sf.endswith(ext) for ext in [".traineddata", ".png", ".jpg", ".jpeg", ".svg", ".ico"]):
            continue
        valid_nodes.append(n)

    valid_ids = set(n.get("id") for n in valid_nodes)
    print(f"[build_arch_graph] Filtered nodes: {len(valid_nodes)} (clean code & architecture nodes)")

    deps_map = defaultdict(set)
    rdeps_map = defaultdict(set)
    edges_list = []

    for l in raw_links:
        src = str(l.get("source") or l.get("from"))
        tgt = str(l.get("target") or l.get("to"))
        rel = str(l.get("relation", "relates"))
        if src in valid_ids and tgt in valid_ids and src != tgt:
            deps_map[src].add(tgt)
            rdeps_map[tgt].add(src)
            edges_list.append({
                "from": src,
                "to": tgt,
                "relation": rel,
                "ext": (l.get("file_type") == "external" or "ref_" in src or "ref_" in tgt)
            })

    nodes_list = []
    layers_dict = defaultdict(list)
    domains_dict = defaultdict(list)
    communities_dict = defaultdict(lambda: {"name": "", "members": []})
    unique_files = set()
    symbol_count = 0

    for n in valid_nodes:
        nid = str(n.get("id"))
        lbl = clean_label(n.get("label"), nid, n.get("source_file"))
        sf = n.get("source_file") or ""
        loc = n.get("source_location") or ""
        ft = n.get("file_type") or "code"
        comm_id = str(n.get("community", 0))
        comm_name = n.get("community_name") or f"Cluster {comm_id}"

        is_sym = bool(loc or n.get("_callable") or n.get("_origin") == "ast" or ("." in sf and sf != lbl))
        if is_sym:
            symbol_count += 1
        if sf:
            unique_files.add(sf)

        layer = classify_layer(sf, nid, ft)
        domain = classify_domain(sf, nid, lbl)
        fe_type = classify_fe_type(sf, lbl)
        comp_role = classify_role(lbl, sf)

        node_rec = {
            "id": nid,
            "label": lbl,
            "source_file": sf,
            "loc": loc,
            "layer": layer,
            "domain": domain,
            "community": comm_id,
            "community_name": comm_name,
            "kind": n.get("kind") or ("symbol" if is_sym else "file"),
            "fe_type": fe_type,
            "component_role": comp_role,
            "is_symbol": is_sym,
            "external": (layer == "external"),
            "package": n.get("package", ""),
            "language": n.get("language") or ("TypeScript" if sf.endswith((".ts", ".tsx")) else ""),
            "deps": sorted(list(deps_map[nid])),
            "rdeps": sorted(list(rdeps_map[nid]))
        }
        nodes_list.append(node_rec)
        layers_dict[layer].append(nid)
        domains_dict[domain].append(nid)

        comm_rec = communities_dict[comm_id]
        if not comm_rec["name"]:
            comm_rec["name"] = comm_name
        comm_rec["members"].append(nid)

    total_nodes = len(nodes_list)
    total_edges = len(edges_list)
    avg_deg = round((2.0 * total_edges) / max(1, total_nodes), 2)
    comm_sizes = [len(c["members"]) for c in communities_dict.values()]
    avg_comm_size = round(sum(comm_sizes) / max(1, len(comm_sizes)), 1)
    largest_comm = max(comm_sizes) if comm_sizes else 0

    metrics = {
        "پلتفرم": "iTrip / Firuzo Architecture Graph",
        "تعداد کل گره‌ها (Nodes)": total_nodes,
        "تعداد اتصالات (Edges)": total_edges,
        "فایل‌های کد": len(unique_files),
        "سمبل‌ها و توابع": symbol_count,
        "خوشه‌های معماری": len(communities_dict),
        "میانگین اتصالات هر گره": avg_deg,
    }
    for lk, lmembers in sorted(layers_dict.items()):
        metrics[f"لایه {lk}"] = len(lmembers)

    data_payload = {
        "nodes": nodes_list,
        "edges": edges_list,
        "layers": {k: len(v) for k, v in layers_dict.items()},
        "domains": {k: len(v) for k, v in domains_dict.items()},
        "communities": communities_dict
    }

    html_content = generate_html_document(data_payload, metrics)

    out_dir = root_dir / "graphify-out"
    out_dir.mkdir(parents=True, exist_ok=True)
    out_file1 = out_dir / "itrip_arch_graph.html"
    out_file1.write_text(html_content, encoding="utf-8")
    print(f"[build_arch_graph] SUCCESS! Wrote: {out_file1}")

    desktop_out = Path("C:/Users/Lenovo/Desktop/itrip_arch_graph.html")
    try:
        desktop_out.write_text(html_content, encoding="utf-8")
        print(f"[build_arch_graph] SUCCESS! Saved to Desktop: {desktop_out}")
    except Exception as ex:
        print(f"[build_arch_graph] Desktop save skipped: {ex}")

def generate_html_document(data_payload, metrics):
    data_json = json.dumps(data_payload, ensure_ascii=False)
    metrics_json = json.dumps(metrics, indent=2, ensure_ascii=False)

    return f"""<!doctype html>
<html lang="fa" dir="rtl">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>iTrip / Firuzo · داشبورد جامع معماری نرم‌افزار</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Vazirmatn:wght@400;500;600;700;800&display=swap" rel="stylesheet">
<script src="https://unpkg.com/vis-network@9.1.6/standalone/umd/vis-network.min.js"
        integrity="sha384-Ux6phic9PEHJ38YtrijhkzyJ8yQlH8i/+buBR8s3mAZOJrP1gwyvAcIYl3GWtpX1"
        crossorigin="anonymous"></script>
<style>
:root{{
  --bg:#090d13;--panel:#111620;--panel2:#171f2c;--border:#263142;--text:#e6edf3;
  --muted:#8b949e;--accent:#00A9A5;--action:#F0A62A;--green:#3fb950;--red:#f85149;--amber:#d29922;--purple:#bc8cff;
}}
*{{box-sizing:border-box}}
html,body{{margin:0;height:100%;background:var(--bg);color:var(--text);
  font:13px/1.5 "Vazirmatn",system-ui,-apple-system,sans-serif}}
body{{overflow:hidden}}
#app{{display:grid;grid-template-columns:300px minmax(0,1fr) 350px;
  grid-template-rows:56px minmax(0,1fr);
  grid-template-areas:"top top top" "side graph info";height:100vh;width:100vw}}
header{{grid-area:top;display:flex;align-items:center;gap:16px;padding:0 18px;
  background:var(--panel);border-bottom:1px solid var(--border)}}
header h1{{font-size:16px;margin:0;font-weight:800;color:var(--accent);display:flex;align-items:center;gap:10px}}
header h1 span{{color:var(--text);font-weight:500;font-size:13.5px}}
header .stats{{color:var(--muted);font-size:12px;margin-right:auto}}
header input#search{{flex:0 1 380px;background:var(--panel2);border:1px solid var(--border);
  color:var(--text);border-radius:8px;padding:8px 14px;font-size:13px;outline:none;font-family:inherit}}
header input#search:focus{{border-color:var(--accent)}}
#sidebar{{grid-area:side;overflow-y:auto;background:var(--panel);border-left:1px solid var(--border);padding:14px}}
#graph{{grid-area:graph;position:relative;min-width:0;min-height:0;overflow:hidden}}
#network{{position:absolute;inset:0;width:100%;height:100%}}
#network canvas{{width:100%!important;height:100%!important}}
#info{{grid-area:info;overflow-y:auto;background:var(--panel);border-right:1px solid var(--border);padding:16px}}
.section{{margin-bottom:18px}}
.section h3{{margin:0 0 10px;font-size:11.5px;text-transform:uppercase;letter-spacing:.05em;color:var(--muted);font-weight:700}}
.seg{{display:flex;flex-wrap:wrap;gap:5px}}
.seg button{{background:var(--panel2);border:1px solid var(--border);color:var(--text);
  border-radius:7px;padding:6px 12px;font-size:12px;cursor:pointer;font-family:inherit;font-weight:500}}
.seg button.active{{background:var(--accent);border-color:var(--accent);color:#021e1d;font-weight:700}}
.chip{{display:inline-flex;align-items:center;gap:6px;margin:2px;padding:4px 10px;border-radius:20px;
  background:var(--panel2);border:1px solid var(--border);font-size:12px;cursor:pointer;user-select:none}}
.chip.active{{background:#0d3635;border-color:var(--accent);color:#68e8e4}}
.chip .n{{color:var(--muted);font-size:11px}}
.field{{margin:5px 0}}
.field b.k{{color:var(--muted);font-weight:500;margin-left:6px}}
.field .v{{word-break:break-all}}
a.nlink{{color:var(--accent);cursor:pointer;text-decoration:none;font-weight:600}}
a.nlink:hover{{text-decoration:underline}}
#floating{{position:absolute;top:12px;left:12px;display:flex;gap:8px;z-index:5}}
#floating button{{background:var(--panel);border:1px solid var(--border);color:var(--text);
  border-radius:8px;padding:7px 12px;cursor:pointer;font-size:12px;font-family:inherit}}
#floating button:hover{{border-color:var(--accent)}}
#floating button.active{{background:var(--accent);border-color:var(--accent);color:#021e1d;font-weight:700}}
#breadcrumb{{position:absolute;bottom:12px;right:14px;z-index:5;background:rgba(17,22,32,.94);
  border:1px solid var(--border);border-radius:8px;padding:7px 14px;font-size:12.5px;color:var(--muted)}}
#breadcrumb b{{color:var(--text)}}
.legend-dot{{width:10px;height:10px;border-radius:3px;display:inline-block;margin-left:6px;vertical-align:-1px}}
.hidden{{display:none!important}}
.dep-list{{max-height:220px;overflow-y:auto;border:1px solid var(--border);border-radius:7px;padding:6px 10px;background:#090d13}}
.dep-list div{{padding:4px 0;border-bottom:1px solid #171f2c}}
.dep-list div:last-child{{border-bottom:none}}
.tag{{display:inline-block;padding:2px 8px;border-radius:5px;font-size:10.5px;margin-right:4px;vertical-align:1px}}
.tag.layer-frontend{{background:#0d3a5c;color:#7cc4ff}}
.tag.layer-backend{{background:#14401f;color:#63e685}}
.tag.layer-test{{background:#3d2e00;color:#ffd35c}}
.tag.layer-docs{{background:#2b2140;color:#c0a0ff}}
.tag.layer-external{{background:#3a2226;color:#ff9aa2}}
.tag.kind-page{{background:#0e4429;color:#56d364}}
.tag.kind-hook{{background:#5a2000;color:#ffa657}}
.tag.kind-service{{background:#1c3d5a;color:#90cdf4}}
.tag.kind-store{{background:#3b2d54;color:#d6bcfa}}
.tag.kind-action{{background:#442a1d;color:#fbd38d}}
</style>
</head>
<body>
<div id="app">
  <header>
    <h1>iTrip / Firuzo <span>· نقشه تعاملی معماری نرم‌افزار</span></h1>
    <input id="search" type="search" placeholder="جستجو در سرویس‌ها، توابع، دامنه‌ها (مثلاً: Booking, Money, Inventory, Shetab)..." autocomplete="off">
    <span class="stats" id="hdr-stats"></span>
  </header>
  <nav id="sidebar">
    <div class="section"><h3>سطح دید معماری (Level)</h3>
      <div class="seg" id="level-seg">
        <button data-level="1">۱ · لایه‌ها (Layers)</button>
        <button data-level="2" class="active">۲ · دامنه‌ها (Domains)</button>
        <button data-level="3">۳ · فایل‌ها (Files)</button>
        <button data-level="4">۴ · توابع و سمبل‌ها (Symbols)</button>
      </div>
    </div>
    <div class="section"><h3>دامنه‌های تجاری iTrip (Domains)</h3><div id="domain-filters"></div></div>
    <div class="section"><h3>لایه‌ها (Layers)</h3><div id="layer-filters"></div></div>
    <div class="section"><h3>آمار و سلامت کد (Metrics)</h3><pre id="metrics" style="white-space:pre-wrap;color:var(--muted);font-size:11.5px;font-family:inherit"></pre></div>
  </nav>
  <main id="graph">
    <div id="network"></div>
    <div id="floating">
      <button id="btn-fit" title="انطباق با صفحه">⤢ Fit</button>
      <button id="btn-reset" title="بازنشانی فیلترها">↺ Reset</button>
      <button id="btn-deps" title="مشاهده وابستگی‌های خروجی">→ Deps (وابستگی‌ها)</button>
      <button id="btn-rdeps" title="تحلیل شعاع تخریب: چه جاهایی به این ماژول وابسته هستند">← Rdeps (شعاع تخریب)</button>
    </div>
    <div id="breadcrumb">سطح جاری: <b id="bc-level">۲</b> · <b id="bc-view">دامنه‌ها (Domains)</b></div>
  </main>
  <aside id="info"><div id="info-empty" style="color:var(--muted)">روی هر گره کلیک کنید تا شناسنامه و ارتباطات آن نمایان شود.</div><div id="info-body"></div></aside>
</div>
<script>
const DATA = {data_json};
const METRICS = {metrics_json};

const LAYER_COLORS = {{
  frontend:"#58a6ff",backend:"#00A9A5",test:"#d29922",docs:"#bc8cff",
  external:"#f85149",config:"#8b949e",infra:"#79c0ff",migration:"#db6d28",script:"#e3b341",other:"#6e7681"
}};

let network=null, allNodes=new Map(), level=2, sel=null, hlDeps=false, hlRdeps=false, grpMap=new Map();
let l4File=null;
const activeLayers=new Set(), activeDomains=new Set();

function esc(s){{return String(s??"").replace(/[&<>"']/g,c=>({{"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}}[c]))}}

DATA.nodes.forEach(n=>allNodes.set(n.id,n));
const edgesByNode=(()=>{{
  const m=new Map();
  DATA.edges.forEach(e=>{{
    if(!m.has(e.from))m.set(e.from,[]);
    if(!m.has(e.to))m.set(e.to,[]);
    m.get(e.from).push({{other:e.to,rel:e.relation}});
    m.get(e.to).push({{other:e.from,rel:e.relation}});
  }});
  return m;
}})();

function layerOf(n){{return n.layer||"other"}}
function colorOf(n){{return LAYER_COLORS[layerOf(n)]||"#6e7681"}}

/* ── LEVEL AGGREGATION ─────────────────────────────────────────────── */
function aggregate(lvl){{
  const gidOf = lvl===1 ? (n=>layerOf(n))
              : lvl===2 ? (n=>n.domain||"_shared")
              : lvl===3 ? (n=>n.source_file||("_"+layerOf(n)))
              : (n=>n.id);
  const g=new Map();
  DATA.nodes.forEach(n=>{{
    if(!passesFilters(n))return;
    if(lvl>=3 && n.external)return;
    if(lvl===4){{
      if(!l4File) return;
      if(n.source_file!==l4File) return;
    }}
    const gid=gidOf(n);
    if(!g.has(gid)) g.set(gid,{{members:[],sample:n}});
    g.get(gid).members.push(n.id);
  }});

  const nodes=[];
  const indexOf=new Map();
  for(const [gid,info] of g){{
    indexOf.set(gid,nodes.length);
    const s=info.sample;
    let lbl = gid;
    if(lvl===1){{
      lbl = "لایه: " + gid;
    }} else if(lvl===2){{
      lbl = gid;
    }} else if(lvl===3){{
      lbl = s.source_file ? s.source_file.split("/").pop() : s.label;
    }} else {{
      lbl = s.label;
    }}

    nodes.push({{
      id:gid,
      label:lbl,
      size:Math.min(65,10+Math.sqrt(info.members.length)*4.2),
      color:colorOf(s),
      level:lvl,
      members:info.members,
      title:(lvl<=2?`${{info.members.length}} گره در ${{gid}}`:(s.source_file||gid)),
      raw:s
    }});
  }}

  const em=new Map();
  DATA.edges.forEach(e=>{{
    if(lvl>=3&&e.ext)return;
    const aNode = allNodes.get(e.from);
    const bNode = allNodes.get(e.to);
    if(!aNode || !bNode) return;
    const a=indexOf.get(gidOf(aNode)), b=indexOf.get(gidOf(bNode));
    if(a==null||b==null||a===b)return;
    const k=Math.min(a,b)+"-"+Math.max(a,b);
    em.set(k,(em.get(k)||0)+1);
  }});

  const edges=[...em.entries()].map(([k,w])=>{{
    const[a,b]=k.split("-").map(Number);
    return {{
      from:nodes[a].id,
      to:nodes[b].id,
      value:Math.min(8,1+Math.log2(w)),
      width:Math.min(4,0.6+Math.log2(w)*0.7),
      w
    }};
  }});

  return {{nodes,edges,indexOf}};
}}

/* ── FILTERS ───────────────────────────────────────────────────────── */
function passesFilters(n){{
  if(activeLayers.size&&!activeLayers.has(layerOf(n)))return false;
  if(activeDomains.size&&!activeDomains.has(n.domain))return false;
  return true;
}}

/* ── RENDER ────────────────────────────────────────────────────────── */
function render(){{
  const agg=aggregate(level);
  grpMap=new Map(agg.nodes.map(nd=>[nd.id,nd]));
  const vnodes=agg.nodes.map(nd=>({{
    id:nd.id,
    label:nd.label,
    size:nd.size,
    color:{{background:colorOf(nd.raw),border:"#090d13",highlight:{{background:colorOf(nd.raw),border:"#ffffff"}}}},
    font:{{color:"#e6edf3",size:level>=3?11:13,face:"Vazirmatn, Tahoma"}},
    borderWidth:0,
    shape:level>=3?"dot":"box",
    title:esc(nd.title),
    _raw:nd,
  }}));

  const vedges=agg.edges.map(e=>({{
    from:e.from,
    to:e.to,
    value:e.value,
    width:e.width,
    color:{{color:"#303e50",highlight:"#00A9A5",hover:"#00A9A5"}},
    arrows:{{to:{{enabled:true,scaleFactor:.5}}}},
    smooth:false,
  }}));

  if(network){{network.destroy();network=null;}}
  network=new vis.Network(document.getElementById("network"),{{nodes:vnodes,edges:vedges}},{{
    physics:{{
      solver:"forceAtlas2Based",
      forceAtlas2Based:{{gravitationalConstant:-45,centralGravity:.008,springLength:level>=3?75:125,springConstant:.06}},
      stabilization:{{fit:true,iterations:200}}
    }},
    interaction:{{hover:true,tooltipDelay:120,keyboard:true}},
    edges:{{selectionWidth:2}},
  }});

  network.on("click",p=>{{
    if(p.nodes.length)selectNode(p.nodes[0]);
    else{{sel=null;clearHl();}}
  }});

  network.on("doubleClick",p=>{{
    if(!p.nodes.length)return;
    if(level<=2){{setLevel(level+1);}}
    else if(level===3){{setLevel(4,p.nodes[0]);}}
  }});

  document.getElementById("bc-level").textContent=level;
  document.getElementById("bc-view").textContent=["لایه‌ها (Layers)","دامنه‌های تجاری (Domains)","فایل‌های پروژه (Files)","توابع و سمبل‌ها (Symbols)"][level-1];
  renderSidebar();renderDomainFilters();
  document.getElementById("hdr-stats").textContent=
    `${{vnodes.length}} گره نمایان · ${{DATA.nodes.length}} کل گره‌ها · ${{DATA.edges.length}} یال ارتباطی`;
}}

function setLevel(l, drillFile){{
  if(l===4){{
    const f = drillFile || (sel && allNodes.get(sel) && allNodes.get(sel).source_file) || l4File;
    if(!f){{ l=3; }}
    else l4File=f;
  }} else if(l<4){{ l4File=null; }}
  level=l;sel=null;hlDeps=hlRdeps=false;
  document.querySelectorAll("#level-seg button").forEach(b=>b.classList.toggle("active",+b.dataset.level===l));
  render();
}}

function renderSidebar(){{
  const lf=document.getElementById("layer-filters");lf.innerHTML="";
  Object.keys(DATA.layers).forEach(L=>{{
    const cnt=DATA.layers[L];
    const el=document.createElement("div");el.className="chip"+(activeLayers.has(L)?" active":"");
    el.innerHTML=`<span class="legend-dot" style="background:${{LAYER_COLORS[L]||"#888"}}"></span>${{esc(L)}} <span class="n">${{cnt}}</span>`;
    el.onclick=()=>{{activeLayers.has(L)?activeLayers.delete(L):activeLayers.add(L);render()}};
    lf.appendChild(el);
  }});
}}

function renderDomainFilters(){{
  const df=document.getElementById("domain-filters");df.innerHTML="";
  Object.entries(DATA.domains).forEach(([dom,cnt])=>{{
    const el=document.createElement("div");el.className="chip"+(activeDomains.has(dom)?" active":"");
    el.innerHTML=`${{esc(dom)}} <span class="n">${{cnt}}</span>`;
    el.onclick=()=>{{activeDomains.has(dom)?activeDomains.delete(dom):activeDomains.add(dom);render()}};
    df.appendChild(el);
  }});
}}

/* ── SELECTION / INSPECTOR ─────────────────────────────────────────── */
function selectNode(gid){{
  sel=gid;
  let raw=null;
  if(level>=3){{raw=allNodes.get(gid)||null;}}
  else if(level===2){{raw={{domain:gid,aggregate:true}};}}
  else if(level===1){{raw={{layer:gid,aggregate:true}};}}
  showInfo(gid,raw);
  if(hlDeps)highlightDeps();
  if(hlRdeps)highlightRdeps();
}}

function showInfo(gid,raw){{
  document.getElementById("info-empty").classList.add("hidden");
  const b=document.getElementById("info-body");
  if(!raw||raw.aggregate){{
    const members=(()=>{{const g=grpMap.get(gid);return g?g.members:[]}})();
    const byLayer={{}};
    members.forEach(m=>{{const n=allNodes.get(m);if(n){{byLayer[layerOf(n)]=(byLayer[layerOf(n)]||0)+1}}}});
    b.innerHTML=`<div class="field"><b class="k">دامنه / گروه:</b><span class="v"><b style="color:var(--accent)">${{esc(gid)}}</b></span></div>
      <div class="field"><b class="k">تعداد کل اعضا:</b><span class="v">${{members.length}} ماژول و تابع</span></div>
      <div class="field"><b class="k">لایه‌ها:</b><span class="v">${{Object.entries(byLayer).map(([k,v])=>esc(k)+": "+v).join(" · ")}}</span></div>
      <div class="section" style="margin-top:14px">
        ${{level===3
          ? `<button style="background:var(--accent);color:#021e1d;border:none;padding:7px 14px;border-radius:7px;cursor:pointer;font-weight:700;font-family:inherit" onclick="setLevel(4,'${{esc(gid)}}')">کالبدشکافی توابع این فایل (Level 4) →</button>`
          : `<button style="background:var(--accent);color:#021e1d;border:none;padding:7px 14px;border-radius:7px;cursor:pointer;font-weight:700;font-family:inherit" onclick="setLevel(${{Math.min(4,level+1)}})">مشاهده فایل‌های این بخش (Drill Down) →</button>`}}
      </div>
      <div class="section"><h3>نمونه فایل‌ها و ماژول‌ها (${{Math.min(members.length, 25)}} مورد)</h3>
        <div class="dep-list">${{members.slice(0,25).map(m=>{{
          const n=allNodes.get(m);return `<div><a class="nlink" onclick="jumpTo('${{esc(m)}}')">${{esc(n?n.label:m)}}</a></div>`
        }}).join("")}}</div>
      </div>`;
    return;
  }}

  const n=raw;
  const deps=n.deps||[],rdeps=n.rdeps||[];
  const linkList=(ids,dir)=>ids.slice(0,40).map(id=>{{
    const t=allNodes.get(id);
    return `<div><span style="color:var(--muted)">${{dir}}</span> <a class="nlink" onclick="jumpTo('${{esc(id)}}')">${{esc(t?t.label:id)}}</a>
      ${{t&&t.source_file?`<div style="color:var(--muted);font-size:10.5px;margin-right:12px;direction:ltr;text-align:right">${{esc(t.source_file)}}${{t.loc?" "+esc(t.loc):""}}</div>`:""}}</div>`
  }}).join("");

  b.innerHTML=`
    <div class="field" style="font-size:14px;border-bottom:1px solid var(--border);padding-bottom:8px;margin-bottom:10px">
      <b>${{esc(n.label)}}</b>
      <span class="tag layer-${{esc(layerOf(n))}}">${{esc(layerOf(n))}}</span>
      ${{n.fe_type?`<span class="tag kind-${{esc(n.fe_type)}}">${{esc(n.fe_type)}}</span>`:""}}
      ${{n.component_role?`<span class="tag kind-hook">${{esc(n.component_role)}}</span>`:""}}
    </div>
    <div class="field"><b class="k">نوع:</b><span class="v">${{esc(n.kind)}}${{n.language?" ("+esc(n.language)+")":""}}</span></div>
    <div class="field"><b class="k">مسیر فایل:</b><span class="v" style="direction:ltr;display:inline-block">${{n.source_file?esc(n.source_file)+(n.loc?" : "+esc(n.loc):""):"—"}}</span></div>
    <div class="field"><b class="k">دامنه تجاری:</b><span class="v"><b style="color:var(--action)">${{esc(n.domain||"—")}}</b></span></div>
    <div class="field"><b class="k">وابستگی‌های خروجی:</b><span class="v">${{deps.length}}</span></div>
    <div class="field"><b class="k">شعاع تخریب (Blast Radius):</b><span class="v" style="color:${{rdeps.length>25?"#f85149":rdeps.length>5?"#ffd35c":"#63e685"}};font-weight:700">${{rdeps.length}} ماژول تحت‌تاثیر</span></div>

    <div class="section" style="margin-top:14px">
      <h3>استفاده می‌کند از (${{deps.length}}) → [Depends on]</h3>
      <div class="dep-list">${{linkList(deps,"→")||"<div style='color:var(--muted)'>بدون وابستگی خروجی</div>"}}</div>
    </div>
    <div class="section">
      <h3>استفاده‌شده توسط (${{rdeps.length}}) ← [شعاع تخریب / Depended by]</h3>
      <div class="dep-list">${{linkList(rdeps,"←")||"<div style='color:var(--muted)'>بدون وابستگی ورودی</div>"}}</div>
    </div>`;
}}

window.jumpTo=function(nid){{
  const n=allNodes.get(nid);if(!n)return;
  const isSym = !!n.is_symbol;
  if(n.source_file && isSym){{ setLevel(4, n.source_file); }}
  else if(n.source_file){{ setLevel(3); }}
  else if(n.domain){{ setLevel(2); }}
  else {{ setLevel(1); }}

  setTimeout(()=>{{
    const g=gidTarget(n);
    try{{network.selectNodes([g]);network.focus(g,{{scale:.9,animation:true}});}}catch(e){{}}
    showInfo(g, level>=3?n:{{domain:n.domain||"_shared",aggregate:true}});
    sel=g;
  }},380);
}};

function gidTarget(n){{
  if(level===4) return n.id;
  if(level===3) return n.source_file||n.id;
  if(level===2) return n.domain||"_shared";
  return layerOf(n);
}}

/* ── DEPENDENCY HIGHLIGHT ──────────────────────────────────────────── */
function highlightDeps(){{
  if(!sel)return;
  const raw=resolveRaw(sel);if(!raw||raw.aggregate)return;
  const keep=new Set([sel,...raw.deps]);
  network.body.data.nodes.forEach(nd=>{{nd.hidden=!keep.has(nd.id);}});
  network.body.data.edges.forEach(e=>{{e.hidden=!(keep.has(e.from)&&keep.has(e.to));}});
  network.redraw();
}}

function highlightRdeps(){{
  if(!sel)return;
  const raw=resolveRaw(sel);if(!raw||raw.aggregate)return;
  const keep=new Set([sel,...raw.rdeps]);
  network.body.data.nodes.forEach(nd=>{{nd.hidden=!keep.has(nd.id);}});
  network.body.data.edges.forEach(e=>{{e.hidden=!(keep.has(e.from)&&keep.has(e.to));}});
  network.redraw();
}}

function resolveRaw(gid){{
  if(level>=3){{const n=allNodes.get(gid);if(n)return n;}}
  const g=grpMap&&grpMap.get(gid);
  return g?{{aggregate:true}}:null;
}}

function clearHl(){{
  if(!network)return;
  network.body.data.nodes.forEach(nd=>{{nd.hidden=false;}});
  network.body.data.edges.forEach(e=>{{e.hidden=false;}});
  network.redraw();
}}

/* ── SEARCH ────────────────────────────────────────────────────────── */
const searchEl=document.getElementById("search");
let searchTimer=null;
searchEl.addEventListener("input",()=>{{
  clearTimeout(searchTimer);
  searchTimer=setTimeout(()=>{{
    const q=searchEl.value.trim().toLowerCase();if(!q)return;
    let best=null;
    for(const n of DATA.nodes){{
      if(n.label.toLowerCase().includes(q)||(n.source_file||"").toLowerCase().includes(q)||(n.domain||"").toLowerCase().includes(q)){{best=n;break}}
    }}
    if(best){{jumpTo(best.id);}}
  }},250);
}});

/* ── BUTTONS ───────────────────────────────────────────────────────── */
document.getElementById("btn-fit").onclick=()=>network.fit({{animation:true}});
document.getElementById("btn-reset").onclick=()=>{{
  activeLayers.clear();activeDomains.clear();sel=null;clearHl();
  document.getElementById("btn-deps").classList.remove("active");
  document.getElementById("btn-rdeps").classList.remove("active");
  setLevel(2);
}};
document.getElementById("btn-deps").onclick=function(){{
  hlDeps=!hlDeps;
  this.classList.toggle("active", hlDeps);
  if(hlDeps){{document.getElementById("btn-rdeps").classList.remove("active");hlRdeps=false;highlightDeps();}}
  else{{clearHl();}}
}};
document.getElementById("btn-rdeps").onclick=function(){{
  hlRdeps=!hlRdeps;
  this.classList.toggle("active", hlRdeps);
  if(hlRdeps){{document.getElementById("btn-deps").classList.remove("active");hlDeps=false;highlightRdeps();}}
  else{{clearHl();}}
}};
document.querySelectorAll("#level-seg button").forEach(b=>b.onclick=()=>setLevel(+b.dataset.level));

document.getElementById("metrics").textContent=Object.entries(METRICS).map(([k,v])=>`${{k}}: ${{v}}`).join("\\n");

setLevel(2);
</script>
</body>
</html>
"""

if __name__ == "__main__":
    main()
