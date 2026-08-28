import os, base64

_files = {}
def add(path, b64_content):
    _files[path] = b64_content
def flush():
    for p, b in _files.items():
        os.makedirs(os.path.dirname(p), exist_ok=True)
        with open(p, 'w', encoding='utf-8') as ff:
            ff.write(base64.b64decode(b).decode('utf-8'))
        print(f ' -> {p} written')
    print('All files written successfully!')
