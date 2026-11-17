/* 앱(index.html)과 운영자 화면(admin.html)이 같이 쓰는 저장소
 * - 같은 브라우저의 localStorage 키 'gocheok-db-v1' 하나에 모든 신청, 글, 신고, 운영자 입력을 둔다
 * - 한쪽 탭에서 바꾸면 storage 이벤트로 다른 탭이 바로 다시 그린다 (앱 탭과 운영자 탭을 나란히 열어 테스트)
 * - 실제 서비스에서는 이 자리가 서버 DB가 된다. 지금은 데모라 다른 사람, 다른 기기와 공유되지 않음
 * 공연 목록(SHOWS)과 주변 주차장(LOTS)의 기본값도 여기 둔다. 운영자가 고친 값은 DB에 따로 저장해 덮어쓴다 */
(function () {
  const BASE = {
    /* ymd: 날짜 비교용. start, open, end가 null이면 공지 확인 전이라 "확인 필요"로 보여 준다
       KGMA 7일 시간, MMA 입장, 종료 시각은 공식 공지를 찾지 못해 비워 둠 (2026-11-14 확인) */
    SHOWS: [
      { id: 'K1', name: '2026 KOREA GRAND MUSIC AWARD (1일차)', ymd: '2026-11-07', date: '11/7', dow: '토', start: null, open: null, end: null, seller: 'NOL 티켓', done: true, real: true, src: 'KGMA 공식 발표 보도' },
      { id: 'K', name: '2026 KOREA GRAND MUSIC AWARD', ymd: '2026-11-08', date: '11/8', dow: '일', start: '17:00', open: '16:00', end: '21:30', seller: 'NOL 티켓', done: true, real: true },
      { id: 'M1', name: 'MMA2026 멜론뮤직어워드 (1일차)', ymd: '2026-11-14', date: '11/14', dow: '토', start: '18:00', open: null, end: null, seller: '멜론티켓', real: true, src: '멜론 공식 안내 보도 (레드카펫 17:00)' },
      { id: 'M2', name: 'MMA2026 멜론뮤직어워드 (2일차)', ymd: '2026-11-15', date: '11/15', dow: '일', start: '18:00', open: null, end: null, seller: '멜론티켓', real: true, src: '멜론 공식 안내 보도 (레드카펫 17:00)' },
      { id: 'A', name: '[공연명 A]', ymd: '2026-11-22', date: '11/22', dow: '토', start: '18:00', open: '16:30', end: '21:20', seller: 'NOL 티켓' },
      { id: 'B', name: '[공연명 B]', ymd: '2026-11-29', date: '11/29', dow: '토', start: '17:00', open: '15:30', end: '20:10', seller: '티켓링크' }
    ],
    /* 출처: 서울시설공단 고척스카이돔 주차 안내 */
    LOTS: [
      { n: '고척산업용품종합상가', d: '약 1,000면', f: '30분 1,000원' },
      { n: '중앙유통단지', d: '약 4,000면, 현금만', f: '30분 1,000원' },
      { n: '구로기계공구상가', d: '약 4,000면', f: '30분 1,000원' },
      { n: '동양미래대학교', d: '약 320면, 휴일 08:00~23:00만', f: '30분 2,000원' },
      { n: '생각공장 구로', d: '약 950면', f: '30분 3,000원' }
    ],
    TEMPLATES: ['엔드 스테이지 A', '돌출 무대 B', '센터 스테이지 C'],
    GATES: ['A, B (홈)', 'D, E (3루 쪽)', 'F, G (외야)'],
    /* 입장 시각 공지가 없을 때 쓰는 기본 규칙 */
    OPEN_BEFORE: 90
  };

  const KEY = 'gocheok-db-v1';
  const VER = 2; /* 예시 데이터 구조를 바꾸면 올림. 올리면 이 브라우저의 공유 저장소가 새 예시로 바뀜 */
  const now = () => Date.now();
  const H = 3600e3;

  /* 처음 열었을 때 운영자 화면 대기열이 비어 있지 않도록 넣는 예시 데이터. 모두 [닉네임] 같은 가짜 값 */
  function seed() {
    const t = now();
    return {
      v: VER,
      shows: {}, /* id: {open, gate, template, note, src, at} 운영자 입력 */
      lots: {},  /* 번호: {d, f, note, at} */
      verifs: [
        { id: 'v1', uid: 'u-ex1', nick: '[닉네임1]', show: 'A', seat: '3층 312구역 F열 14번', phone: '010-****-1234', phoneMatch: true, img: null, at: t - 5 * H, status: '대기' },
        { id: 'v2', uid: 'u-ex2', nick: '[닉네임2]', show: 'A', seat: '플로어 B구역 3열 7번', phone: '010-****-5678', phoneMatch: false, img: null, at: t - 3 * H, status: '대기' },
        { id: 'v3', uid: 'u-ex3', nick: '[닉네임3]', show: 'B', seat: '2층 205구역 C열 2번', phone: null, phoneMatch: true, img: null, at: t - 30 * H, status: '승인', doneAt: t - 28 * H }
      ],
      sights: [
        { id: 's1', uid: 'u-ex1', nick: '[닉네임1]', venue: 'gocheok', sec: '312', seat: '3층 312구역 F열', show: 'K', t: '돌출 무대까지 잘 보여요', tags: ['무대 정면'], img: null, rating: 4, at: t - 26 * H, status: '공개', ai: { pass: true, flags: [] } },
        { id: 's2', uid: 'u-ex4', nick: '[닉네임4]', venue: 'gocheok', sec: '214', seat: '2층 214구역 A열', show: 'K', t: '사진 뒤쪽에 사람 얼굴이 나와요', tags: ['측면'], img: null, rating: 3, at: t - 2 * H, status: 'AI 보류', ai: { pass: false, flags: ['사람 얼굴이 보일 수 있음'] } }
      ],
      /* 커뮤니티 글. board: '동행' | '공연 정보', vis: '전체' | '인증 회원'. 동행은 인증 회원만 씀 */
      posts: [
        { id: 'c1', uid: 'u-ex1', nick: '[닉네임1]', member: true, board: '동행', title: '공연 끝나고 구로역까지 같이 걸어가실 분', body: '정문 앞에서 만나 같이 걸어가요. 앱 메시지로 연락 주세요', show: 'A', vis: '인증 회원', at: t - 30 * H, status: '공개' },
        { id: 'c2', uid: 'u-ex3', nick: '[닉네임3]', member: true, board: '동행', title: '입장 전 MD 줄 같이 서실 분', body: '오후 2시쯤 도착 예정이에요. 한 명씩 번갈아 자리 맡아요', show: 'A', vis: '전체', at: t - 50 * H, status: '공개' },
        { id: 'c3', uid: 'u-ex2', nick: '[닉네임2]', member: false, board: '공연 정보', title: '3층 매점 줄이 짧았어요', body: '2층보다 덜 붐벼요. 입장 직후가 가장 한산했어요', show: 'K', vis: '전체', at: t - 26 * H, status: '공개' },
        { id: 'c4', uid: 'u-ex1', nick: '[닉네임1]', member: true, board: '공연 정보', title: '퇴장 때 구일역 2번 출구 통제해요', body: '지난 공연 때 20분 정도 줄 섰어요. 개봉역 쪽이 빨랐어요', show: 'K', vis: '인증 회원', at: t - 24 * H, status: '공개' },
        { id: 'c5', uid: 'u-ex5', nick: '[닉네임5]', member: false, board: '공연 정보', title: '플로어 2연석 양도해요', body: '연락은 [연락처 가림] 로 주세요', show: 'A', vis: '전체', at: t - 1 * H, status: '검토 중', flags: ['금칙어: 양도', '연락처'] }
      ],
      reports: [
        { id: 'r1', type: 'post', tid: 'c5', reason: '금칙어: 양도, 연락처', by: 'AI 자동', at: t - 1 * H, status: '접수' },
        { id: 'r2', type: 'post', tid: 'c3', reason: '사실과 다른 정보', by: '[닉네임6]', at: t - 3 * H, status: '접수' }
      ],
      infos: [
        { id: 'i1', kind: '주차', target: '중앙유통단지', text: '공연일에는 18시 이후 만차라 들어갈 수 없어요', by: '[닉네임2]', at: t - 6 * H, status: '대기' }
      ],
      zoneCands: [
        { id: 'z1', zone: 'M', label: '플로어 M구역', count: 3, at: t - 10 * H, status: '대기' }
      ],
      bookmarks: {}, /* uid: [post id] */
      words: ['양도', '팝니다', '삽니다', '구매합니다', '계좌', '입금', '선입금'],
      notices: [
        { id: 'n1', title: '공연 당일 고척돔 주차장은 일반 주차가 안 돼요', at: t - 48 * H, on: true }
      ],
      settings: { sightManual: false },
      logs: [
        { at: t - 28 * H, what: '회원 인증 승인: [닉네임3], [공연명 B]' }
      ]
    };
  }

  let D;
  function load() {
    try { const raw = localStorage.getItem(KEY); D = raw ? JSON.parse(raw) : null; } catch (e) { D = null; }
    if (!D || D.v !== VER) { D = seed(); write(); }
    return D;
  }
  function write() {
    try { localStorage.setItem(KEY, JSON.stringify(D)); return true; }
    catch (e) {
      /* 저장 공간이 모자라면 오래된 사진부터 지운다 */
      const all = [...D.sights, ...D.verifs].filter(x => x.img).sort((a, b) => a.at - b.at);
      for (const x of all) { x.img = null; try { localStorage.setItem(KEY, JSON.stringify(D)); return true; } catch (e2) {} }
      return false;
    }
  }
  const subs = [];
  window.addEventListener('storage', e => { if (e.key === KEY || e.key === null) { load(); subs.forEach(f => f(D)); } });

  const id = p => p + now().toString(36) + Math.random().toString(36).slice(2, 5);
  const DB = {
    BASE,
    get: () => D,
    /* 바꾸고 저장. fn 안에서 d를 직접 고친다 */
    set(fn) { load(); fn(D); write(); subs.forEach(f => f(D)); return D; },
    on(f) { subs.push(f); },
    id,
    log(what) { D.logs.unshift({ at: now(), what }); D.logs = D.logs.slice(0, 100); },
    reset() { D = seed(); write(); subs.forEach(f => f(D)); },
    show(sid) { const b = BASE.SHOWS.find(s => s.id === sid); return b ? Object.assign({}, b, D.shows[sid] || {}) : null; },
    /* 입장 시각: 운영자 입력 > 공지값 > 시작 1시간 30분 전(예정) */
    openInfo(sid) {
      const s = DB.show(sid); if (!s) return { text: '확인 필요', est: true };
      const o = D.shows[sid] || {};
      if (o.open) return { text: o.open, est: false, src: o.src || '운영자 입력' };
      if (s.open) return { text: s.open, est: false, src: '공식 공지' };
      if (s.start) { const [h, m] = s.start.split(':').map(Number); const x = h * 60 + m - BASE.OPEN_BEFORE; return { text: `${String(Math.floor(x / 60)).padStart(2, '0')}:${String(x % 60).padStart(2, '0')}`, est: true, src: '공연 시작 1시간 30분 전 (예정)' }; }
      return { text: '확인 필요', est: true };
    },
    lot(i) { return Object.assign({}, BASE.LOTS[i], D.lots[i] || {}); },
    /* 금칙어, 전화번호, 계좌 같은 숫자열 확인. 전화번호는 가려서 돌려준다 */
    check(text) {
      const flags = []; let clean = String(text || '');
      const hit = D.words.filter(w => w && clean.includes(w));
      if (hit.length) flags.push('금칙어: ' + hit.join(', '));
      const phone = /01[016789][\s.-]?\d{3,4}[\s.-]?\d{4}/g;
      if (phone.test(clean)) { flags.push('연락처'); clean = clean.replace(phone, '[연락처 가림]'); }
      if (/\d{2,6}-\d{2,6}-\d{2,8}/.test(clean)) flags.push('계좌번호로 보이는 숫자');
      return { flags, clean, blocked: hit.length > 0 };
    },
    memberOf(uid) { const v = D.verifs.filter(x => x.uid === uid); return { approved: v.filter(x => x.status === '승인'), pending: v.find(x => x.status === '대기'), last: v.sort((a, b) => b.at - a.at)[0] || null }; },
    ago(t) { const m = Math.round((now() - t) / 60000); if (m < 1) return '방금'; if (m < 60) return m + '분 전'; const h = Math.round(m / 60); if (h < 24) return h + '시간 전'; return Math.round(h / 24) + '일 전'; }
  };
  load();
  window.DB = DB;
})();
