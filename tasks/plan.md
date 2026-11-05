# 설계: 미니 스프레드시트

## 개요

`index.html` 하나를 file:// 로 열어 쓰는 26열×100행 계산표를 만든다. 칸의 원문을 숫자·문자열·수식·빈 칸으로 읽고, 수식은 직접 만든 토큰 분석기·구문 분석기·계산기로 계산한다(`eval` 없음). 표 모듈이 칸 사이의 의존 그래프를 들고 있어 바뀐 칸에 기대는 칸만 순서대로 다시 계산하고 순환은 `#CIRC!` 로 표시한다. 칸 고르기, 되돌리기, 복사·붙여 넣기, 저장, CSV 만들기는 각각 DOM 을 모르는 규칙 모듈이 계산하고, `src/app.js` 하나가 DOM·키보드·마우스·localStorage·내려받기를 이 모듈들에 잇는다. 규칙 모듈은 `node:test` 단위 테스트로, 화면 동작은 Playwright e2e 로 확인한다.

## 기존 코드 파악

- 새 프로젝트다. 저장소에는 `idea.md`, `spec-standard.md`, `SPEC.md`, `.gitignore` 만 있고 `src/`, `tests/`, `e2e/`, `package.json` 은 아직 없다.
- 따를 관례는 `SPEC.md` 의 작업 환경과 `spec-standard.md` 에서 온다.
  - 브라우저 전역 스크립트(ES2020). 파일마다 IIFE 로 감싸 전역 객체 하나만 내고(`Address`, `Value`, ...), 끝에서 `if (typeof module !== 'undefined') module.exports = ...` 로 내보낸다.
  - `index.html` 의 스크립트 순서는 address → value → functions → formula → sheet → selection → history → clipboard → storage → csv → app 으로 고정이다. 의존은 앞에 읽는 파일로만 향해야 한다.
  - 들여쓰기 2칸, 작은따옴표, 세미콜론. 함수·변수는 카멜, 상수는 대문자 밑줄, 오류 값 상수는 `ERR_` 로 시작. 칸 주소 문자열은 늘 대문자.
  - 단위 테스트는 `tests/<모듈>.test.js`, e2e 는 `e2e/<기능>.spec.js`. 테스트 이름은 영어 문장.
  - e2e 가 찾는 고리: `[data-cell="A1"]`, `.active`, `.selected`, `#name-box`, `#formula-input`, `#cell-editor`, `#download-csv`.
- `.gitignore` 에 `node_modules/`, `test-results/`, `playwright-report/` 가 이미 있다.

## 구성 요소

