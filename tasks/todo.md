# 작업 목록: 미니 스프레드시트

읽은 문서: `SPEC.md`, `tasks/plan.md`(승인됨, mvp-builder 가 설계 승인 뒤에 이 노드를 불렀다).

공통 규칙:

- 빌드 단계는 없다(SPEC 검증 수단: "빌드는 없다"). 카드의 "빌드" 칸은 `index.html` 을 브라우저로 열어 콘솔 오류가 없는지 보는 것으로 대신한다.
- `index.html` 의 `<script src>` 는 그 작업에서 생긴 파일만 SPEC 의 고정 순서(address → value → functions → formula → sheet → selection → history → clipboard → storage → csv → app) 안 제자리에 더한다. 없는 파일을 미리 적지 않는다.
- e2e 작업에서 Playwright 브라우저가 아직 없으면 e2e 테스트를 쓰는 데까지만 하고, 설치와 실행은 mvp-builder 가 검사에서 한다(SPEC 절대 금지: 브라우저 설치 명령을 직접 부르지 않는다).
- 모든 작업은 끝내기 전에 `npm test` 가 통과해야 한다(SPEC 행동 정책 "항상").

## T1: 테스트 도구와 칸 주소 해석
- 설명: `package.json`(scripts 는 SPEC 그대로, devDependency 는 `@playwright/test` 하나)과 `playwright.config.js`(맨 위 `process.env.PLAYWRIGHT_BROWSERS_PATH = '0'`, `testDir: 'e2e'`, Chromium 하나, 웹 서버 없음, D12)를 만들고 `npm install` 로 `package-lock.json` 을 고정한다. 그 위에 C1 Address 를 만든다: `A1` ↔ `{col,row}`, 대소문자 무시, `$` 절대 표시, 표 밖 판정(`valid`), 범위 정규화(`B5:A1` → `A1:B5`), 범위 안 주소 나열.
- 수용 기준:
  - [ ] `npm test` 가 `tests/address.test.js` 를 찾아 돌고 통과한다.
  - [ ] `parseRef('$B$3')` 가 `{ col: 1, row: 2, absCol: true, absRow: true, valid: true }` 이고, `AA1`·`A101`·`A0` 은 `valid: false`, `a1` 은 `A1` 과 같다.
  - [ ] 범위 `B5:A1` 이 `A1:B5` 로 정규화되고 나열하면 10개 주소가 나온다.
- 검증:
  - [ ] 테스트: `npm test`
  - [ ] 빌드: 없음(빌드 단계 없음). `npm install` 이 오류 없이 끝난다.
  - [ ] 사람 확인: `package.json` 의 scripts 세 줄이 SPEC 작업 환경과 글자 그대로 같은지 본다.
- 의존 작업: 없음
- 건드릴 파일: `package.json`, `playwright.config.js`, `src/address.js`, `tests/address.test.js`
- 크기: M
- 구성 요소: C1
- 닫는 성공 기준: 없음(AC11·AC13·AC16 의 기반)

## T2: 원문 해석과 보이는 글자
- 설명: C2 Value 를 만든다. `parseRaw(raw)` 로 원문을 숫자·문자열·수식·빈 칸으로 나누고(D4 정규식), 칸 값 모양과 오류 값 상수 여섯 개(D3), `toNumber`·`toText`, `display`(유효숫자 15자리, `TRUE`/`FALSE`), `align`(숫자만 `right`)을 둔다.
- 수용 기준:
  - [ ] `12`→숫자 12, `1e3`→1000, `-3.5`→-3.5, `12a`→문자열, `=1`→수식, ``→빈 칸.
  - [ ] `display` 가 `0.1+0.2` 의 결과를 `0.3`, `1/3` 을 `0.333333333333333` 으로 보이고, 참/거짓은 `TRUE`/`FALSE` 다.
  - [ ] `toNumber` 는 빈 칸 0, 참 1, 거짓 0, 문자열(`"1"` 포함)은 `#VALUE!` 오류 값이다.
- 검증:
  - [ ] 테스트: `npm test`
  - [ ] 빌드: 없음(빌드 단계 없음)
  - [ ] 사람 확인: `tests/value.test.js` 에 AC5 의 예 다섯 개와 AC21 의 예 두 개가 모두 있는지 본다.
- 의존 작업: T1
- 건드릴 파일: `src/value.js`, `tests/value.test.js`
- 크기: S
- 구성 요소: C2
- 닫는 성공 기준: AC5 (AC21 의 단위 부분)

## T3: 빈 표 화면
- 설명: `index.html`(address·value·app 스크립트), `style.css`, `src/app.js` 로 A~Z 열 머리글, 1~100 행 머리글, `<td data-cell>` 2600개, 이름 칸 `#name-box`, 수식 입력줄 `#formula-input`, 숨긴 편집 상자 `#cell-editor`(D13)를 처음 한 번 그린다. 처음 활성 칸은 A1 이다. `e2e/grid.spec.js` 로 화면과 외부 요청 0건을 확인한다.
- 수용 기준:
  - [ ] file:// 로 열면 열 머리글 26개, 행 머리글 100개, `[data-cell]` 2600개가 보이고 `#name-box` 는 `A1`, `#formula-input` 은 빈 값이다.
  - [ ] `page.on('request')` 로 센 file: 밖 요청이 0건이다.
  - [ ] `src/app.js` 밖의 파일은 DOM 을 건드리지 않는다(D2).
