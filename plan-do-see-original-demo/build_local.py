#!/usr/bin/env python3
"""Retrieve the user's original public Plan-Do-See UI files for offline/local use."""
from pathlib import Path
from urllib.request import urlopen, Request
from urllib.error import URLError
root='https://raw.githubusercontent.com/jennajiminkim/plandosee-web-diary/8dfa1b3865067666b276619077bc10e1b531afcf/'
folder=Path(__file__).resolve().parent
original=folder/'original-ui'
original.mkdir(exist_ok=True)
for name in ['index.html','style.css','app.js']:
    req=Request(root+name,headers={'User-Agent':'PlanDoSeePortfolioDemo/1.0'})
    try:
        with urlopen(req, timeout=20) as response: data=response.read()
    except URLError as error:
        raise SystemExit(f'{name} 원본 다운로드 실패: {error}')
    (original/name).write_bytes(data)
html=(original/'index.html').read_text(encoding='utf-8')
assert 'src="/app.js"' in html and 'href="/style.css"' in html, '원본 파일 구조가 바뀌었습니다.'
html=html.replace('href="/style.css"','href="./style.css"').replace('src="/app.js"','src="../demo-api.js"></script><script src="./app.js"')
html=html.replace('지금은 로그인이 없어 링크를 아는 사람은 누구나 볼 수 있습니다. 남이 봐도 괜찮은 내용만 넣으세요','포트폴리오 체험용 가상 데이터입니다. 실제 운영 DB와 연결되지 않습니다.')
(original/'index.html').write_text(html,encoding='utf-8')
print('원본 기반 로컬 데모 생성:', original/'index.html')
print('사용: 포트폴리오 루트에서 python3 -m http.server 8000 실행 후 /plan-do-see-original-demo/original-ui/ 열기')