| 번호 | 이름 | 책임 | 의존 | 맡는 성공 기준 |
|---|---|---|---|---|
| C1 | Address (`src/address.js`) | 칸 주소 해석과 만들기. `A1` ↔ `{col,row}`, 대소문자 무시, `$` 절대 표시, 범위 정규화(`B5:A1` → `A1:B5`), 표 밖 판정(`valid`), 범위 안 주소 나열. | 없음 | AC11, AC13, AC16 |
| C2 | Value (`src/value.js`) | 원문 해석(G2: 숫자·문자열·수식·빈 칸), 칸 값 모양과 오류 값 상수(`ERR_DIV0` 등 여섯 개), 숫자·참/거짓·문자열 바꾸기(G5·G7), 보이는 글자 만들기(G10 유효숫자 15자리, `TRUE`/`FALSE`), 정렬 종류, 음수 판정 `isNegative`(G20, D15). | 없음 | AC5, AC13, AC21, AC23 |
| C3 | Functions (`src/functions.js`) | SUM, AVERAGE, MIN, MAX, COUNT, IF, ROUND, ABS 를 G8 대로 계산. 이름 대소문자 무시, 없는 이름은 `#NAME?`, 인자 수 틀림은 `#VALUE!`. | C2 | AC12, AC13 |
| C4 | Formula (`src/formula.js`) | 수식 토큰 나누기, 구문 분석(AST, G6 우선순위), 참조 목록 뽑기, 계산(칸 값은 넘겨받은 읽기 함수로 얻음), 참조 옮기기(`shift`). | C1, C2, C3 | AC9, AC10, AC11, AC13, AC16 |
| C5 | Sheet (`src/sheet.js`) | 칸 원문·값 저장, 의존 그래프(정방향·역방향), 바뀐 칸에 기대는 칸만 순서대로 다시 계산, 순환 찾기(`#CIRC!`), 계산 횟수 세기, 전체 다시 계산(불러오기 뒤). | C1, C2, C4 | AC8, AC11, AC14, AC15, AC19 |
| C6 | Selection (`src/selection.js`) | 활성 칸·범위 상태와 이동 계산(G11): 방향키, Enter/Tab(Shift 포함), Shift+방향키, Shift+클릭, 표 끝에서 멈추기, 이름 칸 글자. | C1 | AC3, AC4 |
| C7 | History (`src/history.js`) | 되돌리기·다시 하기 단계 쌓기(G14): 최대 100단계, 새 단계에서 다시 하기 목록 비움, 바뀐 것 없는 단계 무시. | 없음 | AC18 |
| C8 | Clipboard (`src/clipboard.js`) | 고른 범위의 원문 기억, 붙일 자리 계산(G13): 활성 칸 기준 같은 크기, 표 밖 버림, 수식 참조는 C4 `shift` 로 옮김. | C1, C4 | AC16, AC17 |
| C9 | Storage (`src/storage.js`) | 저장 형식 `{"version":1,"cells":{...}}` 직렬화·복원(G15). 저장소 객체를 인자로 받는다. 복원은 저장된 값을 경계에서 검증한다: `getItem` 이 예외를 내거나 값이 없거나 JSON 으로 읽히지 않거나, 읽은 값이 일반 객체가 아니거나 `version` 이 1 이 아니거나 `cells` 가 일반 객체(배열·`null` 아님)가 아니면 빈 표(`{}`)를 돌려준다. `cells` 안에서는 값이 문자열이 아니거나 빈 문자열인 칸, 표 안의 주소가 아닌 키를 버리고, 주소 키는 대문자로 정규화한다(`"a1"` → `A1`). 그래서 C5 `loadAll` 에는 늘 `{ 대문자 주소: 비지 않은 문자열 }` 만 들어간다. | C1 | AC19 |
| C10 | Csv (`src/csv.js`) | 보이는 값으로 CSV 글자 만들기(G16): A1 부터 값이 있는 마지막 행·열까지, 쉼표, CRLF, 따옴표 감싸기, BOM. | C1 | AC20 |
| C11 | App (`src/app.js`) | DOM 그리기(머리글·2600칸·이름 칸·수식 입력줄·편집 상자·CSV 단추), 마우스·키 이벤트를 규칙 모듈 호출로 잇기, 고치기 상태(G12), 바뀐 칸만 화면 갱신, localStorage 와 Blob 내려받기 연결, 칸의 `negative` 클래스 붙이고 떼기(D16). 규칙은 두지 않는다. | C1, C2, C5, C6, C7, C8, C9, C10 | AC1, AC2, AC3, AC4, AC6, AC7, AC8, AC15, AC17, AC18, AC19, AC20, AC21, AC23 |
| C12 | Page (`index.html`, `style.css`) | 페이지 뼈대와 고정 스크립트 순서, 표·수식 입력줄 모양, 숫자 오른쪽·문자열 왼쪽 정렬 클래스, 음수 칸 빨간 글자 `.negative`(D17). 외부 요청 없음. | C11 | AC1, AC21, AC22, AC23 |

테스트 도구(`package.json`, `playwright.config.js`, `tests/`, `e2e/`)는 앱 구성 요소가 아니므로 표에 넣지 않고 D12 로 정한다.

## 아키텍처 다이어그램

```text
Arrow "A --> B" or a line ending in "v" means A depends on B.
Layer = dependency depth. The edge list below is complete;
the drawing shows the main paths only.

L5                [C12 Page]
                      |
                      v
L4                [C11 App] --> C1 C2 C5 C6 C7 C8 C9 C10

L3   [C5 Sheet]                  [C8 Clipboard]
         |                             |
         +------------+----------------+
                      |
                      v
L2               [C4 Formula]
                      |
                      v
L1              [C3 Functions]   [C6 Selection]   [C9 Storage]   [C10 Csv]
                      |                |                |              |
                      v                +----------------+--------------+
L0               [C2 Value]                             |
                                                        v
                                                  [C1 Address]   [C7 History]

Edge list (complete):
  C12 --> C11
  C11 --> C1, C2, C5, C6, C7, C8, C9, C10
  C5  --> C1, C2, C4
  C8  --> C1, C4
  C4  --> C1, C2, C3
  C3  --> C2
  C6  --> C1
  C9  --> C1
  C10 --> C1
  C1, C2, C7 --> (none)
```

## 아키텍처 결정

