import urllib.request
import os

files = {
    "lib/three.module.js": "https://unpkg.com/three@0.160.0/build/three.module.js",
    "lib/PointerLockControls.js": "https://unpkg.com/three@0.160.0/examples/jsm/controls/PointerLockControls.js",
    "lib/GLTFLoader.js": "https://unpkg.com/three@0.160.0/examples/jsm/loaders/GLTFLoader.js",
    "lib/tween.esm.js": "https://unpkg.com/@tweenjs/tween.js@21.0.0/dist/tween.esm.js"
}

os.makedirs("lib", exist_ok=True)
for path, url in files.items():
    print(f"Downloading {url} to {path}...")
    try:
        req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
        with urllib.request.urlopen(req) as response, open(path, 'wb') as out_file:
            out_file.write(response.read())
        print(f"Success: {path}")
    except Exception as e:
        print(f"Error downloading {url}: {e}")
