"""공연장 주변 상가 목록 만들기

출처: 공공데이터포털 「소상공인시장진흥공단_상가(상권)정보」 파일데이터 (분기 갱신)
      https://www.data.go.kr/data/15083033/fileData.do

원본 CSV(시도별, 수백 MB)는 저장소에 올리지 않는다. 받은 CSV에서 공연장 반경 안의
편의점, 식당, 카페, 약국만 골라 data/shops.json으로 저장한다.

사용법 (수도권: 서울, 인천, 경기 파일을 함께 넘김)
  python3 tools/build_shops.py --base 2026-09-30 \
    ~/Downloads/소상공인시장진흥공단_상가\(상권\)정보_20260930/*_{서울,인천,경기}_202609.csv

공연장을 늘릴 때는 VENUES에 좌표를 추가한다. 좌표는 출처를 확인한 값만 넣는다.
"""
import argparse, csv, json, math, os, sys

# 좌표를 확인한 공연장만. 확인 안 된 공연장은 넣지 않는다 (CLAUDE.md 6. 데이터 원칙)
VENUES = {
    'gocheok': {'name': '고척스카이돔', 'lat': 37.498222, 'lng': 126.867250, 'src': '위키백과 좌표'},
    # 'rolling': {...},  # 홍대 롤링홀: 좌표 확인 필요
    # 'olympic': {...},  # 올림픽홀: 좌표 확인 필요
    # 'yes24':   {...},  # YES24 라이브홀: 좌표 확인 필요
}
RADIUS_M = 500

# 앱의 분류: 상권업종 대분류/소분류로 나눈다
CAFE_SUB = {'카페', '빵/도넛', '아이스크림/빙수', '떡/한과'}
FOOD_EXCLUDE_MID = {'주점', '구내식당·뷔페'}


def category(row):
    big, mid, sub = row['상권업종대분류명'], row['상권업종중분류명'].strip(), row['상권업종소분류명']
    if sub == '편의점':
        return '편의점'
    if sub == '약국':
        return '약국'
    if big == '음식' and sub in CAFE_SUB:
        return '카페'
    if big == '음식' and mid not in FOOD_EXCLUDE_MID:
        return '식당'
    return None


def dist_m(lat1, lng1, lat2, lng2):
    r = math.radians
    h = math.sin(r(lat2 - lat1) / 2) ** 2 + math.cos(r(lat1)) * math.cos(r(lat2)) * math.sin(r(lng2 - lng1) / 2) ** 2
    return 2 * 6371000 * math.asin(math.sqrt(h))


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('csv', nargs='+', help='상가(상권)정보 시도별 CSV (UTF-8)')
    ap.add_argument('--base', required=True, help='자료 기준일, 예: 2026-09-30')
    ap.add_argument('--out', default=os.path.join(os.path.dirname(__file__), '..', 'data', 'shops.json'))
    ap.add_argument('--radius', type=int, default=RADIUS_M)
    a = ap.parse_args()

    out = {v: [] for v in VENUES}
    rows = 0
    for path in a.csv:
        with open(path, encoding='utf-8', newline='') as fh:
            for row in csv.DictReader(fh):
                rows += 1
                cat = category(row)
                if not cat:
                    continue
                try:
                    lat, lng = float(row['위도']), float(row['경도'])
                except ValueError:
                    continue
                for key, v in VENUES.items():
                    d = dist_m(v['lat'], v['lng'], lat, lng)
                    if d > a.radius:
                        continue
                    name = row['상호명'].strip() + (' ' + row['지점명'].strip() if row['지점명'].strip() else '')
                    out[key].append({
                        'id': row['상가업소번호'],
                        'n': name,
                        'c': cat,
                        'sub': row['상권업종소분류명'],
                        'addr': row['도로명주소'] or row['지번주소'],
                        'fl': row['층정보'] or '',
                        'lat': round(lat, 6),
                        'lng': round(lng, 6),
                        'd': round(d),
                    })
    for key in out:
        out[key].sort(key=lambda s: s['d'])

    doc = {
        'source': '소상공인시장진흥공단 상가(상권)정보 (공공데이터포털)',
        'url': 'https://www.data.go.kr/data/15083033/fileData.do',
        'base': a.base,
        'radius': a.radius,
        'note': '영업시간은 원자료에 없음. 폐업 반영은 분기 단위',
        'venues': out,
    }
    os.makedirs(os.path.dirname(os.path.abspath(a.out)), exist_ok=True)
    with open(a.out, 'w', encoding='utf-8') as fh:
        json.dump(doc, fh, ensure_ascii=False, separators=(',', ':'))
    print(f'읽은 행 {rows:,}개')
    for key, lst in out.items():
        cnt = {}
        for s in lst:
            cnt[s['c']] = cnt.get(s['c'], 0) + 1
        print(f'{VENUES[key]["name"]} 반경 {a.radius}m: {len(lst)}곳 {cnt}')
    print('저장:', os.path.abspath(a.out))


if __name__ == '__main__':
    sys.exit(main())