| 번호 | 결정 | 이유 |
|---|---|---|
| D1 | 모듈 꼴: 파일마다 `var X = (function () { ... })();` 와 끝의 `if (typeof module !== 'undefined') module.exports = X;`. 다른 모듈은 IIFE 맨 위에서 `var Value_ = typeof module !== 'undefined' ? require('./value.js') : Value;` 꼴로 얻는다. 의존은 `index.html` 에서 앞에 읽는 파일로만 향한다(C1~C12 의존 표가 이를 지킨다). | SPEC 작업 환경(전역 스크립트, ES 모듈 금지)과 Node `require` 단위 테스트를 함께 만족한다. 고정 스크립트 순서와 의존 방향을 맞춰 순환을 막는다. |
| D2 | DOM·localStorage·Blob·`document` 는 C11 App 만 만진다. C1~C10 은 입력→출력만 하는 순수 규칙 모듈이다. C9 Storage 는 `getItem`/`setItem` 을 가진 저장소 객체를 인자로 받는다. | 커버리지 90% 대상이 `src/app.js` 를 뺀 전부이고, 단위 테스트가 DOM 없이 돌아야 한다(SPEC 검증 수단). |
| D3 | 칸 값 모양(C2·C3·C4·C5·C10 이 공유): `{ type: 'empty' }`, `{ type: 'number', value: n }`, `{ type: 'string', value: s }`, `{ type: 'bool', value: b }`, `{ type: 'error', value: '#DIV/0!' }`. 오류 값 상수는 `Value.ERR_DIV0`, `ERR_NAME`, `ERR_REF`, `ERR_VALUE`, `ERR_CIRC`, `ERR_SYNTAX`(`#ERROR!`). 바꾸기 함수 `Value.toNumber(v)` 는 빈 칸 0, 참 1, 거짓 0, 문자열은 숫자로 읽히는 글자(`"1"`, `" 3"`)라도 모두 `#VALUE!` 오류 값을 돌려준다(G3 "숫자 자리에 문자열"). 그래서 `="1"+1` 과 A1=`=" 3"` 일 때 `=A1*2` 는 `#VALUE!` 다. `Value.toText(v)` 는 빈 칸 `''`. | 다섯 모듈이 같은 값을 주고받는다. 오류를 예외가 아닌 값으로 다뤄 G4 전파를 단순한 "첫 오류 반환" 규칙으로 만든다. |
| D4 | 원문 해석 `Value.parseRaw(raw)` → `{ kind: 'empty'\|'number'\|'string'\|'formula', value }`. 숫자는 앞뒤 공백을 뺀 글자가 `/^[+-]?(\d+\.?\d*\|\.\d+)([eE][+-]?\d+)?$/` 에 맞을 때만(`12a` 는 문자열). 보이는 글자 `Value.display(v)`: 숫자는 `String(Number(n.toPrecision(15)))`, 참/거짓은 `TRUE`/`FALSE`, 오류는 그 글자, 빈 칸은 `''`. 정렬 종류 `Value.align(v)` 는 숫자만 `right`, 나머지 `left`. | G2·G10·AC5·AC21 을 한곳에서 정해 C10 Csv 와 C11 App 이 같은 글자를 쓰게 한다. |
| D5 | C4 Formula 공개 API: `parse(text)` → `{ ast, refs }` 또는 문법이 틀리면 `{ error: '#ERROR!' }`. `refs` 는 의존할 주소 문자열 목록(범위는 펼친 주소, 표 밖 참조와 한쪽 끝이라도 표 밖인 범위는 넣지 않음). `evaluate(ast, ctx)` → 칸 값(D3). `ctx.get(addr)` 이 칸 값을 준다. `shift(text, dCol, dRow)` → 옮긴 수식 원문. shift 는 토큰 단위로 옮기며, 옮긴 한 칸 참조가 표 밖이면 그 참조를 `#REF!` 토큰으로 바꾸고, 범위(참조 `:` 참조)는 옮긴 뒤 한쪽 끝이라도 표 밖이면 범위 전체를 `#REF!` 토큰 하나로 바꾼다(B3 의 `=SUM(A1:B2)` 를 B2 로 옮기면 `=SUM(#REF!)`, 값 `#REF!`). 토큰: 숫자, 큰따옴표 문자열(`""` 는 따옴표 하나), 참조(`$?[A-Za-z]+$?\d+`), `:`, 함수 이름+`(`, `,`, 연산자, 괄호, 오류 글자(`#REF!` 등 여섯 개). AST 노드: `num`, `str`, `err`, `ref`, `range`, `unary`, `binary`, `call`. | C5 Sheet 와 C8 Clipboard 가 함께 쓰는 계약이다. AC16 의 `=#REF!` 가 다시 읽혀 `#REF!` 값을 내려면 오류 글자가 토큰이어야 한다. |
| D6 | 우선순위는 낮은 것부터 비교(`= <> < > <= >=`) < `&` < `+ -` < `* /` < `^` < 단항 `- +`. 이항 연산은 모두 왼쪽부터 묶는다(`^` 포함). 단항은 `^` 보다 먼저 묶으므로 `=-2^2` 는 `(-2)^2 = 4`. 계산 결과가 `Infinity`/`NaN` 이면 `#VALUE!`, 나눗수가 0 이면 `#DIV/0!`. 비교하기 전에 빈 칸은 상대 종류의 값으로 바꾼다: 상대가 숫자면 0, 문자열이면 `""`, 참/거짓이면 FALSE, 둘 다 빈 칸이면 같다. 그래서 A1 이 빈 칸일 때 `=A1=0`, `=A1=""` 는 TRUE, `=A1<1` 은 TRUE 다. 그 밖에 종류가 다른 값의 비교는 Q1 의 가정을 따른다. | G6·AC9 을 그대로 옮긴 것이다. 재귀 하강 파서의 단계 순서로 구현한다. |
| D7 | 오류 전파 순서: 이항 연산은 왼쪽 피연산자 오류를 먼저, 그다음 오른쪽 오류를 돌려준다. 함수는 인자를 왼쪽부터 보고 처음 만난 오류를 돌려준다. 범위 안의 오류도 G4 대로 그대로 돌려준다. 표 밖 참조(`AA1`, `A101`)는 파싱에 성공하고 계산 때 `#REF!`. 범위도 한쪽 끝이라도 표 밖이면(`=SUM(A1:A101)`) 표 안으로 잘라 계산하지 않고 범위 전체를 `#REF!` 로 본다. 없는 함수는 파싱에 성공하고 계산 때 `#NAME?`. `IF` 는 조건을 먼저 계산하고 고른 쪽 인자만 계산한다(엑셀과 같음). | 여러 오류가 섞일 때 결과를 하나로 정해야 테스트 기대 값이 정해진다. IF 의 고르지 않은 쪽 오류는 퍼지지 않는다(가정, Q2 참고). |
| D8 | C3 Functions API: `Functions.call(name, kinds, evalArg)`. C4 는 어떤 함수든 인자를 미리 계산하지 않고, 인자 노드 종류 목록 `kinds`(`'range'`·`'ref'`·`'value'`)와 `evalArg(i)` 만 넘긴다. `evalArg(i)` 는 `range` 면 칸 값 배열(한쪽 끝이라도 표 밖인 범위면 배열이 아닌 `#REF!` 오류 값 하나), 나머지면 칸 값 하나를 돌려준다. 무엇을 얼마나 계산할지는 C3 이 혼자 정한다: 이름 확인(`#NAME?`) → 인자 수 확인(`#VALUE!`) → 함수마다 필요한 인자만 왼쪽부터 `evalArg` 로 계산하고 처음 만난 오류를 돌려준다(IF 는 조건과 고른 쪽만). C4 는 함수 이름을 보지 않는다. SUM·AVERAGE·MIN·MAX·COUNT 에서 `range` 와 `ref` 인자는 범위로 다뤄 그 안의 문자열·빈 칸·참/거짓을 건너뛰고, `value` 인자(직접 준 값·계산식)는 `Value.toNumber` 로 바꿔 문자열이면 `#VALUE!`(G8). 단위 테스트 기대 값: A1=1, A3=`x` 일 때 `=SUM(A1,A3)` → 1, `=COUNT(A3)` → 0, `=SUM(A1,"x")` → `#VALUE!`. ROUND·ABS 의 인자는 종류와 관계없이 `Value.toNumber` 로 바꾼다. ROUND 는 `x * 10^d` 를 `toPrecision(15)` 로 정리한 뒤 부호를 떼고 `Math.floor(\|y\| + 0.5)` 를 하고 부호를 다시 붙여 `10^d` 로 나눈다. | G8 의 "범위 안"과 "직접 준 인자"를 구별하려면 인자 노드 종류를 알아야 한다. 계산할 인자를 고르는 판단을 C3 한곳에 두어 IF 의 짧은 계산(D7)이 C4 에 따로 생기지 않게 한다. 칸 참조 인자를 범위처럼 다루는 것은 엑셀과 같다(Q6). ROUND 규칙은 G8 의 2.345 예를 지키는 방법이다. |
| D9 | C5 Sheet API: `Sheet.create()` → `{ setRaw(addr, raw) → 값이 바뀐 주소 목록, setMany([{addr, raw}]) → 같음, getRaw(addr), getValue(addr), getDisplay(addr), entries() → 원문이 있는 [addr, raw] 목록, loadAll(cellsMap), evalCount }`. `evalCount` 는 수식 계산 횟수 누적 값이고 테스트에서 읽는다. 다시 계산은 바뀐 칸들에서 역방향 그래프를 따라 기대는 칸 집합을 모으고, 그 부분 그래프에서 Tarjan 강한 연결 요소를 찾아 크기 2 이상이거나 자기 참조인 요소의 칸을 `#CIRC!` 로 두고, 나머지는 위상 순서로 한 번씩 계산한다. 순환 칸에 기대는 칸은 계산하면서 G4 로 `#CIRC!` 를 받는다. | AC15 의 "계산 횟수 확인"이 공개 계약이어야 한다. 순환 안의 칸과 순환 아래의 칸을 구별해야 IF 같은 경우에 값이 맞다(D7). 순환을 끊으면 같은 절차로 제 값이 돌아온다(G17). |
| D10 | C6 Selection 상태: `{ active: {col,row}, focus: {col,row} }`, 고른 범위는 두 칸이 이루는 사각형. `move(state, dir)` 는 범위를 활성 칸 하나로 접고 옮긴다(Enter=down, Shift+Enter=up, Tab=right, Shift+Tab=left 도 같은 함수). `extend(state, dir)` 는 `focus` 만 옮긴다. `extendTo(state, cell)` 은 Shift+클릭. `select(cell)`. `rangeText(state)` 는 한 칸이면 `A1`, 범위면 `A1:B3`. 모두 표 끝에서 멈춘다. | G11·AC3·AC4 를 DOM 없이 시험한다. |
| D11 | C7 History: `History.create(limit = 100)` → `{ push(step), undo() → step\|null, redo() → step\|null, canUndo, canRedo }`. 단계는 `[{ addr, before, after }]` 이고 before 와 after 가 모두 같으면 쌓지 않는다. C11 App 은 확정 한 번·지우기 한 번·붙여 넣기 한 번을 한 단계로 만들고, undo 는 `before` 를, redo 는 `after` 를 C5 `setMany` 로 넣는다. C8 Clipboard 는 `copy(getRaw, range)` → `{ rows, cols, origin, raws }`, `paste(clip, target)` → `[{ addr, raw }]` 를 돌려줄 뿐 표를 바꾸지 않는다. | 표를 바꾸는 길을 C11 App → C5 Sheet 하나로 모아 되돌리기·저장·화면 갱신이 늘 같이 일어나게 한다. |
| D12 | 기술 스택은 SPEC 작업 환경 그대로다: HTML·CSS·JavaScript(ES2020 브라우저 전역 스크립트), 프레임워크·번들러 없음, Node.js LTS 24.x 와 `node:test`(단위), `@playwright/test` 1.x 와 Chromium(e2e), 데이터는 localStorage, 서버 없음. 테스트 도구: `package.json` 의 scripts 는 SPEC 그대로(`test`, `test:coverage`, `e2e`), devDependency 는 `@playwright/test` 하나. `playwright.config.js` 는 맨 위에서 `process.env.PLAYWRIGHT_BROWSERS_PATH = '0'`, `testDir: 'e2e'`, Chromium 프로젝트 하나, 웹 서버 없음. e2e 는 `pathToFileURL(path.resolve('index.html')).href` 로 열고 시작할 때 localStorage 를 비운다. AC22 는 `page.on('request')` 로 `file:` 밖 요청을 센다. 키 조합은 `ControlOrMeta` 를 써서 맥과 다른 운영체제에서 같은 테스트가 돈다. | SPEC 검증 수단과 작업 환경을 그대로 따른다. C11 App 과 C12 Page 는 e2e 로만 확인한다(D2). |
| D13 | 화면: C11 App 은 `<table>` 하나에 2600개 `<td data-cell>` 를 처음 한 번 만들고, 이후에는 C5 가 돌려준 바뀐 주소의 칸만 글자와 정렬 클래스를 고친다. 사용자가 쓴 글자는 칸·이름 칸에는 `textContent` 로만, 수식 입력줄과 편집 상자에는 `value` 로만 넣는다. `innerHTML` 에는 사용자 글자를 넣지 않는다. 고치기는 `#cell-editor` 입력 상자 하나를 활성 칸 위에 겹쳐 쓴다. 고친 상태가 아닐 때도 포커스는 값이 빈 `#cell-editor` 에 두고 상자는 투명하게 숨긴다(칸을 클릭한 뒤에도 다시 이 상자로 포커스를 돌린다). 고친 상태가 아닐 때의 `keydown` 은 방향키·Enter·Tab·F2·Delete·Backspace·Ctrl/Cmd+C·V·Z·Y·Shift+Z 만 처리하고 `preventDefault` 한다. 그 밖의 Ctrl/Cmd 조합(새로 고침 등)은 브라우저에 맡긴다. 글자 입력은 `keydown` 으로 판정하지 않고, 고친 상태가 아닐 때 상자에 `compositionstart`(한글 IME) 나 `input` 이 오면 그때 고치기를 시작한다. 상자는 비어 있었으므로 친 글자(조합 중인 글자 포함)가 그대로 새 원문의 시작이 된다(G12, AC6). 그래서 Playwright `keyboard.type('이름')` 처럼 `keydown` 없이 오는 입력도 고치기를 시작한다. 고치는 중에는 상자를 보이고 `editing` 클래스를 붙이며, e2e 는 이 클래스로 고치는 중인지 본다(SPEC 고리 목록 밖에 이 설계가 더하는 고리다. 숨긴 상자도 포커스를 받으므로 보임 여부로는 가를 수 없다). 더블클릭·F2 는 상자 값을 원문으로 채우고 커서를 끝에 둔다. 수식 입력줄 `#formula-input` 은 활성 칸 원문을 보여 주고, 거기서 고치면 같은 확정 경로를 탄다. | 2600칸을 매번 다시 그리지 않아 빠르고, e2e 고리(`[data-cell]`, `#cell-editor`)를 지킨다. 한글 사용자가 쓰는 앱이라 IME 의 첫 글자가 `keydown` 에서 `Process` 로 와도 잃지 않아야 한다. 원문은 localStorage 에 남아 열 때마다 다시 그려지므로 HTML 로 해석하지 않는다. |
| D14 | 저장과 불러오기: C11 App 이 원문이 바뀌는 모든 경로(확정·지우기·붙여 넣기·되돌리기·다시 하기) 뒤에 `Storage.save(localStorage, sheet.entries())` 를 부른다. 열 때 `Storage.load(localStorage)` 결과를 C5 `loadAll` 로 넣고 전체를 다시 계산한다. CSV 는 C11 App 이 C5 `getDisplay` 로 보이는 값 맵을 만들어 `Csv.build(map)` 에 넘기고, 결과를 `Blob` + `<a download="sheet.csv">` 로 내려받는다. | G15·G16 을 따르고 C9·C10 을 순수하게 둔다(D2). |

