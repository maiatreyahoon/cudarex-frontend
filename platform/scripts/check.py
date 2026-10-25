#!/usr/bin/env python3
"""Run the release checks using this project's installed environment."""
import os
from pathlib import Path
import shutil
import subprocess
import sys
ROOT=Path(__file__).resolve().parents[1]
py=ROOT/'backend'/'.venv'/('Scripts/python.exe' if os.name=='nt' else 'bin/python')
if not py.exists() or not shutil.which('npm'):
    raise SystemExit('Run python3 scripts/start.py once to install dependencies, then stop it and retry this check.')
env=os.environ.copy()
env['PYTHONPYCACHEPREFIX']=str(ROOT/'backend'/'.venv'/'pycache')
for args,folder in [([str(py),'-m','pytest','-q'],ROOT/'backend'),([shutil.which('npm'),'run','build'],ROOT/'frontend')]:
    result=subprocess.run(args,cwd=str(folder),env=env)
    if result.returncode:
        raise SystemExit(result.returncode)
print('Backend tests and frontend production build passed.')
