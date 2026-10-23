# 스펙 작성 기준 — 정적 웹 앱

브라우저로 바로 여는 작은 웹 앱을 만들 때 쓰는 기준이다. 서버와 빌드 도구 없이 돈다.

## 검증 수단
V1  단위 테스트는 npm test 로 실행한다. 도구는 Node.js 내장 테스트 러너(node --test)다.
V2  e2e 테스트는 npm run e2e 로 실행한다. 도구는 Playwright 이고, 브라우저는 프로젝트 안에 받는다(PLAYWRIGHT_BROWSERS_PATH=0).
V3  성공 기준마다 단위 테스트나 e2e 테스트가 하나 이상 있다.
V4  앱의 규칙과 계산(상태 변화, 계산, 변환)은 화면과 분리된 모듈에 두고 단위 테스트로 확인한다.

## 행동 정책
B1  항상: 작업을 끝내기 전에 npm test 를 돌린다.
B2  먼저 질문: @playwright/test 밖의 의존성 추가.
B3  절대 금지: 실패하는 테스트 삭제, 테스트 건너뛰기(.skip, .only), 외부 CDN 의존.

## 작업 환경
E1  HTML, CSS, JavaScript. Node.js LTS. 프레임워크와 번들러를 쓰지 않는다.
E2  index.html 하나를 브라우저로 바로 연다(file://). 그래서 ES 모듈(type="module")을 쓰지 않고 일반 <script> 로 읽는다.
E3  앱 규칙은 src/ 의 파일에 두고, 파일 끝에서 테스트용으로 내보낸다: if (typeof module !== 'undefined') module.exports = { ... }
E4  단위 테스트는 tests/ 에서 require 로 규칙 파일을 읽는다. e2e 테스트는 e2e/ 에 두고 index.html 을 file URL 로 연다.
E5  package.json 의 scripts: "test": "node --test", "e2e": "playwright test". 단위 테스트 파일 이름은 *.test.js, e2e 테스트 파일 이름은 *.spec.js 로 한다.
E6  데이터는 브라우저의 localStorage 에 저장한다. 서버는 없다.
