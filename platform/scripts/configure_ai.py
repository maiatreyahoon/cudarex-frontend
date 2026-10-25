#!/usr/bin/env python3
"""Interactive local setup. Credentials never pass through chat or command arguments."""
import getpass
import json
import os
from pathlib import Path
import urllib.request
import urllib.error

BASE='https://api.tokenfactory.nebius.com/v1'
ROOT=Path(__file__).resolve().parents[1]

def main():
    print('Optional NVIDIA model setup through Nebius Token Factory.\nKeep this window private. The key is hidden while you type.\nThis checks the model catalog but does not generate a paid model response.\n')
    key=getpass.getpass('Paste your Nebius API key, then press Return: ').strip()
    if not key or any(char in key for char in '\r\n'):
        raise ValueError('A nonempty single-line key is required.')
    request=urllib.request.Request(BASE+'/models',headers={'Authorization':'Bearer '+key})
    # Do not follow redirects with an Authorization header.
    class NoRedirect(urllib.request.HTTPRedirectHandler):
        def redirect_request(self,*args,**kwargs):
            return None
    opener=urllib.request.build_opener(NoRedirect)
    try:
        with opener.open(request,timeout=15) as response:
            result=json.load(response)
    except urllib.error.HTTPError as error:
        raise ValueError(f'Nebius catalog request failed with HTTP {error.code}. Check your account and key. No settings were saved.')
    models=sorted(item['id'] for item in result.get('data',[]) if isinstance(item,dict) and isinstance(item.get('id'),str) and item['id'].lower().startswith('nvidia/'))
    if not models:
        raise ValueError('The catalog returned no NVIDIA model IDs for this account. Check availability with Nebius. No settings were saved.')
    print('\nAvailable NVIDIA model IDs:')
    for index,model in enumerate(models,1):
        print(f'{index}. {model}')
    selected=input('\nChoose a number (check model pricing in your account first): ').strip()
    if not selected.isdigit() or not 1<=int(selected)<=len(models):
        raise ValueError('Invalid model number. Nothing saved.')
    model=models[int(selected)-1]
    target=ROOT/'backend'/'.env'
    if target.is_symlink():
        raise ValueError('backend/.env is a symbolic link. Use a normal local file before setup.')
    if target.exists() and input('Update the model settings in backend/.env? Type yes: ').strip().lower()!='yes':
        print('No settings changed.');return
    existing=target.read_text() if target.exists() else ''
    names={'NEBIUS_API_KEY','NEBIUS_MODEL','NEBIUS_BASE_URL'}
    kept=[line for line in existing.splitlines() if line.partition('=')[0].strip().removeprefix('export ').strip() not in names]
    text='\n'.join(kept)+('\n' if kept else '')
    text+='NEBIUS_API_KEY='+json.dumps(key)+'\nNEBIUS_MODEL='+json.dumps(model)+'\nNEBIUS_BASE_URL='+BASE+'\n'
    fd=os.open(str(target),os.O_WRONLY|os.O_CREAT|os.O_TRUNC,0o600)
    try:
        os.fchmod(fd,0o600)
        os.write(fd,text.encode())
    finally:
        os.close(fd)
    print('\nSaved private backend settings. Your key was not printed.\nRestart CUDAREX, then run python3 scripts/verify_ai.py for one real model test.\nThe first generation can consume your Nebius credits. No live generation has run yet.')

if __name__=='__main__':
    try:
        main()
    except (ValueError,urllib.error.URLError,OSError,json.JSONDecodeError) as error:
        print('Setup stopped: '+str(error))
        raise SystemExit(1)
    except (KeyboardInterrupt,EOFError):
        print('\nSetup cancelled.');raise SystemExit(1)
