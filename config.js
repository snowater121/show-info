/* 네이버 지도 설정
 * NAVER_CLIENT_ID: 네이버 클라우드 콘솔 > Maps > Application의 Client ID (공개되어도 되는 값, 등록한 웹 서비스 URL에서만 동작)
 * NAVER_KEY_PARAM: 새 Maps 서비스는 'ncpKeyId', 예전 방식 앱이면 'ncpClientId'. 인증 실패 메시지가 뜨면 바꿔 보세요
 * Client Secret은 절대 이 파일이나 저장소에 넣지 마세요. 브라우저에 그대로 노출됩니다.
 *
 * 앱 안 경로 안내 (브라우저에서 바로 부르는 키라 공개됨)
 * TMAP_APP_KEY: TMAP API 보행자 경로. 주소 제한이 없으니 콘솔에서 사용량 한도를 걸어 둘 것
 * ODSAY_API_KEY: ODsay LAB 대중교통 길찾기. 등록한 URI(github.io, localhost:8000)에서만 동작
 */
window.APP_CONFIG = {
  NAVER_CLIENT_ID: 'gl61r2i8ba',
  NAVER_KEY_PARAM: 'ncpKeyId',
  TMAP_APP_KEY: 'IBgwbVdqxr6WVb0e6o4QUyGkgv7WwNb9kkmh8aF4',
  ODSAY_API_KEY: '3Hpf/DmkmiFTEVw4qYRVyw'
};