## 위험

| 번호 | 위험 | 영향 | 대응 |
|---|---|---|---|
| R1 | `playwright.config.js` 안에서 넣은 `PLAYWRIGHT_BROWSERS_PATH` 가 브라우저 경로에 반영되지 않을 수 있다(SPEC G18, D12). | 중 | 반영되지 않으면 `PLAYWRIGHT_BROWSERS_PATH=0 npm run e2e` 로 실행한다. 브라우저 설치와 실행 확인은 mvp-builder 가 한다. |
| R2 | file:// 페이지에서 Blob URL 내려받기가 Playwright `download` 이벤트로 잡히지 않을 수 있다(C11, D14). | 중 | e2e `csv.spec.js` 는 `page.waitForEvent('download')` 로 받고 내용을 읽어 비교한다. 잡히지 않으면 원인을 열린 질문으로 올린다. CSV 내용 규칙은 C10 단위 테스트가 따로 지킨다. |
| R3 | 수식 옮기기를 정규식으로 하면 문자열 안의 `"A1"` 이나 함수 이름(`LOG10` 같은 꼴)까지 바뀐다(C4, C8). | 중 | D5 대로 토큰 단위로 옮기고, 문자열 토큰은 그대로 둔다. 단위 테스트에 `="A1"&A1` 꼴을 넣는다. |
| R4 | 넓은 범위(`SUM(A1:Z100)`)가 의존 간선 2600개를 만들고, 불러오기 때 전체 다시 계산이 느려질 수 있다(C5). | 하 | 표 크기가 2600칸으로 고정이라 간선 수에 상한이 있다. 다시 계산은 기대는 칸 집합 안에서 칸마다 한 번이다(D9). |
| R5 | 브라우저 기본 동작(Tab 의 포커스 이동, Ctrl+Z 의 입력 상자 되돌리기, F2, Backspace)과 앱 키 처리가 겹친다(C11). | 중 | 고친 상태가 아닐 때(포커스는 숨긴 `#cell-editor`, D13) 앱이 처리한 키는 `preventDefault` 해 상자에 글자나 상자 되돌리기가 생기지 않게 한다. 고치는 중에는 Enter·Tab·Esc 만 가로챈다(G12). e2e `keyboard.spec.js`, `edit.spec.js`, `undo.spec.js` 로 확인한다. |
| R6 | 오류가 여러 개 섞인 수식, IF 의 고르지 않은 쪽 오류, 숫자와 문자열 비교처럼 SPEC 이 정하지 않은 경우의 결과가 사람의 기대와 다를 수 있다(C3, C4, D7). | 중 | D7 로 순서를 정하고 열린 질문 Q1·Q2 로 올린다. 정한 규칙은 단위 테스트로 묶어 바꿀 때 바로 드러나게 한다. |
| R7 | `--experimental-test-coverage` 의 옵션 이름이나 출력이 Node 24 와 25 사이에서 달라질 수 있다(D12, SPEC G19). | 하 | SPEC 의 명령을 그대로 쓰고, 실패하면 Node 버전과 함께 보고한다. |
| R8 | 유효숫자 15자리 정리(D4)는 아주 크거나 작은 수를 `1e+21` 처럼 지수 꼴로 보인다(C2). | 하 | SPEC 은 그 밖의 서식이 없다고 했으므로 그대로 둔다. AC21 의 예만 단위 테스트로 지킨다. |