- 검증:
  - [ ] 테스트: `npm test` 와 `npm run e2e -- e2e/grid.spec.js`(브라우저가 없으면 쓰는 데까지만)
  - [ ] 빌드: 없음. `open index.html` 로 열어 콘솔 오류가 없는지 본다.
  - [ ] 사람 확인: 브라우저에서 표가 스크롤되고 머리글이 A~Z, 1~100 인지 눈으로 본다.
- 의존 작업: T1, T2
- 건드릴 파일: `index.html`, `style.css`, `src/app.js`, `e2e/grid.spec.js`
- 크기: M
- 구성 요소: C11, C12
- 닫는 성공 기준: AC1, AC22

## 점검 지점: T1–T3 뒤
- [ ] 전체 테스트 통과
- [ ] 빌드 성공
- [ ] 핵심 흐름이 끝까지 동작
- [ ] 사람 검토

## T4: 수식 연산 계산
- 설명: C4 Formula 의 토큰 나누기·구문 분석·계산을 연산자 범위에서 만든다(D5·D6). 숫자, 큰따옴표 문자열, 참조, 범위, 괄호, 단항 `-`·`+`, `^`, `*`·`/`, `+`·`-`, `&`, 비교 여섯 개를 다룬다. 칸 값은 `ctx.get(addr)` 로 받는다. `parse` 는 `{ ast, refs }` 또는 `{ error: '#ERROR!' }` 를 돌려준다. 함수 호출 노드는 T5 에서 잇는다.
- 수용 기준:
  - [ ] `=1+2*3`→7, `=(1+2)*3`→9, `=2^3^2`→64, `=-2^2`→4, `=10/4`→2.5.
  - [ ] `=1<2`→TRUE, `=1<>1`→FALSE, `=2>=2`→TRUE, `="a"&1+1`→`a2`, `="A"="a"`→TRUE.
  - [ ] `refs` 가 참조와 펼친 범위 주소를 담고, 표 밖 참조는 담지 않는다. `eval`·`new Function` 을 쓰지 않는다.
- 검증:
  - [ ] 테스트: `npm test`
  - [ ] 빌드: 없음(빌드 단계 없음)
  - [ ] 사람 확인: `src/formula.js` 를 `eval`, `Function` 으로 검색해 쓰지 않았는지 본다.
- 의존 작업: T1, T2
- 건드릴 파일: `src/formula.js`, `tests/formula.test.js`
- 크기: S
- 구성 요소: C4
- 닫는 성공 기준: AC9, AC10

## T5: 함수 여덟 개
- 설명: C3 Functions 를 만들고(D8 `call(name, kinds, evalArg)`) C4 Formula 의 `call` 노드를 잇는다. SUM·AVERAGE·MIN·MAX·COUNT 는 범위·참조 인자의 문자열·빈 칸·참/거짓을 건너뛰고 직접 준 문자열은 `#VALUE!`, IF 는 조건과 고른 쪽만 계산, ROUND 는 D8 의 15자리 정리 뒤 0에서 먼 쪽 반올림, ABS 는 절댓값. 이름은 대소문자를 가리지 않는다.
- 수용 기준:
  - [ ] A1:A4 = 1, 2, `x`, 빈 칸일 때 SUM→3, AVERAGE→1.5, MIN→1, MAX→2, COUNT→2, `=IF(A1>0,"양","음")`→`양`.
  - [ ] `=ROUND(2.345,2)`→2.35, `=ROUND(-2.5,0)`→-3, `=ABS(-4)`→4, `=sum(A1:A2)`→3.
  - [ ] `=SUM(A1,A3)`→1, `=COUNT(A3)`→0, `=SUM(A1,"x")`→`#VALUE!`(D8).
- 검증:
  - [ ] 테스트: `npm test`
  - [ ] 빌드: 없음(빌드 단계 없음)
  - [ ] 사람 확인: `tests/functions.test.js` 에 AC12 의 예가 모두 있는지 본다.
- 의존 작업: T4
- 건드릴 파일: `src/functions.js`, `tests/functions.test.js`, `src/formula.js`
- 크기: M
- 구성 요소: C3, C4
- 닫는 성공 기준: AC12

## T6: 오류 값과 오류 퍼짐
- 설명: G3·G4·D7 의 오류 규칙을 맞춘다. 0으로 나누기, 없는 함수, 표 밖 참조와 표 밖 범위, 숫자 자리의 문자열, 인자 수 틀림, 문법 오류, 오류 글자 토큰(`#REF!` 등), 왼쪽 먼저 오류 반환을 `tests/errors.test.js` 로 묶는다. 칸 값은 가짜 `ctx` 로 준다.
- 수용 기준:
  - [ ] `=1/0`→`#DIV/0!`, `=FOO(1)`→`#NAME?`, `=AA1`→`#REF!`, `=A101`→`#REF!`, `=SUM(A1:A101)`→`#REF!`.
  - [ ] `="a"+1`→`#VALUE!`, `=ABS(1,2)`→`#VALUE!`, `=1+`→`#ERROR!`, `=(1`→`#ERROR!`, `=#REF!`→`#REF!`.
  - [ ] A1 이 `#DIV/0!` 일 때 `=A1+1`→`#DIV/0!` 이고, `=IF(1,1,1/0)`→1 이다(D7).
- 검증:
  - [ ] 테스트: `npm test`
  - [ ] 빌드: 없음(빌드 단계 없음)
  - [ ] 사람 확인: `tests/errors.test.js` 에 AC13 의 예 여덟 개가 모두 있는지 본다.
