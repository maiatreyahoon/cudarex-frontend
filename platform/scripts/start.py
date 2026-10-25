#!/usr/bin/env python3
"""Start both local services, with first-run setup and reliable child cleanup."""
import argparse
import hashlib
import os
from pathlib import Path
import shutil
import signal
import socket
import subprocess
import sys
import time
import urllib.request
import venv

ROOT = Path(__file__).resolve().parents[1]

def require_port(port):
    with socket.socket() as sock:
        # Match server restart semantics instead of treating TIME_WAIT as a live service.
        sock.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)
        try:
            sock.bind(('127.0.0.1', port))
        except OSError:
            raise RuntimeError(f'Port {port} is busy. Stop your previous CUDAREX window with Control+C, then run this again. No other process was stopped.')

def run(args, folder):
    subprocess.run([str(a) for a in args], cwd=str(folder), check=True)

def wait_for(url, process, timeout=25):
    deadline=time.monotonic()+timeout
    while time.monotonic()<deadline:
        if process.poll() is not None:
            raise RuntimeError('A service stopped. Read its error above.')
        try:
            with urllib.request.urlopen(url,timeout=1) as response:
                if response.status==200:
                    return
        except Exception:
            time.sleep(0.3)
    raise RuntimeError('Service did not become ready. Read its error above.')

def main():
    parser=argparse.ArgumentParser(description='Start CUDAREX locally. First use needs internet for packages.')
    parser.add_argument('--skip-install',action='store_true',help='Use already installed dependencies')
    parser.add_argument('--check',action='store_true',help='Check Python, Node, folder paths and ports without installing or starting')
    args=parser.parse_args()
    if sys.version_info<(3,9):
        raise RuntimeError('Install Python 3.9 or later from python.org, then reopen Terminal.')
    npm=shutil.which('npm'); node=shutil.which('node')
    if not npm or not node:
        raise RuntimeError('Node and npm were not found. Open Terminal and check node -v and npm -v.')
    version=subprocess.check_output([node,'-v'],text=True).strip()
    if int(version.lstrip('v').split('.')[0])<18:
        raise RuntimeError('Node 18 or later is needed. Your Node v24 installation is suitable.')
    require_port(8000); require_port(5173)
    if args.check:
        print(f'Checks passed. Python {sys.version.split()[0]}, Node {version}. Both local ports are free.')
        return
    backend=ROOT/'backend'; frontend=ROOT/'frontend'
    environment=backend/'.venv'
    py=environment/('Scripts/python.exe' if os.name=='nt' else 'bin/python')
    if not args.skip_install:
        if not py.exists():
            print('Creating the project Python environment…',flush=True)
            venv.create(str(environment),with_pip=True)
        digest=hashlib.sha256((backend/'requirements.txt').read_bytes()).hexdigest()
        marker=environment/'.cudarex-requirements'
        if not marker.exists() or marker.read_text()!=digest:
            print('Installing backend packages. First use needs an internet connection…',flush=True)
            run([py,'-m','pip','install','--disable-pip-version-check','-r','requirements.txt'],backend)
            marker.write_text(digest)
        if not (frontend/'node_modules').exists():
            print('Installing frontend packages…',flush=True)
            run([npm,'ci'],frontend)
    if not py.exists() or not (frontend/'node_modules').exists():
        raise RuntimeError('Dependencies are missing. Run this command again without --skip-install.')
    processes=[]
    try:
        child_env=os.environ.copy()
        child_env['PYTHONPYCACHEPREFIX']=str(environment/'pycache')
        print('Starting the local backend…',flush=True)
        processes.append(subprocess.Popen([str(py),'-m','uvicorn','app.main:app','--host','127.0.0.1','--port','8000'],cwd=str(backend),env=child_env,start_new_session=(os.name != 'nt')))
        wait_for('http://127.0.0.1:8000/api/health',processes[-1])
        processes.append(subprocess.Popen([npm,'run','dev'],cwd=str(frontend),start_new_session=(os.name != 'nt')))
        wait_for('http://127.0.0.1:5173',processes[-1])
        print('\nCUDAREX is ready: http://127.0.0.1:5173\nAPI health: http://127.0.0.1:8000/api/health\nLeave this window open. Press Control+C to stop both services.\nAll app integrations are mocks. No key is needed for local practice.\n',flush=True)
        while all(p.poll() is None for p in processes):
            time.sleep(0.5)
        raise RuntimeError('A service stopped. Read the message above, then start again.')
    except KeyboardInterrupt:
        print('\nStopping CUDAREX. Your saved data stays in backend/data/.',flush=True)
    finally:
        for process in processes:
            if process.poll() is None:
                if os.name != 'nt':
                    try: os.killpg(process.pid,signal.SIGTERM)
                    except ProcessLookupError: pass
                else:
                    process.terminate()
        for process in processes:
            try:
                process.wait(timeout=5)
            except subprocess.TimeoutExpired:
                process.kill(); process.wait()

if __name__=='__main__':
    try:
        main()
    except (RuntimeError,subprocess.CalledProcessError,OSError) as error:
        print('\nCould not start: '+str(error),file=sys.stderr)
        print('Use MAC-START-HERE.md for the two-terminal fallback.',file=sys.stderr)
        sys.exit(1)
