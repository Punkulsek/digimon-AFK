"""Fetch the requested Kanto art from a pinned PokeAPI/sprites commit.

Uses curl's inherited HTTPS proxy and TLS trust, validates image signatures,
and writes hashes for reproducible verification. Never executes remote code.
"""
from concurrent.futures import ThreadPoolExecutor
import hashlib
import json
from pathlib import Path
import subprocess

ROOT = Path(__file__).resolve().parent.parent
COMMIT = '97a7832d307311c0e1c6ea9035308bf80cc94f81'
BASE = f'https://raw.githubusercontent.com/PokeAPI/sprites/{COMMIT}/sprites/pokemon'
DEST = ROOT / 'public/pokemon'
DEST.mkdir(parents=True, exist_ok=True)
(DEST / 'animated').mkdir(exist_ok=True)


def fetch(item):
    number, animated = item
    extension = 'gif' if animated else 'png'
    relative = f'animated/{number}.gif' if animated else f'{number}.png'
    remote = f'versions/generation-v/black-white/animated/{number}.gif' if animated else relative
    destination = DEST / relative
    # Cache only files already attested by this source manifest.
    if destination.exists() and relative in prior and hashlib.sha256(destination.read_bytes()).hexdigest() == prior[relative]['sha256']:
        return prior[relative]
    data = subprocess.check_output(['curl', '--fail', '--silent', '--show-error', '--location', '--retry', '2', '--max-time', '45', f'{BASE}/{remote}'])
    valid = data.startswith((b'GIF87a', b'GIF89a')) if animated else data.startswith(b'\x89PNG\r\n\x1a\n')
    if not valid:
        raise ValueError(f'Invalid {extension}: {relative}')
    destination.write_bytes(data)
    return dict(file=relative, source=f'{BASE}/{remote}', sha256=hashlib.sha256(data).hexdigest(), bytes=len(data))


manifest = DEST / 'sources.json'
prior = {}
if manifest.exists():
    previous = json.loads(manifest.read_text())
    if previous.get('commit') == COMMIT:
        prior = {row['file']: row for row in previous['files']}
with ThreadPoolExecutor(max_workers=6) as pool:
    files = list(pool.map(fetch, ((i, animated) for i in range(1, 152) for animated in (False, True))))
manifest.write_text(json.dumps(dict(repository='https://github.com/PokeAPI/sprites', commit=COMMIT, files=files), indent=2) + '\n')
print(f'Verified {len(files)} sprite files ({sum(f["bytes"] for f in files):,} bytes) from PokeAPI/sprites.')