- 의존 작업: T5
- 건드릴 파일: `tests/errors.test.js`, `src/formula.js`, `src/functions.js`, `src/value.js`
- 크기: M
- 구성 요소: C2, C3, C4
- 닫는 성공 기준: AC13

## 점검 지점: T4–T6 뒤
- [ ] 전체 테스트 통과
- [ ] 빌드 성공
- [ ] 핵심 흐름이 끝까지 동작
- [ ] 사람 검토

## T7: 표 모듈과 다시 계산
- 설명: C5 Sheet 를 D9 대로 만든다. `setRaw`·`setMany` 는 값이 바뀐 주소 목록을 돌려주고, 역방향 그래프로 기대는 칸만 모아 Tarjan 으로 순환을 찾아 `#CIRC!` 로 두고 나머지는 위상 순서로 한 번씩 계산한다. `getRaw`·`getValue`·`getDisplay`·`entries`·`loadAll`·`evalCount` 를 둔다. 주소 키는 대문자로 저장한다.
- 수용 기준:
  - [ ] A1=2, B1=3 일 때 `=A1*B1`→6, `=SUM(A1:B1)`→5, `=$A$1+B$1`→5, `=SUM(B1:A1)`→5, 빈 칸 참조는 0.
  - [ ] A1=`=B1`, B1=`=A1` 이면 둘 다 `#CIRC!`, C1=`=C1+1` 도 `#CIRC!`, B1 을 `5` 로 바꾸면 A1 은 5.
  - [ ] A1=1, B1=`=A1*2`, C1=`=B1+1`, D1=`=7` 에서 A1 을 10 으로 바꾸면 B1=20, C1=21 이고 `evalCount` 는 2 만 늘어난다(D1 은 다시 계산하지 않는다).
- 검증:
  - [ ] 테스트: `npm test`
  - [ ] 빌드: 없음(빌드 단계 없음)
  - [ ] 사람 확인: `tests/sheet.test.js` 의 계산 횟수 테스트가 `evalCount` 차이를 정확한 수로 확인하는지 본다.
- 의존 작업: T6
- 건드릴 파일: `src/sheet.js`, `tests/sheet.test.js`
- 크기: S
- 구성 요소: C5
- 닫는 성공 기준: AC11, AC14 (AC15 의 단위 부분)

## T8: 칸 고르기 이동 계산
- 설명: C6 Selection 을 D10 대로 만든다. 상태 `{ active, focus }`, `select`, `move`(방향키·Enter·Tab 과 Shift 짝), `extend`(Shift+방향키), `extendTo`(Shift+클릭), `rangeText`. 모두 표 끝에서 멈춘다.
- 수용 기준:
  - [ ] A1 에서 위·왼쪽, Z100 에서 아래·오른쪽 `move` 는 자리를 바꾸지 않는다.
  - [ ] B2 에서 `extend` 오른쪽 두 번·아래 한 번이면 `rangeText` 가 `B2:D3` 이고, B2 에서 `extendTo` D3 도 `B2:D3` 이다.
  - [ ] 범위가 있을 때 `move` 는 범위를 활성 칸 하나로 접고 옮긴다. 한 칸이면 `rangeText` 는 `A1` 꼴이다.
- 검증:
  - [ ] 테스트: `npm test`
  - [ ] 빌드: 없음(빌드 단계 없음)
  - [ ] 사람 확인: `tests/selection.test.js` 에 네 방향 표 끝 테스트가 모두 있는지 본다.
- 의존 작업: T1
- 건드릴 파일: `src/selection.js`, `tests/selection.test.js`
- 크기: S
- 구성 요소: C6
- 닫는 성공 기준: 없음(AC3·AC4 의 단위 부분, 화면은 T11)

## T9: 칸 클릭과 새 글자 입력 확정
- 설명: C11 App 에 C5 Sheet·C6 Selection 을 잇는다. 칸을 클릭하면 활성 칸(`.active`)이 되고 이름 칸에 주소, 수식 입력줄에 원문이 보인다. 고친 상태가 아닐 때 `#cell-editor` 에 `input`·`compositionstart` 가 오면 고치기를 시작하고(D13, `editing` 클래스), Enter·Tab(Shift 포함)은 확정 뒤 G11 대로 옮긴다. 바뀐 칸만 글자와 정렬 클래스를 고친다. `index.html` 에 functions·formula·sheet·selection 스크립트를 더한다.
- 수용 기준:
  - [ ] B3 을 클릭하면 B3 이 `.active` 이고 `#name-box` 는 `B3`, 원문이 `=1+1` 인 칸이면 `#formula-input` 은 `=1+1` 이다.
  - [ ] 활성 칸에서 `5` 를 치고 Enter 하면 그 칸은 `5`, 활성 칸은 한 칸 아래다. 내용이 있는 칸에서 `이름` 을 치면 기존 내용 대신 `이름` 으로 시작한다.
  - [ ] 숫자 칸은 오른쪽, 문자열 칸은 왼쪽 정렬이다(`Value.align` 의 클래스).
- 검증:
  - [ ] 테스트: `npm test` 와 `npm run e2e -- e2e/edit.spec.js e2e/grid.spec.js`(브라우저가 없으면 쓰는 데까지만)
  - [ ] 빌드: 없음. `open index.html` 로 열어 콘솔 오류가 없는지 본다.
  - [ ] 사람 확인: 브라우저에서 한글 IME 로 첫 글자를 쳐도 잃지 않는지 본다.