## 열린 질문

설계에서 새로 생긴 질문이다. SPEC 의 Q1~Q8 은 다시 적지 않는다.

| 번호 | 질문 |
|---|---|
| Q1 | 숫자와 문자열을 비교하면(`=1<"a"`, `="1"=1`) 어떻게 되어야 하는가? 이 설계는 엑셀처럼 숫자 < 문자열 < 참/거짓 순으로 보고, 같은 종류가 아니면 `=` 는 FALSE 로 둔다고 가정한다(D6, D7). 빈 칸은 이 규칙 전에 상대 종류의 값으로 바꾼다(D6). |
| Q2 | `IF` 의 고르지 않은 쪽에 오류가 있을 때(`=IF(TRUE,1,1/0)`) 오류를 퍼뜨리지 않는 엑셀 방식으로 정했다(D7). G4 를 글자 그대로 따라 퍼뜨려야 하는가? |
| Q3 | 수식 문법 오류 `#ERROR!` 칸을 참조하는 칸도 `#ERROR!` 를 받도록(G4 와 같게) 정했다(D3, D7). 다른 결과를 원하는가? |
| Q4 | 참/거짓 칸과 오류 값 칸의 정렬은 G10 이 정하지 않았다. 이 설계는 둘 다 왼쪽으로 둔다(D4). 엑셀처럼 가운데로 둘 것인가? |
| Q5 | 수식이 아닌 칸에 사용자가 `#REF!` 처럼 오류 글자를 직접 치면 문자열로 둔다(G2). 오류 값으로 읽어야 하는가? |
| Q6 | SUM·AVERAGE·MIN·MAX·COUNT 에 칸 하나를 참조로 준 인자(`=SUM(A1,A3)`)는 G8 의 "직접 준 인자" 가 아니라 범위처럼 보고, 그 칸의 문자열·빈 칸·참/거짓을 건너뛴다고 가정한다(엑셀과 같음, D8). 문자열 칸을 `#VALUE!` 로 해야 하는가? |

