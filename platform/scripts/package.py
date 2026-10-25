#!/usr/bin/env python3
"""Build a source-only release ZIP with no secrets, dependencies or user database."""
from pathlib import Path
from zipfile import ZipFile,ZIP_DEFLATED
ROOT=Path(__file__).resolve().parents[1]
OUTPUT=ROOT.parent/'cudarex-hackathon.zip'
ARCHIVE_ROOT='cudarex-hackathon'
EXCLUDED={'node_modules','dist','.venv','__pycache__','.pytest_cache','.git','.build'}

# Environment example files are documentation and contain no credentials.
with ZipFile(OUTPUT,'w',ZIP_DEFLATED) as archive:
    for path in sorted(ROOT.rglob('*')):
        rel=path.relative_to(ROOT)
        if not path.is_file() or path.is_symlink(): continue
        if any(part in EXCLUDED for part in rel.parts) or rel.parts[:2]==('backend','data'): continue
        if path.name.startswith('.env') and path.name!='.env.example': continue
        if path.name=='.DS_Store' or path.suffix in {'.pyc','.tsbuildinfo','.sqlite3','.log'}: continue
        archive.write(path,Path(ARCHIVE_ROOT)/rel)
with ZipFile(OUTPUT) as archive:
    if archive.testzip(): raise SystemExit('ZIP integrity failure')
    names=archive.namelist()
    assert str(Path(ARCHIVE_ROOT)/'frontend/src/App.tsx') in names
    assert str(Path(ARCHIVE_ROOT)/'LICENSE') in names
    assert not any('/node_modules/' in n or n.endswith('/.env') or '.sqlite3' in n for n in names)
    print(f'{OUTPUT}: {len(names)} files, {OUTPUT.stat().st_size:,} bytes. Integrity and exclusions passed.')