- 의존 작업: T3, T7, T8
- 건드릴 파일: `src/app.js`, `index.html`, `style.css`, `e2e/edit.spec.js`, `e2e/grid.spec.js`
- 크기: M
- 구성 요소: C11, C12
- 닫는 성공 기준: AC2, AC6, AC21

## 점검 지점: T7–T9 뒤
- [ ] 전체 테스트 통과
- [ ] 빌드 성공
- [ ] 핵심 흐름이 끝까지 동작
- [ ] 사람 검토

## T10: 기존 원문 고치기와 수식 입력줄
- 설명: 더블클릭·F2 는 상자에 기존 원문을 채우고 커서를 끝에 둔다. Esc 는 고치기 전 내용으로 되돌리고 고치기를 끝낸다. 고치는 중 방향키는 글자 커서만 옮긴다. `#formula-input` 에서 고쳐 Enter 하면 같은 확정 경로를, Esc 는 취소를 탄다. 확정 뒤 기대는 칸이 화면에서 다시 계산되는지 e2e 로 본다.
- 수용 기준:
  - [ ] A1=`abc` 에서 F2 와 더블클릭은 `#cell-editor` 값 `abc`, 커서 끝으로 열리고, `x` 를 치고 Esc 하면 A1 은 `abc` 다.
  - [ ] `#formula-input` 에 `=2*3` 을 넣고 Enter 하면 활성 칸이 `6` 이다.
  - [ ] A1=1, B1=`=A1*2`, C1=`=B1+1` 에서 A1 을 10 으로 확정하면 화면의 B1 은 `20`, C1 은 `21` 이다.
- 검증:
  - [ ] 테스트: `npm test` 와 `npm run e2e -- e2e/edit.spec.js`(브라우저가 없으면 쓰는 데까지만)
  - [ ] 빌드: 없음. `open index.html` 로 열어 콘솔 오류가 없는지 본다.
  - [ ] 사람 확인: 고치는 중 방향키가 활성 칸을 옮기지 않고 글자 커서만 옮기는지 브라우저에서 본다.
- 의존 작업: T9
- 건드릴 파일: `src/app.js`, `e2e/edit.spec.js`
- 크기: S
- 구성 요소: C11
- 닫는 성공 기준: AC7, AC15

## T11: 키보드 이동과 범위 고르기 화면
- 설명: 고친 상태가 아닐 때 방향키·Enter·Shift+Enter·Tab·Shift+Tab 은 C6 `move`, Shift+방향키는 `extend`, Shift+클릭은 `extendTo` 로 잇고 `preventDefault` 한다(D13, R5). 고른 범위 칸에 `.selected` 를 붙이고 이름 칸에 `rangeText` 를 보인다.
- 수용 기준:
  - [ ] A1 에서 ↑·← 는 A1 에 머물고, Z100 에서 ↓·→·Enter·Tab 은 Z100 에 머문다. Shift+Enter 는 위, Shift+Tab 은 왼쪽으로 옮긴다.
  - [ ] B2 에서 Shift+→ 두 번, Shift+↓ 한 번이면 `.selected` 가 B2:D3 의 6칸이고 `#name-box` 는 `B2:D3` 이다.
  - [ ] B2 를 클릭하고 D3 을 Shift+클릭해도 같다.
- 검증:
  - [ ] 테스트: `npm test` 와 `npm run e2e -- e2e/keyboard.spec.js`(브라우저가 없으면 쓰는 데까지만)
  - [ ] 빌드: 없음. `open index.html` 로 열어 콘솔 오류가 없는지 본다.
  - [ ] 사람 확인: Tab 을 눌러도 브라우저 포커스가 표 밖으로 빠지지 않는지 본다.
- 의존 작업: T9
- 건드릴 파일: `src/app.js`, `style.css`, `e2e/keyboard.spec.js`
- 크기: M
- 구성 요소: C11, C12
- 닫는 성공 기준: AC3, AC4

## T12: 고른 범위 지우기
- 설명: 고친 상태가 아닐 때 Delete·Backspace 는 고른 범위의 모든 칸을 C5 `setMany` 로 비우고 바뀐 칸을 다시 그린다.
- 수용 기준:
  - [ ] A1:B2 에 값을 넣고 C1=`=SUM(A1:B2)` 일 때 A1:B2 를 고르고 Delete 하면 네 칸이 빈 칸이고 C1 은 `0` 이다.
  - [ ] Backspace 도 같은 결과다.
  - [ ] 지운 뒤 편집 상자에 글자가 남지 않는다(`#cell-editor` 값이 빈 글자).
- 검증:
  - [ ] 테스트: `npm test` 와 `npm run e2e -- e2e/edit.spec.js`(브라우저가 없으면 쓰는 데까지만)
  - [ ] 빌드: 없음. `open index.html` 로 열어 콘솔 오류가 없는지 본다.
  - [ ] 사람 확인: 브라우저에서 범위를 지운 뒤 기대던 수식 칸 값이 바로 바뀌는지 본다.
- 의존 작업: T11
- 건드릴 파일: `src/app.js`, `e2e/edit.spec.js`
- 크기: S
- 구성 요소: C11
- 닫는 성공 기준: AC8

## 점검 지점: T10–T12 뒤
- [ ] 전체 테스트 통과
- [ ] 빌드 성공
- [ ] 핵심 흐름이 끝까지 동작
- [ ] 사람 검토