## 변경: 음수 칸 글자를 빨간색으로 보인다

### 개요

`change.md` 의 요청이다. 칸의 값이 숫자이고 0보다 작으면 글자를 빨간색(`#c00`)으로 보인다. 원문이 숫자든 수식 결과든 같고, 0(`-0` 포함)·양수·문자열·참/거짓·오류·빈 칸은 지금처럼 둔다(SPEC G20, AC23). 판정 규칙은 C2 Value 의 순수 함수 `isNegative` 하나에 두고, C11 App 이 이미 있는 칸 갱신 경로(`renderCell`)에서 `negative` 클래스를 붙이고 떼며, C12 Page 의 CSS 가 색을 칠한다. 새 구성 요소와 새 의존은 없다. C5 Sheet·C9 Storage·C10 Csv 와 저장 형식·CSV 는 바뀌지 않는다.

### 기존 코드 파악

- `src/value.js` 는 칸 값(D3)을 받는 표시 규칙으로 `display(v)`, `align(v)` 를 이미 내보낸다(`align` 은 `v.type === 'number' ? 'right' : 'left'`). 새 규칙도 같은 꼴(칸 값 하나 → 결과)로 더하고 끝의 반환 객체에 넣는다.
- `src/app.js` 의 `renderCell(addr)` 이 칸 글자와 정렬 클래스(`right`/`left`)를 고치는 유일한 곳이다. 부르는 곳은 두 군데다: 원문이 바뀐 뒤 C5 가 돌려준 "값이 바뀐 주소" 목록(`changed.forEach(renderCell)`, 확정·지우기·붙여 넣기·되돌리기·다시 하기가 모두 지난다)과, 열 때 `loadAll` 뒤 전체 칸. 그래서 다시 계산으로 부호가 바뀐 기대는 칸도 이 경로로 다시 그려진다.
- `style.css` 는 `.grid td.right/.left`(정렬), `.grid td.selected`(배경만), `.grid td.active`(outline 만)를 쓴다. 칸 글자색을 정한 규칙은 없으므로 `negative` 색과 겹치지 않는다. `#cell-editor` 는 칸과 다른 `<input>` 이라 칸 클래스의 영향을 받지 않는다.
- 단위 테스트는 `tests/value.test.js` 에 `align` 시험이 있고, e2e 는 `e2e/<기능>.spec.js` 꼴이다. SPEC 이 새 파일 `e2e/negative.spec.js` 를 정했다.

