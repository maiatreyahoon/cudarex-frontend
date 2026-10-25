#!/usr/bin/env python3
"""Verify a real generation via the running local app, without handling credentials."""
import json
import urllib.request
import urllib.error

BASE='http://127.0.0.1:8000/api'

def request(path,payload=None):
    body=None if payload is None else json.dumps(payload).encode()
    headers={'Content-Type':'application/json','X-Cudarex-Client':'local-ui'}
    with urllib.request.urlopen(urllib.request.Request(BASE+path,data=body,headers=headers),timeout=45) as response:
        return json.load(response)

def main():
    state=request('/model/status')
    if not state['configured']:
        print('No model configured. Run python3 scripts/configure_ai.py locally, restart CUDAREX, then try again.')
        return 1
    print('This sends one harmless study explanation request to the configured model through your running CUDAREX backend. It may consume Nebius credits. No external tools run.')
    if input('Run one real generation now? Type yes: ').strip().lower()!='yes':
        print('No generation requested.');return 0
    before=(state.get('evidence') or {}).get('verified_at')
    answer=request('/chat',{'message':'Ask AI: Explain Newton’s second law using one simple everyday example in at most three sentences.'})
    print('\n'+answer['response'])
    current=request('/model/status')
    evidence=current.get('evidence')
    if current['status']!='nebius-verified' or not evidence or evidence.get('verified_at') == before or not answer['response'].startswith('Nebius model'):
        print('\nLive model verification did not succeed. Check your key, credits, and model ID. Do not label the no-key fallback as a live NVIDIA demo.')
        return 1
    print('\nRuntime evidence from local server:')
    for name in ['requested_model','returned_model','base_url','verified_at','latency_ms','input_tokens','output_tokens']:
        print(name+': '+str(evidence.get(name)))
    print('NVIDIA ID prefix: '+str(current['nvidia_model_requested']))
    print('Confirm that the returned model belongs to NVIDIA in your provider account. This runtime record is technical evidence, not an eligibility decision by the organizer.')
    return 0

if __name__=='__main__':
    try:
        raise SystemExit(main())
    except (urllib.error.URLError,OSError,ValueError,KeyError) as error:
        print('Could not verify. Start CUDAREX and check backend settings. '+str(error));raise SystemExit(1)
    except (KeyboardInterrupt,EOFError):
        print('\nCancelled.');raise SystemExit(1)