## T13: 붙여 넣기 계산(참조 옮기기 포함)
- 설명: C4 Formula 에 `shift(text, dCol, dRow)` 를 토큰 단위로 더하고(D5, R3: 문자열 토큰은 그대로), C8 Clipboard 의 `copy(getRaw, range)` 와 `paste(clip, target)` 를 만든다. 표 밖으로 넘치는 붙여 넣기 칸은 버린다.
- 수용 기준:
  - [ ] C1 의 `=A1+$B$1+$A2+B$2` 를 D3 으로 옮기면 `=B3+$B$1+$A4+C$2`, B2 의 `=A1` 을 A1 로 옮기면 `=#REF!`, B3 의 `=SUM(A1:B2)` 를 B2 로 옮기면 `=SUM(#REF!)`, `="A1"&A1` 의 문자열은 그대로다.
  - [ ] A1:B2 를 `copy` 해 D5 에 `paste` 하면 D5:E6 네 칸의 `{addr, raw}` 가 나오고 수식 참조가 위 규칙대로 바뀐다.
  - [ ] Z100 에 2×2 를 `paste` 하면 Z100 한 칸만 나온다.
- 검증:
  - [ ] 테스트: `npm test`
  - [ ] 빌드: 없음(빌드 단계 없음)
  - [ ] 사람 확인: `tests/clipboard.test.js` 에 AC16 의 두 예와 문자열 안 `"A1"` 예가 있는지 본다.
- 의존 작업: T6
- 건드릴 파일: `src/formula.js`, `src/clipboard.js`, `tests/clipboard.test.js`
- 크기: M
- 구성 요소: C4, C8
- 닫는 성공 기준: AC16 (AC17 의 단위 부분)

## T14: 복사·붙여 넣기 화면
- 설명: 고친 상태가 아닐 때 Ctrl/Cmd+C 는 고른 범위를 C8 `copy` 로 페이지 안에 기억하고, Ctrl/Cmd+V 는 활성 칸 기준 `paste` 결과를 C5 `setMany` 로 넣는다. `index.html` 에 clipboard 스크립트를 더한다. e2e 는 `ControlOrMeta` 를 쓴다(D12).
- 수용 기준:
  - [ ] A1=1, B1=`=A1+1`, A2=2, B2=`=A2*2` 를 고르고 Ctrl+C, D5 에서 Ctrl+V 하면 D5:E6 원문이 붙고 E5 의 원문은 `=D5+1`, 값은 `2` 다.
  - [ ] Z100 에서 Ctrl+V 하면 Z100 만 바뀌고 오류가 나지 않는다.
  - [ ] 운영체제 클립보드를 읽거나 쓰지 않는다(`navigator.clipboard` 를 쓰지 않는다).
- 검증:
  - [ ] 테스트: `npm test` 와 `npm run e2e -- e2e/clipboard.spec.js`(브라우저가 없으면 쓰는 데까지만)
  - [ ] 빌드: 없음. `open index.html` 로 열어 콘솔 오류가 없는지 본다.
  - [ ] 사람 확인: 맥에서 Cmd+C·Cmd+V 로도 되는지 브라우저에서 본다.
- 의존 작업: T11, T13
- 건드릴 파일: `src/app.js`, `index.html`, `e2e/clipboard.spec.js`
- 크기: M
- 구성 요소: C11, C12
- 닫는 성공 기준: AC17

## T15: 되돌리기 기록
- 설명: C7 History 를 D11 대로 만든다. `create(limit = 100)`, `push(step)`, `undo`, `redo`, `canUndo`, `canRedo`. 새 단계를 쌓으면 다시 하기 목록을 비우고, before 와 after 가 모두 같은 단계는 쌓지 않는다.
- 수용 기준:
  - [ ] 세 단계를 쌓고 `undo` 세 번이면 쌓은 반대 순서로 단계가 나오고, `redo` 로 다시 나온다.
  - [ ] `undo` 뒤 새 단계를 쌓으면 `redo` 는 `null` 이다. 바뀐 것 없는 단계는 쌓이지 않는다.
  - [ ] 101번 쌓으면 `undo` 는 100번만 단계를 돌려주고 101번째는 `null` 이다.
- 검증:
  - [ ] 테스트: `npm test`
  - [ ] 빌드: 없음(빌드 단계 없음)
  - [ ] 사람 확인: `tests/history.test.js` 에 100단계 한도 테스트가 있는지 본다.
- 의존 작업: T1
- 건드릴 파일: `src/history.js`, `tests/history.test.js`
- 크기: S
- 구성 요소: C7
- 닫는 성공 기준: 없음(AC18 의 단위 부분, 화면은 T16)

## 점검 지점: T13–T15 뒤
- [ ] 전체 테스트 통과
- [ ] 빌드 성공
- [ ] 핵심 흐름이 끝까지 동작
- [ ] 사람 검토

## T16: 되돌리기 화면
- 설명: C11 App 이 확정 한 번·지우기 한 번·붙여 넣기 한 번을 `[{addr, before, after}]` 한 단계로 C7 에 쌓는다. 고친 상태가 아닐 때 Ctrl/Cmd+Z 는 `before` 를, Ctrl/Cmd+Y 와 Ctrl/Cmd+Shift+Z 는 `after` 를 C5 `setMany` 로 넣고 바뀐 칸을 다시 그린다. `index.html` 에 history 스크립트를 더한다.
- 수용 기준:
  - [ ] 확정·지우기·붙여 넣기를 한 뒤 Ctrl+Z 를 한 번 누를 때마다 한 단계씩 되돌아가고, Ctrl+Y 와 Ctrl+Shift+Z 로 다시 된다.
  - [ ] 되돌린 뒤 새로 확정하면 Ctrl+Y 는 아무 일도 하지 않는다.
  - [ ] 원문이 같은 확정은 단계가 되지 않는다(같은 값 다시 확정 뒤 Ctrl+Z 는 그 전 단계를 되돌린다).
