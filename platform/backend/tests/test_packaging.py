"""The judge's ZIP must work from a repository subfolder and omit runtime data."""
from pathlib import Path
import shutil
import subprocess
import sys
from zipfile import ZipFile


def test_release_archive_uses_stable_folder_and_excludes_private_runtime_files(tmp_path):
    source = Path(__file__).resolve().parents[2]
    checkout = tmp_path / 'platform'
    (checkout / 'scripts').mkdir(parents=True)
    shutil.copyfile(source / 'scripts/package.py', checkout / 'scripts/package.py')
    fixtures = {
        'LICENSE': 'MIT sample',
        'frontend/src/App.tsx': 'export default function App() { return null }',
        'frontend/src/data/reference.json': '{"safe":true}',
        'backend/.env.example': 'NEBIUS_API_KEY=\n',
        'backend/.env': 'private-key-sentinel',
        'frontend/.env.production': 'private-setting-sentinel',
        'backend/data/cudarex.sqlite3': 'private-memory-sentinel',
        'backend/.venv/installed': 'dependency',
        'frontend/node_modules/installed': 'dependency',
        'submission/.build/draft': 'internal-work',
    }
    for rel, content in fixtures.items():
        path = checkout / rel
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_text(content)
    (checkout / 'secret-link').symlink_to(checkout / 'backend/.env')
    result = subprocess.run([sys.executable, str(checkout / 'scripts/package.py')], capture_output=True, text=True)
    assert result.returncode == 0, result.stderr
    with ZipFile(tmp_path / 'cudarex-hackathon.zip') as archive:
        assert archive.testzip() is None
        names = set(archive.namelist())
        assert all(name.startswith('cudarex-hackathon/') for name in names)
        assert 'cudarex-hackathon/frontend/src/data/reference.json' in names
        assert 'cudarex-hackathon/backend/.env.example' in names
        assert not any('/.env' in name and not name.endswith('/.env.example') for name in names)
        assert not any(part in name for name in names for part in ['/node_modules/', '/.venv/', '/backend/data/', '/.build/', 'secret-link'])
        assert all(b'private-' not in archive.read(name) for name in names)
