"""Import only Kanto data from a user-provided PokeAPI source ZIP.

Usage: python3 scripts/import-pokeapi.py /path/to/pokeapi-master.zip
No archive code is executed, and no archive paths are extracted.
"""
import csv
import io
import json
from pathlib import Path
import sys
from zipfile import ZipFile

ROOT = Path(__file__).resolve().parent.parent

with ZipFile(sys.argv[1]) as archive:
    prefix = next(n[:-len('data/v2/csv/pokemon.csv')] for n in archive.namelist()
                  if n.endswith('/data/v2/csv/pokemon.csv'))

    def rows(name):
        return list(csv.DictReader(io.StringIO(archive.read(prefix + 'data/v2/csv/' + name + '.csv').decode('utf-8-sig'))))

    names = {int(r['pokemon_species_id']): r for r in rows('pokemon_species_names') if r['local_language_id'] == '3'}
    type_names = {int(r['type_id']): r['name'] for r in rows('type_names') if r['local_language_id'] == '3'}
    species = {int(r['id']): r for r in rows('pokemon_species')}
    types = {}
    for r in rows('pokemon_types'):
        types.setdefault(int(r['pokemon_id']), []).append((int(r['slot']), type_names[int(r['type_id'])]))
    stats = {}
    stat_names = {1: 'hp', 2: 'attack', 3: 'defense', 4: 'specialAttack', 5: 'specialDefense', 6: 'speed'}
    for r in rows('pokemon_stats'):
        stats.setdefault(int(r['pokemon_id']), {})[stat_names[int(r['stat_id'])]] = int(r['base_stat'])
    result = []
    for r in rows('pokemon'):
        dex = int(r['species_id'])
        if not 1 <= dex <= 151 or r['is_default'] != '1':
            continue
        pid = int(r['id'])
        result.append(dict(id=dex, name=names[dex]['name'], genus=names[dex]['genus'],
                           types=[name for _, name in sorted(types[pid])],
                           height=int(r['height']) / 10, weight=int(r['weight']) / 10,
                           baseStats=stats[pid], legendary=species[dex]['is_legendary'] == '1',
                           mythical=species[dex]['is_mythical'] == '1'))
    result.sort(key=lambda p: p['id'])
    assert [p['id'] for p in result] == list(range(1, 152)), 'Kanto data must contain all 151 species'
    destination = ROOT / 'src/generated/kanto.json'
    destination.parent.mkdir(parents=True, exist_ok=True)
    destination.write_text(json.dumps(result, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
    license_file = ROOT / 'public/POKEAPI-LICENSE.txt'
    license_file.write_bytes(archive.read(prefix + 'LICENSE.md'))
    print(f'Imported {len(result)} Kanto species; retained PokeAPI license.')