### 구성 요소

새 구성 요소는 없다. 이번 요청이 고치는 기존 구성 요소만 적는다(위 구성 요소 표의 해당 줄도 함께 고쳤다).

| 번호 | 이름 | 책임 | 의존 | 맡는 성공 기준 |
|---|---|---|---|---|
| C2 | Value (`src/value.js`) | 음수 판정 `Value.isNegative(v)` 를 더한다(D15). | 없음 | AC23 |
| C11 | App (`src/app.js`) | `renderCell` 에서 `negative` 클래스를 `isNegative` 결과대로 붙이고 뗀다(D16). | C1, C2, C5, C6, C7, C8, C9, C10 | AC23 |
| C12 | Page (`style.css`) | `.grid td.negative { color: #c00; }` 를 더한다(D17). | C11 | AC23 |

### 아키텍처 다이어그램

의존은 바뀌지 않는다. 이번 요청이 지나는 길만 그린다.

```text
Arrow "A --> B" or a line ending in "v" means A depends on B.
Only the path touched by this change is drawn; all other
edges are unchanged (see the complete edge list above).

L5   [C12 Page]      style: .grid td.negative { color: #c00 }
         |
         v
L4   [C11 App]       renderCell: toggle 'negative'
         |
         v
L0   [C2 Value]      isNegative(v)

Edge list (this change):
  C12 --> C11
  C11 --> C2
  C2  --> (none)
```