- 검증:
  - [ ] 테스트: `npm test` 와 `npm run e2e -- e2e/undo.spec.js`(브라우저가 없으면 쓰는 데까지만)
  - [ ] 빌드: 없음. `open index.html` 로 열어 콘솔 오류가 없는지 본다.
  - [ ] 사람 확인: Ctrl+Z 가 편집 상자의 브라우저 되돌리기와 겹치지 않는지 본다(R5).
- 의존 작업: T12, T14, T15
- 건드릴 파일: `src/app.js`, `index.html`, `e2e/undo.spec.js`
- 크기: M
- 구성 요소: C11, C12
- 닫는 성공 기준: AC18

## T17: 저장 형식 직렬화·복원
- 설명: C9 Storage 를 만든다. `save(store, entries)` 는 `mini-sheet:v1` 키에 `{"version":1,"cells":{...}}` 를 쓰고 빈 칸은 적지 않는다. `load(store)` 는 plan C9 의 경계 검증대로 읽지 못하면 `{}` 를, 읽으면 대문자 주소 → 비지 않은 문자열 맵을 돌려준다. 저장소는 가짜 객체로 시험한다.
- 수용 기준:
  - [ ] `save` 뒤 `load` 하면 같은 원문 맵이 나오고, 저장된 글자는 `{"version":1,"cells":{"A1":"1","B1":"=A1*2"}}` 꼴이다.
  - [ ] 깨진 JSON, 값 없음, `getItem` 예외, `version` 이 1 이 아님, `cells` 가 배열·`null` 이면 `{}` 다.
  - [ ] `cells` 안의 문자열 아닌 값·빈 문자열·표 밖 주소 키는 버리고 `"a1"` 은 `A1` 로 바꾼다.
- 검증:
  - [ ] 테스트: `npm test`
  - [ ] 빌드: 없음(빌드 단계 없음)
  - [ ] 사람 확인: `src/storage.js` 가 `localStorage` 전역을 직접 부르지 않는지 본다(D2).
- 의존 작업: T1
- 건드릴 파일: `src/storage.js`, `tests/storage.test.js`
- 크기: S
- 구성 요소: C9
- 닫는 성공 기준: 없음(AC19 의 단위 부분, 화면은 T18)

## T18: 저장과 새로 고침 뒤 복원 화면
- 설명: C11 App 이 원문이 바뀌는 모든 경로(확정·지우기·붙여 넣기·되돌리기·다시 하기) 뒤에 `Storage.save(localStorage, sheet.entries())` 를 부르고, 열 때 `Storage.load(localStorage)` 를 C5 `loadAll` 로 넣어 전체를 다시 계산해 그린다(D14). `index.html` 에 storage 스크립트를 더한다.
- 수용 기준:
  - [ ] A1=`2`, B1=`=A1*3` 을 넣고 새로 고치면 A1 은 `2`, B1 은 `6`, B1 을 클릭하면 수식 입력줄이 `=A1*3` 이다.
  - [ ] localStorage 의 `mini-sheet:v1` 을 `{깨짐` 으로 두고 열면 페이지 오류(`pageerror`) 없이 빈 표다.
  - [ ] 되돌리기 뒤 새로 고쳐도 되돌린 상태가 보인다.
- 검증:
  - [ ] 테스트: `npm test` 와 `npm run e2e -- e2e/storage.spec.js`(브라우저가 없으면 쓰는 데까지만)
  - [ ] 빌드: 없음. `open index.html` 로 열어 콘솔 오류가 없는지 본다.
  - [ ] 사람 확인: 브라우저를 닫았다 다시 열어도 내용이 남는지 본다.
- 의존 작업: T16, T17
- 건드릴 파일: `src/app.js`, `index.html`, `e2e/storage.spec.js`
- 크기: M
- 구성 요소: C11, C12
- 닫는 성공 기준: AC19

## 점검 지점: T16–T18 뒤
- [ ] 전체 테스트 통과
- [ ] 빌드 성공
- [ ] 핵심 흐름이 끝까지 동작
- [ ] 사람 검토

## T19: CSV 글자 만들기
- 설명: C10 Csv 의 `build(map)` 을 만든다. 보이는 값 맵을 받아 A1 부터 값이 있는 마지막 행·열까지, 쉼표, CRLF, 쉼표·큰따옴표·줄바꿈이 든 값은 큰따옴표로 감싸고 안의 큰따옴표는 두 번 쓰며, 맨 앞에 BOM 을 붙인다.
- 수용 기준:
  - [ ] A1=`이름`, B1=`2`, A2=`a,"b"`, B3=`x` 의 결과가 `'﻿' + '이름,2\r\n"a,""b""",\r\n,x\r\n'` 이다.
  - [ ] 빈 맵이면 `'﻿'` 만 나온다.
  - [ ] 줄바꿈이 든 값은 큰따옴표로 감싼다.
