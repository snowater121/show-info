"""주소를 좌표로 바꾸기 (네이버 Geocoding, 한 번만 실행)

브라우저에서 매번 Geocoding을 부르지 않고, 확인한 좌표를 index.html의 PLACES에 적어 둔다.
Client Secret은 저장소에 절대 넣지 않는다. .env(.gitignore에 포함)에서만 읽는다.

.env 예시 (저장소 루트, 커밋 금지)
  NAVER_GEOCODE_ID=Client ID
  NAVER_GEOCODE_SECRET=Client Secret

사용법
  python3 tools/geocode_places.py
"""
import json, os, sys, urllib.parse, urllib.request, urllib.error

ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..')

# index.html PLACES 중 좌표가 없고 주소만 있는 곳. 주소를 확인한 곳만 넣는다
ADDRS = {
    'bus1': '서울특별시 구로구 경인로 445',   # 동양미래대학 정류장 (정류장 좌표가 아니라 근처 건물 주소)
    'bus2': '서울특별시 구로구 경인로 427',   # 구로성심병원 정류장 (근처 건물 주소)
    'lot3': '서울특별시 구로구 경인로 445',   # 동양미래대학교 주차장
}
HOSTS = ['maps.apigw.ntruss.com', 'naveropenapi.apigw.ntruss.com']


def read_env():
    env = {}
    path = os.path.join(ROOT, '.env')
    if not os.path.exists(path):
        sys.exit('.env 파일이 없어요. 저장소 루트에 NAVER_GEOCODE_ID, NAVER_GEOCODE_SECRET을 적어 주세요')
    for line in open(path, encoding='utf-8'):
        line = line.strip()
        if line and not line.startswith('#') and '=' in line:
            k, v = line.split('=', 1)
            env[k.strip()] = v.strip().strip('"').strip("'")
    if not env.get('NAVER_GEOCODE_ID') or not env.get('NAVER_GEOCODE_SECRET'):
        sys.exit('.env에 NAVER_GEOCODE_ID, NAVER_GEOCODE_SECRET이 필요해요')
    return env['NAVER_GEOCODE_ID'], env['NAVER_GEOCODE_SECRET']


def geocode(host, kid, key, q):
    url = f'https://{host}/map-geocode/v2/geocode?query={urllib.parse.quote(q)}'
    req = urllib.request.Request(url, headers={'x-ncp-apigw-api-key-id': kid, 'x-ncp-apigw-api-key': key, 'Accept': 'application/json'})
    with urllib.request.urlopen(req, timeout=15) as r:
        return json.load(r)


def main():
    kid, key = read_env()
    host = None
    for h in HOSTS:
        try:
            geocode(h, kid, key, ADDRS['bus2'])
            host = h
            break
        except urllib.error.HTTPError as e:
            print(f'{h}: HTTP {e.code} {e.read().decode("utf-8", "replace")[:200]}')
    if not host:
        sys.exit('인증 실패: Client ID/Secret, 콘솔에서 Geocoding 사용 여부를 확인해 주세요')
    out = {}
    for pid, addr in ADDRS.items():
        res = geocode(host, kid, key, addr)
        a = (res.get('addresses') or [None])[0]
        if not a:
            print(f'{pid}: 결과 없음 ({addr})')
            continue
        out[pid] = {'lat': round(float(a['y']), 6), 'lng': round(float(a['x']), 6), 'road': a.get('roadAddress', '')}
        print(f'{pid}: {out[pid]}')
    print(json.dumps(out, ensure_ascii=False))


if __name__ == '__main__':
    main()
