/* 오프라인 저장 (서비스 워커)
 * 공연장 안은 인파가 몰리면 데이터가 잘 안 터진다. 앱 화면, 공연장 정보, 상가 목록, 3D 라이브러리, 글꼴을
 * 이 기기에 저장해 두고, 네트워크가 느리거나 끊기면 저장본으로 연다.
 * - 앱 파일(같은 주소): 네트워크 먼저, 3초 안에 응답이 없거나 실패하면 저장본
 * - three.js, 글꼴: 저장본 먼저 (버전이 고정된 파일)
 * - 네이버 지도, Tmap, ODsay 같은 외부 API는 건드리지 않는다 (지도 타일은 저장하지 않음, 오프라인이면 약도로 대체)
 * 앱 파일을 바꿨을 때 VERSION을 올리면 예전 저장본을 지운다 */
const VERSION = 'v6';
const CACHE = 'show-info-' + VERSION;
const SHELL = ['./', 'index.html', 'admin.html', 'config.js', 'store.js', 'data/shops.json'];
const LIBS = [
  'https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js',
  'https://fonts.googleapis.com/css2?family=Noto+Sans+KR:wght@400;500;700&display=swap'
];
const LIB_HOSTS = ['cdnjs.cloudflare.com', 'fonts.googleapis.com', 'fonts.gstatic.com'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(async c => {
    await c.addAll(SHELL);
    await Promise.all(LIBS.map(u => c.add(new Request(u, { mode: 'cors' })).catch(() => {})));
  }).then(() => self.skipWaiting()));
});

self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k.startsWith('show-info-') && k !== CACHE).map(k => caches.delete(k))))
    .then(() => self.clients.claim()));
});

function networkFirst(req) {
  /* ?v=숫자 같은 주소 뒤 값은 빼고 저장해, 같은 파일의 저장본이 하나만 남게 한다 */
  const u = new URL(req.url);
  const key = u.origin + u.pathname;
  return caches.open(CACHE).then(c => new Promise(resolve => {
    let done = false;
    const fallback = () => c.match(key).then(hit => hit || (req.mode === 'navigate' ? c.match('index.html') : null));
    const timer = setTimeout(() => fallback().then(hit => { if (hit && !done) { done = true; resolve(hit); } }), 3000);
    /* 브라우저 HTTP 캐시에 남은 예전 파일을 받지 않도록 매번 서버에 확인한다 (바뀐 게 없으면 304로 가볍게 끝남) */
    fetch(req.mode === 'navigate' ? new Request(req.url, { cache: 'no-cache', credentials: 'same-origin' }) : new Request(req, { cache: 'no-cache' })).then(res => {
      if (res.ok) c.put(key, res.clone());
      clearTimeout(timer);
      if (!done) { done = true; resolve(res); }
    }).catch(() => {
      clearTimeout(timer);
      fallback().then(hit => { if (!done) { done = true; resolve(hit || Response.error()); } });
    });
  }));
}

function cacheFirst(req) {
  return caches.open(CACHE).then(c => c.match(req).then(hit => hit || fetch(req).then(res => {
    if (res.ok || res.type === 'opaque') c.put(req, res.clone());
    return res;
  })));
}

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin === self.location.origin) { e.respondWith(networkFirst(req)); return; }
  if (LIB_HOSTS.includes(url.hostname)) e.respondWith(cacheFirst(req));
});