- 검증:
  - [ ] 테스트: `npm test`
  - [ ] 빌드: 없음(빌드 단계 없음)
  - [ ] 사람 확인: `tests/csv.test.js` 의 기대 글자가 AC20 과 글자 그대로 같은지 본다.
- 의존 작업: T1
- 건드릴 파일: `src/csv.js`, `tests/csv.test.js`
- 크기: S
- 구성 요소: C10
- 닫는 성공 기준: 없음(AC20 의 단위 부분, 화면은 T20)

## T20: CSV 내려받기 화면
- 설명: `#download-csv` 단추("CSV 내려받기")를 화면 위쪽에 두고, 누르면 C5 `getDisplay` 로 보이는 값 맵을 만들어 `Csv.build` 에 넘기고 `Blob` + `<a download="sheet.csv">` 로 내려받는다(D14). `index.html` 에 csv 스크립트를 더한다. e2e 는 `page.waitForEvent('download')` 로 받아 내용을 비교한다(R2).
- 수용 기준:
  - [ ] A1=`이름`, B1=`=1+1`, A2=`a,"b"`, B3=`x` 를 넣고 단추를 누르면 `sheet.csv` 가 내려받아진다.
  - [ ] 받은 파일 내용이 BOM + `이름,2\r\n"a,""b""",\r\n,x\r\n` 이다.
  - [ ] 내려받기에 외부 요청이 생기지 않는다.
- 검증:
  - [ ] 테스트: `npm test`, `npm run test:coverage`, `npm run e2e`(브라우저가 없으면 쓰는 데까지만)
  - [ ] 빌드: 없음. `open index.html` 로 열어 콘솔 오류가 없는지 본다.
  - [ ] 사람 확인: 받은 `sheet.csv` 를 엑셀에서 열어 한글이 깨지지 않는지 본다.
- 의존 작업: T18, T19
- 건드릴 파일: `src/app.js`, `index.html`, `e2e/csv.spec.js`
- 크기: M
- 구성 요소: C11, C12
- 닫는 성공 기준: AC20

## 점검 지점: T19–T20 뒤
- [ ] 전체 테스트 통과
- [ ] 빌드 성공
- [ ] 핵심 흐름이 끝까지 동작
- [ ] 사람 검토
- [ ] `npm run test:coverage` 가 90% 이상으로 통과(SPEC 커버리지 목표)

## T21: 음수 판정 규칙
- 설명: 변경 요청(change.md, SPEC G20)의 규칙 몫이다. C2 Value 에 `isNegative(v)` 를 더해 반환 객체로 내보낸다. 규칙은 `v.type === 'number' && v.value < 0` 하나이고, 보이는 글자가 아니라 계산된 숫자 값으로 판정한다(D15). `align` 과 같은 꼴이며 DOM 을 건드리지 않는다. 테스트를 먼저 써서 실패를 본 뒤 구현한다.
- 수용 기준:
  - [ ] `isNegative` 가 숫자 `-3`·`-1e-20` 에 참이다.
  - [ ] 숫자 `0`·`-0`·`5`, 문자열 `'-3'`, 참/거짓, 오류 값(`ERR_DIV0`), 빈 칸에 거짓이다.
  - [ ] 기존 `tests/value.test.js` 의 테스트가 모두 그대로 통과한다.
- 검증:
  - [ ] 테스트: `npm test`, `npm run test:coverage`
  - [ ] 빌드: 없음(빌드 단계 없음)
  - [ ] 사람 확인: `tests/value.test.js` 에 AC23 확인 방법의 단위 예(-3·-1e-20 참, 0·-0·5·문자열 `-3`·참/거짓·오류 값·빈 칸 거짓)가 모두 있는지 본다.
- 의존 작업: T2
- 건드릴 파일: `src/value.js`, `tests/value.test.js`
- 크기: XS
- 구성 요소: C2
- 닫는 성공 기준: 없음(AC23 의 단위 부분, 화면은 T22)

## T22: 음수 칸 빨간 글자 화면
- 설명: C11 App 의 `renderCell(addr)` 끝에서 `td.classList.toggle('negative', Value.isNegative(value))` 를 부르고(D16), `style.css` 에 `.grid td.negative { color: #ff0000; }` 를 더한다(D17). 값이 바뀌는 경로(확정·다시 계산·지우기·붙여 넣기·되돌리기·복원)는 모두 `renderCell` 을 거치므로 경로마다 고치지 않는다. 편집 상자·수식 입력줄·CSV 는 건드리지 않는다. `e2e/negative.spec.js` 를 새로 써서 AC23 의 화면 몫을 확인한다(D18): 칸 클릭 후 `keyboard.type` + Enter 로 넣고, 시작할 때 localStorage 를 비우며, 클래스와 `getComputedStyle(td).color` 를 함께 본다.
- 수용 기준:
  - [ ] A1=`-3`, A2=`=1-5`, A3=`=-1e-20` 은 `negative` 클래스가 있고 글자색이 `rgb(255, 0, 0)` 이다. A4=`0`, A5=`5`, A6=`=-0`, A7=`abc`, A8=`="-3"`, A9=`=1<2`, A10=`=1/0`, 빈 칸은 클래스가 없고 글자색이 `rgb(255, 0, 0)` 이 아니다.
  - [ ] B1=`=C1-1` 에서 C1 을 `5` 로 바꾸면 B1 의 빨간색이 없어지고, 다시 `0` 으로 바꾸면 빨개진다.
  - [ ] A1 을 활성 칸으로 골라도 빨간 글자이고, 새로 고친 뒤에도 A1, A2 는 빨갛다.
