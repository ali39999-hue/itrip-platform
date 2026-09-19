import json

with open(r"C:\Users\Lenovo\Desktop\arch_graph.html", "r", encoding="utf-8") as f:
    text = f.read()

s = text.find("const DATA = {")
e = text.find("};\n\nconst METRICS = {", s)
if e == -1:
    e = text.find("};\nconst METRICS = {", s)
if e == -1:
    e = text.find("};", s)

data_arch = json.loads(text[s+13:e+1])
arch_files = [n.get("source_file") for n in data_arch.get("nodes", []) if n.get("source_file")]

print("=== ARCH_GRAPH.HTML (Desktop) ===")
print("Total nodes:", len(data_arch.get("nodes", [])))
print("Sample files (first 10):", arch_files[:10])

with open(r"C:\Users\Lenovo\Desktop\firouzo\itrip-platform\graphify-out\graph.json", "r", encoding="utf-8") as f:
    itrip_raw = json.load(f)

itrip_nodes = itrip_raw.get("nodes", [])
itrip_files = [n.get("source_file") for n in itrip_nodes if n.get("source_file")]

print("\n=== ITRIP GRAPH.JSON ===")
print("Total nodes:", len(itrip_nodes))
print("Sample files (first 10):", itrip_files[:10])

# Check what layers/prefixes exist
prefixes = set(f.split("/")[0] if "/" in f else f.split("\\")[0] for f in itrip_files)
print("Root folders in itrip graph.json:", prefixes)