### 아키텍처 결정

| 번호 | 결정 | 이유 |
|---|---|---|
| D15 | C2 Value API: `Value.isNegative(v)` → `v.type === 'number' && v.value < 0`. 칸 값(D3)을 받고 보이는 글자는 보지 않는다. `-0 < 0` 은 거짓이므로 `-0` 은 따로 다루지 않아도 거짓이다. D6 이 `Infinity`/`NaN` 을 `#VALUE!` 로 바꾸므로 숫자 값에 `NaN` 은 오지 않는다. 문자열 `-abc`·참/거짓·오류·빈 칸은 종류에서 걸러져 거짓이다. 단위 테스트(`tests/value.test.js`)는 AC23 의 값 목록을 그대로 쓴다: 참 -3, -0.5 / 거짓 0, -0, 5, 문자열 `-abc`, TRUE·FALSE, `#DIV/0!`, 빈 칸. | G20 이 판정을 숫자 값으로 하라고 정했고, `align` 과 같은 자리에 두어 C11 에 규칙을 두지 않는다(D2). DOM 없이 커버리지 대상에 들어간다. |
| D16 | C11 App 의 `renderCell` 은 정렬 클래스를 고친 바로 뒤에 `td.classList.toggle('negative', Value.isNegative(value))` 를 부른다. 새 갱신 경로는 만들지 않는다. 부호가 바뀌는 모든 경우(직접 고치기, 기대는 칸 다시 계산, 붙여 넣기, 되돌리기·다시 하기, 새로 고침 뒤 복원)는 이미 `renderCell` 을 지난다(기존 코드 파악). `active`·`selected` 클래스는 건드리지 않는다. | 클래스 붙이기와 떼기를 한 줄에서 해 값이 양수로 돌아올 때 클래스가 남는 일을 막는다. 바뀐 칸만 다시 그리는 D13 을 그대로 지킨다. |
| D17 | C12 `style.css` 에 `.grid td.negative { color: #c00; }` 한 규칙을 더한다. `.selected`(배경)·`.active`(outline) 규칙은 색을 정하지 않으므로 활성·고른 칸에서도 빨간 글자가 남는다. `.cell-editor` 의 색은 바꾸지 않는다. e2e 는 `[data-cell].negative` 와 `getComputedStyle(칸).color === 'rgb(204, 0, 0)'` 을 함께 본다. | SPEC G20·AC23 이 색 값과 e2e 고리를 정했다. 인라인 스타일 대신 클래스로 두어 e2e 가 클래스와 계산된 색을 따로 확인할 수 있다. |
| D18 | e2e `e2e/negative.spec.js` 는 기존 e2e 와 같이 file:// 로 열고 localStorage 를 비운 뒤(D12) AC23 의 칸 값을 넣고 확인한다: A1~A7 의 클래스와 색, B1=`=A4-10` 이 빨갛다가 A4=`20` 뒤 빨갛지 않음(다시 계산 경로), A1=`3` 으로 고친 뒤 빨갛지 않음(클래스 떼기). | AC23 의 확인 방법을 그대로 옮긴다. |

### 위험

| 번호 | 위험 | 영향 | 대응 |
|---|---|---|---|
| R9 | 앞으로 `renderCell` 을 거치지 않고 칸 글자를 고치는 경로가 생기면 `negative` 클래스가 값과 어긋난다(C11, D16). | 하 | 지금은 모든 경로가 `renderCell` 을 지난다. e2e 에 다시 계산(B1)과 고쳐서 양수로 바꾸기(A1)를 넣어 어긋남을 잡는다(D18). |
| R10 | 브라우저가 `#c00` 을 다른 꼴로 계산해 e2e 의 `rgb(204, 0, 0)` 비교가 틀릴 수 있다(C12, D17). | 하 | Chromium 은 `getComputedStyle().color` 를 `rgb(r, g, b)` 꼴로 돌려준다. 다르면 e2e 실패 메시지로 바로 드러난다. |
| R11 | 아주 작은 음수(`=-1E-20`)도 빨갛게 보인다. 판정을 값으로 하기 때문이다(C2, D15). | 하 | SPEC Q10 이 이 동작을 정했다. 유효숫자 15자리 표시(D4)는 0이 아닌 수를 `0` 으로 보이지 않으므로 빨간 `0` 은 생기지 않는다. |

### 열린 질문

새로 생긴 설계 질문은 없다. 색 값과 아주 작은 음수 처리는 SPEC 의 Q9·Q10 에 있고, 이 설계는 SPEC 의 가정(`#c00`, 값으로 판정)을 따른다.

| 번호 | 질문 |
|---|---|
| Q7 | 없음. SPEC Q9·Q10 의 답이 바뀌면 D15·D17 만 고치면 된다. |