- 검증:
  - [ ] 테스트: `npm test`, `npm run test:coverage`, `npm run e2e`(브라우저가 없으면 `e2e/negative.spec.js` 를 쓰는 데까지만, 설치와 실행은 mvp-builder 검사에서)
  - [ ] 빌드: 없음. `open index.html` 로 열어 콘솔 오류가 없는지 본다.
  - [ ] 사람 확인: 브라우저에서 `-3`, `=1-5` 를 넣어 빨갛게 보이고, 활성 칸·고른 범위 배경 위에서도 읽을 수 있는지 눈으로 본다(SPEC Q9).
- 의존 작업: T21, T18
- 건드릴 파일: `src/app.js`, `style.css`, `e2e/negative.spec.js`
- 크기: S
- 구성 요소: C11, C12
- 닫는 성공 기준: AC23

## 점검 지점: T21–T22 뒤
- [ ] 전체 테스트 통과
- [ ] 빌드 성공
- [ ] 핵심 흐름이 끝까지 동작
- [ ] 사람 검토
- [ ] `npm run test:coverage` 가 90% 이상으로 통과(SPEC 커버리지 목표)
- [ ] 기존 e2e(`e2e/*.spec.js` 8개)가 그대로 통과한다(음수 클래스가 정렬·선택 표시를 깨지 않는다).

## 성공 기준이 닫히는 곳

| 성공 기준 | 닫는 작업 | 단위 부분 |
|---|---|---|
| AC1 | T3 | — |
| AC2 | T9 | — |
| AC3 | T11 | T8 |
| AC4 | T11 | T8 |
| AC5 | T2 | — |
| AC6 | T9 | — |
| AC7 | T10 | — |
| AC8 | T12 | — |
| AC9 | T4 | — |
| AC10 | T4 | — |
| AC11 | T7 | — |
| AC12 | T5 | — |
| AC13 | T6 | — |
| AC14 | T7 | — |
| AC15 | T10 | T7 |
| AC16 | T13 | — |
| AC17 | T14 | T13 |
| AC18 | T16 | T15 |
| AC19 | T18 | T17 |
| AC20 | T20 | T19 |
| AC21 | T9 | T2 |
| AC22 | T3 | — |
| AC23 | T22 | T21 |

## 병렬로 할 수 있는 작업

병렬 가능(독립 규칙 모듈, 서로 다른 파일만 건드린다):

- T1 뒤: T2, T8, T15, T17, T19 는 서로 독립이다. 모두 C1 Address(또는 의존 없음)만 쓰고 자기 파일 둘만 만든다.
- T6 뒤: T7(`src/sheet.js`)과 T13(`src/formula.js`, `src/clipboard.js`)은 파일이 겹치지 않아 함께 할 수 있다.
- 이미 구현된 기능의 e2e 테스트 보강과 문서는 언제든 따로 할 수 있다.

순서대로 해야 하는 작업:

- T4 → T5 → T6: 모두 `src/formula.js` 를 고친다(같은 파일, 의존 사슬).
- T13 은 T6 뒤에 `src/formula.js` 를 고치므로 T4–T6 과 함께 하지 않는다.
- T3 → T9 → T10 → T11 → T12 → T14 → T16 → T18 → T20: 모두 `src/app.js` 와 `index.html` 을 고치는 공유 상태 변경이다. 하나씩 한다.
- 변경 요청(음수 빨간 글자): T21 → T22. T22 의 `src/app.js` 가 T21 의 `Value.isNegative` 를 부르므로 순서대로 한다. 두 카드뿐이라 병렬로 할 작업은 없다. 기존 e2e 보강·문서는 이와 따로 할 수 있다.

## 열린 질문

- TQ1  T9 의 한글 IME 첫 글자 처리(D13)는 Playwright `keyboard.type` 으로는 IME 조합을 재현하지 못한다. e2e 는 `keyboard.type('이름')` 이 들어가는지만 보고, 실제 IME 조합은 사람 확인으로 둔다고 가정했다. e2e 로 꼭 확인해야 하는가?
- TQ2  "빌드" 칸은 빌드 단계가 없어(SPEC 검증 수단) `index.html` 을 열어 콘솔 오류가 없는지 보는 것으로 대신했다. 다른 검사(예: `node --check src/*.js`)를 원하는가?
- TQ3  T7 의 계산 횟수 테스트에 다시 계산하지 않을 칸 D1=`=7` 을 더했다. AC15 의 "바뀐 칸에 기대지 않는 수식은 다시 계산하지 않는다" 를 확인하려는 가정이다.
- TQ4  변경 요청(change.md)을 카드 둘(T21 규칙, T22 화면)로 나눴다. T22 는 `src/app.js`·`style.css`·e2e 파일 셋을 건드리지만 고칠 줄이 각각 한두 줄이라 S 로 두었다. 지우기·붙여 넣기·되돌리기 경로의 빨간색은 모두 `renderCell` 을 거친다는 plan.md D16 을 믿고 e2e 는 AC23 에 적힌 다시 계산·활성 칸·새로 고침만 본다고 가정했다. 경로마다 e2e 를 더해야 하는가?
- TQ5  SPEC 의 Q9(빨간색 값 `#ff0000`)·Q10(`-0` 과 아주 작은 음수)과 plan.md 의 Q7 은 다시 적지 않았다. 답이 바뀌면 T21·T22 의 수용 기준을 함께 고친다.
