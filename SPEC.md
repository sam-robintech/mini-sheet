# 스펙: 미니 스프레드시트

## 목표

### 가정

아이디어(idea.md)에 적히지 않아 정한 것이다. 바꿀 것이 있으면 열린 질문에서 답한다.

- G1  표는 A~Z 26열, 1~100행으로 고정한다. 칸 주소는 열 글자 + 행 번호(A1)이고 대소문자를 가리지 않는다(a1 = A1).
- G2  칸에 넣은 글자(원문)가 `=` 로 시작하면 수식, 숫자로 읽히면(`12`, `-3.5`, `1e3`) 숫자, 그 밖은 문자열이다. 빈 글자를 넣으면 빈 칸이 된다.
- G3  오류 값은 다음 다섯 개다. 0으로 나누기 `#DIV/0!`, 없는 함수 `#NAME?`, 잘못된 참조(Z 뒤 열, 100 뒤 행, 붙여 넣다 표 밖으로 밀린 참조) `#REF!`, 계산할 수 없는 값(숫자 자리에 문자열, 함수 인자 개수가 틀림) `#VALUE!`, 순환 참조 `#CIRC!`. 엑셀에는 순환 참조 오류 값이 없으므로 `#CIRC!` 를 새로 둔다. 수식 문법이 틀리면(`=1+`, `=(1`) `#ERROR!` 를 보인다.
- G4  오류는 퍼진다. 오류 값 칸을 참조하거나 범위에 오류 값이 있으면 그 수식도 같은 오류 값이 된다.
- G5  빈 칸은 계산에서 숫자로는 0, 문자열 잇기에서는 빈 문자열이다.
- G6  연산자 우선순위는 엑셀과 같다. 높은 것부터 단항 `-`·`+`, `^`, `*`·`/`, `+`·`-`, `&`, 비교. 그래서 `=-2^2` 는 4 다. `^` 는 왼쪽부터 묶는다(`=2^3^2` 은 64).
- G7  수식 안의 문자열은 큰따옴표로 쓴다(`="합계: "&A1`). 비교 결과는 참/거짓 값이고 칸에 `TRUE`, `FALSE` 로 보인다. 숫자 자리에서 참은 1, 거짓은 0 이다. 문자열 비교는 엑셀처럼 대소문자를 가리지 않는다.
- G8  함수 규칙. 함수 이름은 대소문자를 가리지 않는다.
  - SUM, AVERAGE, MIN, MAX, COUNT 는 인자를 여러 개 받는다. 범위 안의 문자열·빈 칸·참/거짓은 건너뛴다. 인자로 직접 준 문자열은 `#VALUE!` 다.
  - AVERAGE 에 숫자가 하나도 없으면 `#DIV/0!`, MIN·MAX 에 숫자가 하나도 없으면 0, COUNT 는 숫자 칸 수.
  - IF(조건, 참일 때, 거짓일 때) 에서 세 번째 인자는 빼도 되고 빼면 `FALSE` 다. 조건이 숫자면 0이 아닐 때 참, 문자열이면 `#VALUE!`.
  - ROUND(수, 자릿수) 는 0.5 를 0에서 먼 쪽으로 올린다(`=ROUND(2.5,0)` 은 3, `=ROUND(-2.5,0)` 은 -3). 부동소수 잡음 때문에 `Math.round(x*100)/100` 처럼 하면 `=ROUND(2.345,2)` 가 2.34 가 되므로, 자릿수를 옮긴 값을 유효숫자 15자리로 정리한 뒤 반올림한다. ABS(수) 는 절댓값.
- G9  범위는 같은 행·열 순서를 묻지 않는다(`B5:A1` = `A1:B5`). 절대 참조는 `$A$1`, `$A1`, `A$1` 세 꼴을 모두 쓴다.
- G10 숫자는 부동소수 잡음을 없애려고 유효숫자 15자리로 반올림해 보인다(`=0.1+0.2` 는 `0.3`). 숫자는 오른쪽, 문자열은 왼쪽으로 붙인다. 음수 숫자의 빨간 글자(G20) 밖의 서식은 없다.
- G11 칸 고르기
  - 클릭하면 그 칸 하나를 고른다. 고른 칸 가운데 하나가 활성 칸이고, 수식 입력줄에 활성 칸의 주소와 원문이 보인다.
  - 방향키는 활성 칸을 한 칸 옮긴다. 표 끝에서는 더 가지 않는다.
  - Shift+방향키, Shift+클릭은 활성 칸을 고정점으로 두고 범위를 넓히거나 줄인다. 이름 칸에는 범위 주소(`A1:B3`)가 보인다.
  - Enter 는 아래, Shift+Enter 는 위, Tab 은 오른쪽, Shift+Tab 은 왼쪽 칸으로 옮긴다. 표 끝에서는 그 자리에 머문다.
- G12 칸 고치기
  - 고친 상태가 아닐 때 글자 키를 누르면 활성 칸의 내용을 지우고 그 글자부터 새로 입력한다.
  - 더블클릭이나 F2 는 기존 원문을 그대로 두고 커서를 끝에 둔 채 고친다.
  - 고치는 중 Enter·Tab(Shift 포함)은 확정하고 G11 대로 옮긴다. Esc 는 고치기 전 내용으로 되돌리고 고치기를 끝낸다. 고치는 중 방향키는 글자 커서만 옮긴다(수식에 참조를 클릭으로 넣는 기능은 없다).
  - 수식 입력줄을 클릭해 고쳐도 되고, 거기서 Enter 는 확정, Esc 는 취소다.
  - Delete 와 Backspace 는 고친 상태가 아닐 때 고른 범위의 모든 칸을 비운다.
- G13 복사·붙여 넣기는 페이지 안의 클립보드를 쓴다. Ctrl+C(맥은 Cmd+C 도)는 고른 범위의 원문을 기억하고, Ctrl+V 는 활성 칸을 왼쪽 위로 해 같은 크기로 붙인다. 표 밖으로 넘치는 부분은 버린다. 수식의 상대 참조는 원래 자리에서 옮긴 행·열 수만큼 바뀌고 `$` 가 붙은 부분은 그대로다. 바뀐 참조가 표 밖이면 그 참조는 `#REF!` 가 되어 수식이 `#REF!` 값을 낸다. 운영체제 클립보드와 주고받는 것은 이번에 하지 않는다.
- G14 되돌리기. 확정 한 번, 지우기 한 번, 붙여 넣기 한 번이 각각 한 단계다. Ctrl+Z 로 되돌리고 Ctrl+Y(또는 Ctrl+Shift+Z)로 다시 한다. 새로 바꾸면 다시 하기 목록은 비운다. 단계는 최근 100개까지 기억하고, 새로 고치면 되돌리기 기록은 없어진다. 원문이 바뀌지 않는 확정은 단계로 치지 않는다.
- G15 저장. 원문이 바뀔 때마다 localStorage 키 `mini-sheet:v1` 에 `{"version":1,"cells":{"A1":"원문",...}}` 꼴로 쓴다. 빈 칸은 적지 않는다. 페이지를 열 때 이 키를 읽어 표를 되살리고 모든 수식을 다시 계산한다. 키의 값을 읽을 수 없으면 빈 표로 연다.
- G16 CSV 내려받기. 화면 위쪽의 "CSV 내려받기" 단추를 누르면 `sheet.csv` 를 내려받는다. 내용은 칸에 보이는 값(수식은 계산 결과)이고, A1 부터 값이 있는 마지막 행·열까지다. 칸 사이는 쉼표, 줄 끝은 CRLF, 쉼표·큰따옴표·줄바꿈이 든 값은 큰따옴표로 감싸고 안의 큰따옴표는 두 번 쓴다. 엑셀에서 한글이 깨지지 않게 파일 맨 앞에 UTF-8 BOM 을 붙인다. 빈 표면 BOM 만 있는 파일이다.
- G17 다시 계산은 바뀐 칸에 기대는 칸만, 기대는 순서대로 한다. 순환에 든 칸은 모두 `#CIRC!` 이고, 순환을 끊으면 다시 제 값으로 돌아온다.
- G18 e2e 스크립트는 E5 대로 `playwright test` 이고, 프로젝트 안 브라우저를 쓰도록 `playwright.config.js` 맨 위에서 `process.env.PLAYWRIGHT_BROWSERS_PATH = '0'` 을 넣는다. 이렇게 넣은 환경 변수가 브라우저 경로에 반영되는지는 이 스펙을 쓸 때 확인하지 못했다(의존성이 아직 설치되지 않음). 반영되지 않으면 `PLAYWRIGHT_BROWSERS_PATH=0 npm run e2e` 로 실행한다.
- G19 이 기계의 Node.js 는 v25.9.0 이다. 스펙은 Node.js LTS 24.x 를 기준으로 하고, 쓰는 기능(`node:test`, 커버리지 옵션)은 두 버전에 모두 있다.
- G20 음수 빨간 글자(change.md). 칸의 값이 숫자이고 0보다 작으면 칸에 `negative` 클래스를 붙이고 글자를 빨간색(`#ff0000`, 계산된 색 `rgb(255, 0, 0)`)으로 보인다. 숫자를 직접 넣은 칸(`-3`)과 수식의 계산 결과가 음수인 칸(`=1-5`)이 모두 해당한다.
  - 0 과 양수, 문자열(`="-3"` 처럼 `-` 로 시작하는 문자열 포함), 참/거짓, 오류 값, 빈 칸은 지금처럼 기본 글자색이다.
  - `-0` 은 0 으로 보고 빨갛게 하지 않는다(`=-0` 은 `0` 으로 보인다). 보이는 글자가 아니라 계산된 숫자 값으로 판정하므로, 아주 작은 음수(`=-1e-20`)도 빨갛다.
  - 칸의 값이 바뀌면(직접 고치기, 기대는 칸이 바뀌어 다시 계산, 지우기, 붙여 넣기, 되돌리기, 새로 고침 뒤 복원) 빨간색도 새 값에 맞게 붙거나 없어진다.
  - 활성 칸·고른 범위로 표시돼도 빨간 글자는 그대로다. 고치는 중의 입력 상자(`#cell-editor`)와 수식 입력줄, CSV 내용에는 색이 없다.
  - 음수 판정은 규칙 모듈 `src/value.js` 의 함수로 두고, `src/app.js` 는 그 결과로 클래스만 붙인다.

### 목적

엑셀을 설치하지 않고 브라우저에서 바로 여는 작은 계산표를 만든다. 칸에 숫자와 수식을 넣고, 값이 바뀌면 기대는 칸이 저절로 다시 계산되며, 닫았다 열어도 내용이 남고, CSV 로 꺼낼 수 있다.

쓰는 사람은 간단한 계산(가계부, 점수 합계, 단가×수량)을 표로 하려는 한 사람이다. 엑셀의 기본 키 조작에 익숙하다고 본다.

### 범위 밖

- 행·열 삽입과 삭제
- 글자 서식(굵게, 음수 빨간 글자(G20) 밖의 색, 숫자 서식, 열 너비 조절)
- 여러 시트
- 차트
- 위 8개 밖의 함수, 이름 정의, 다른 파일 참조
- 운영체제 클립보드와 주고받는 복사·붙여 넣기, CSV 가져오기
- 채우기 핸들(끌어서 채우기), 정렬, 찾기
- 여러 사람이 함께 고치기, 서버 저장, 로그인
- 모바일 터치 조작

### 성공 기준

| 번호 | 조건 | 확인 방법 |
|---|---|---|
| AC1 | index.html 을 file:// 로 열면 A~Z 열 머리글, 1~100 행 머리글과 2600개 칸이 보이고, 수식 입력줄에 `A1` 과 빈 원문이 보인다. | e2e `e2e/grid.spec.js` |
| AC2 | 칸을 클릭하면 그 칸이 활성 칸이 되고 이름 칸에 주소, 수식 입력줄에 원문(수식이면 `=` 로 시작하는 글자)이 보인다. | e2e `e2e/grid.spec.js` |
| AC3 | 방향키·Enter·Shift+Enter·Tab·Shift+Tab 이 G11 대로 활성 칸을 옮기고, A1 에서 위·왼쪽, Z100 에서 아래·오른쪽으로는 움직이지 않는다. | 단위 `tests/selection.test.js`(이동 계산), e2e `e2e/keyboard.spec.js` |
| AC4 | B2 에서 Shift+→ 두 번, Shift+↓ 한 번이면 고른 범위가 B2:D3 이고, B2 에서 Shift+클릭 D3 도 같다. | 단위 `tests/selection.test.js`, e2e `e2e/keyboard.spec.js` |
| AC5 | 원문 글자가 G2 대로 숫자·문자열·수식·빈 칸으로 나뉜다(`12`→숫자 12, `1e3`→1000, `12a`→문자열, `=1`→수식, ``→빈 칸). | 단위 `tests/value.test.js` |
| AC6 | 활성 칸에서 `5` 를 치고 Enter 하면 그 칸은 5, 활성 칸은 한 칸 아래다. 내용이 있는 칸에서 글자를 치면 기존 내용 대신 새 글자로 시작한다. | e2e `e2e/edit.spec.js` |
| AC7 | 더블클릭과 F2 는 기존 원문을 고친 상태로 열고, Esc 는 고치기 전 내용으로 되돌린다. 수식 입력줄에서 고쳐 Enter 해도 칸이 바뀐다. | e2e `e2e/edit.spec.js` |
| AC8 | A1:B2 를 고르고 Delete 를 누르면 네 칸이 모두 빈 칸이 되고, 기대던 수식이 다시 계산된다. | e2e `e2e/edit.spec.js` |
| AC9 | 사칙연산·거듭제곱·괄호·단항 부호가 G6 우선순위대로 계산된다(`=1+2*3`→7, `=(1+2)*3`→9, `=2^3^2`→64, `=-2^2`→4, `=10/4`→2.5). | 단위 `tests/formula.test.js` |
| AC10 | 비교 여섯 개와 `&` 가 동작한다(`=1<2`→TRUE, `=1<>1`→FALSE, `=2>=2`→TRUE, `="a"&1+1`→`a2`, `="A"="a"`→TRUE). | 단위 `tests/formula.test.js` |
| AC11 | 칸 참조·범위·절대 참조가 값을 읽는다(A1=2, B1=3 일 때 `=A1*B1`→6, `=SUM(A1:B1)`→5, `=$A$1+B$1`→5, `=SUM(B1:A1)`→5). 빈 칸 참조는 0 이다. | 단위 `tests/sheet.test.js` |
| AC12 | 함수 8개가 G8 대로 계산된다(A1:A4 = 1, 2, `x`, 빈 칸일 때 SUM→3, AVERAGE→1.5, MIN→1, MAX→2, COUNT→2, `=IF(A1>0,"양","음")`→`양`, `=ROUND(2.345,2)`→2.35, `=ROUND(-2.5,0)`→-3, `=ABS(-4)`→4). 함수 이름은 소문자로 써도 된다. | 단위 `tests/functions.test.js` |
| AC13 | 오류 값이 G3·G4 대로 나온다(`=1/0`→`#DIV/0!`, `=FOO(1)`→`#NAME?`, `=AA1`→`#REF!`, `=A101`→`#REF!`, `="a"+1`→`#VALUE!`, `=ABS(1,2)`→`#VALUE!`, `=1+`→`#ERROR!`, A1=`=1/0` 일 때 `=A1+1`→`#DIV/0!`). | 단위 `tests/errors.test.js` |
| AC14 | A1=`=B1`, B1=`=A1` 이면 두 칸 모두 `#CIRC!`, 자기 참조 `=C1+1`(C1 안)도 `#CIRC!` 이다. B1 을 `5` 로 바꾸면 A1 은 5 가 된다. | 단위 `tests/sheet.test.js` |
| AC15 | A1=1, B1=`=A1*2`, C1=`=B1+1` 에서 A1 을 10 으로 바꾸면 B1=20, C1=21 이 된다. 바뀐 칸에 기대지 않는 수식은 다시 계산하지 않는다. | 단위 `tests/sheet.test.js`(계산 횟수 확인), e2e `e2e/edit.spec.js`(화면 값) |
| AC16 | 수식을 옮기면 상대 참조는 옮긴 만큼, `$` 부분은 그대로 바뀐다(C1 의 `=A1+$B$1+$A2+B$2` 를 D3 으로 옮기면 `=B3+$B$1+$A4+C$2`). 표 밖으로 밀린 참조는 `#REF!` 가 된다(B2 의 `=A1` 을 A1 로 옮기면 `=#REF!`, 값 `#REF!`). | 단위 `tests/clipboard.test.js` |
| AC17 | A1:B2 를 Ctrl+C 하고 D5 에서 Ctrl+V 하면 D5:E6 에 원문이 붙고 수식 참조가 AC16 대로 바뀐다. Z100 에 붙이면 표 밖은 버린다. | 단위 `tests/clipboard.test.js`, e2e `e2e/clipboard.spec.js` |
| AC18 | 확정·지우기·붙여 넣기를 한 뒤 Ctrl+Z 를 한 번 누를 때마다 한 단계씩 되돌아가고, Ctrl+Y 로 다시 된다. 되돌린 뒤 새로 바꾸면 Ctrl+Y 는 아무 일도 하지 않는다. 101번 바꾸면 처음 한 단계는 되돌릴 수 없다. | 단위 `tests/history.test.js`, e2e `e2e/undo.spec.js` |
| AC19 | 값과 수식을 넣고 페이지를 새로 고치면 같은 원문과 같은 계산 값이 보인다. localStorage 의 `mini-sheet:v1` 이 깨진 JSON 이면 오류 없이 빈 표로 열린다. | 단위 `tests/storage.test.js`(직렬화·복원), e2e `e2e/storage.spec.js` |
| AC20 | A1=`이름`, B1=`=1+1`, A2=`a,"b"`, B3=`x` 인 표의 CSV 는 BOM + `이름,2\r\n"a,""b""",\r\n,x\r\n` 이다. "CSV 내려받기" 단추를 누르면 이 내용의 `sheet.csv` 가 내려받아진다. | 단위 `tests/csv.test.js`, e2e `e2e/csv.spec.js` |
| AC21 | 숫자가 G10 대로 보인다(`=0.1+0.2`→`0.3`, `=1/3`→`0.333333333333333`). 숫자 칸은 오른쪽, 문자열 칸은 왼쪽 정렬이다. | 단위 `tests/value.test.js`(표시 글자), e2e `e2e/grid.spec.js`(정렬) |
| AC22 | 페이지는 외부 네트워크 요청 없이 뜬다(file:// 밖의 요청이 0건). | e2e `e2e/grid.spec.js`(요청 감시) |
| AC23 | 값이 음수인 숫자 칸은 G20 대로 빨간 글자다. A1=`-3`, A2=`=1-5`, A3=`=-1e-20` 은 `negative` 클래스가 있고 글자색이 `rgb(255, 0, 0)` 이다. A4=`0`, A5=`5`, A6=`=-0`, A7=`abc`, A8=`="-3"`, A9=`=1<2`, A10=`=1/0`, 빈 칸은 `negative` 클래스가 없고 글자색이 `rgb(255, 0, 0)` 이 아니다. B1=`=C1-1` 에서 C1 을 `5` 로 바꾸면 B1 의 빨간색이 없어지고, 다시 `0` 으로 바꾸면 빨개진다. A1 을 활성 칸으로 골라도 빨간 글자이고, 새로 고친 뒤에도 A1, A2 는 빨갛다. | 단위 `tests/value.test.js`(음수 판정: 숫자 -3·-1e-20 은 참, 0·-0·5·문자열 `-3`·참/거짓·오류 값·빈 칸은 거짓), e2e `e2e/negative.spec.js`(클래스와 계산된 글자색, 다시 계산, 활성 칸, 새로 고침) |

### 열린 질문

- Q1  순환 참조 오류 값을 `#CIRC!` 로 정했다. 엑셀처럼 경고 후 0을 보이길 원하면 바꾼다.
- Q2  수식 문법 오류는 엑셀처럼 입력을 막지 않고 `#ERROR!` 로 보이게 했다. 입력을 막는 쪽을 원하는가?
- Q3  CSV 에 계산 값을 쓴다. 수식 원문을 쓰는 선택지가 필요한가? BOM 을 빼야 하는 쓰임이 있는가?
- Q4  복사·붙여 넣기를 페이지 안에서만 한다. 엑셀·다른 탭과 주고받아야 하는가?
- Q5  되돌리기 기록을 새로 고침 뒤에도 남겨야 하는가? 지금은 남기지 않는다.
- Q6  고치는 중에 칸을 클릭하거나 방향키로 수식에 참조를 넣는 기능(엑셀의 참조 고르기)은 넣지 않았다. 필요한가?
- Q7  스펙 작성 기준(spec-standard.md)에 커버리지 목표와 린트 기준이 없다. 이 스펙은 규칙 모듈 줄 커버리지 90%를 목표로 하고 린트는 두지 않았다. 기준을 정해 주면 spec-standard.md 에 더한다.
- Q8  `TRUE`·`FALSE` 를 수식 안의 글자 상수로 쓰는 것과, 칸에 `TRUE` 를 쳤을 때 참/거짓 값으로 읽는 것은 넣지 않았다(문자열로 읽는다). 필요한가?
- Q9  음수 빨간색을 `#ff0000` 으로 정했다(change.md 에 색값이 없다). 활성 칸·고른 범위 배경 위에서 읽기 어려우면 다른 빨강(예: `#c00000`)을 원하는가?
- Q10 `-0` 은 빨갛게 하지 않고, 아주 작은 음수(`=-1e-20`)는 빨갛게 했다. 엑셀처럼 음수에 괄호를 씌우거나 `-` 를 빼는 표시는 넣지 않았다(색만 바꾼다). 다른 쪽을 원하는가?

## 검증 수단

명령(프로젝트 루트에서 실행):

| 할 일 | 명령 |
|---|---|
| 의존성 설치 | `npm install` |
| 브라우저 설치(mvp-builder 가 한다) | `PLAYWRIGHT_BROWSERS_PATH=0 npx playwright install chromium` |
| 단위 테스트 | `npm test` (= `node --test`) |
| 단위 테스트 + 커버리지 | `npm run test:coverage` (= `node --test --experimental-test-coverage --test-coverage-include='src/**' --test-coverage-exclude='src/app.js' --test-coverage-lines=90`) |
| e2e 테스트 | `npm run e2e` (= `playwright test`) |
| e2e 한 파일 | `npm run e2e -- e2e/edit.spec.js` |
| 실행 | 브라우저에서 `index.html` 을 연다(`open index.html`). 빌드는 없다. |

테스트 도구와 위치:

- 단위 테스트: Node.js 내장 테스트 러너(`node:test`, `node:assert/strict`). `tests/*.test.js`. 규칙 파일을 `require('../src/xxx.js')` 로 읽는다. DOM 과 localStorage 없이 돈다(저장은 저장소 객체를 넘겨 받는 함수로 만들어 가짜 객체로 시험한다).
- e2e 테스트: `@playwright/test`, Chromium 하나. `e2e/*.spec.js`. `playwright.config.js` 는 `testDir: 'e2e'`, 웹 서버 없음, 맨 위에서 `process.env.PLAYWRIGHT_BROWSERS_PATH = '0'` 을 넣어 프로젝트 안 브라우저를 쓴다(확인하지 못한 가정, G18). 각 테스트는 `pathToFileURL(path.resolve('index.html')).href` 로 페이지를 열고, 시작할 때 localStorage 를 비운다.
- `node --test` 의 기본 파일 패턴은 `*.test.js` 만 잡으므로 `e2e/*.spec.js` 는 단위 테스트에 섞이지 않는다.

테스트마다 확인하는 것:

- 단위: 원문 해석, 주소 해석, 수식 토큰·구문 분석·계산, 함수, 오류 값, 의존 그래프와 다시 계산 순서, 순환 찾기, 참조 옮기기, 선택 이동 계산, 되돌리기 기록, 저장 직렬화·복원, CSV 만들기. 화면 없이 입력과 출력만 본다.
- 통합: 따로 두지 않는다. `tests/sheet.test.js` 가 주소·수식·계산·그래프를 묶은 표 모듈을 통째로 시험해 통합 테스트 몫을 한다.
- e2e: 실제 브라우저에서 클릭·키 입력이 화면 값으로 이어지는지, 새로 고침 뒤 남는지, 파일이 내려받아지는지 본다. 계산 규칙의 세부는 단위 테스트에 맡긴다.

커버리지 목표: `src/` 의 규칙 모듈(`src/app.js` 제외) 줄 커버리지 90% 이상. `npm run test:coverage` 가 90% 밑이면 실패한다. `src/app.js` 는 e2e 로 확인한다.

e2e 가 화면을 찾는 고리(구현이 지킨다):

- 칸: `[data-cell="A1"]`. 보이는 값이 글자 내용이다. 오류 값도 그대로 보인다.
- 활성 칸: `[data-cell].active`, 고른 범위의 칸: `[data-cell].selected`.
- 이름 칸: `#name-box`, 수식 입력줄: `#formula-input`.
- 고치는 중의 입력 상자: `#cell-editor`.
- CSV 단추: `#download-csv`.
- 음수 숫자 칸: `[data-cell].negative`(G20). e2e 는 클래스와 함께 `getComputedStyle(td).color` 가 `rgb(255, 0, 0)` 인지 본다.

성공 기준마다 확인 방법은 성공 기준 표의 "확인 방법" 열에 있다. 모든 AC 에 단위 테스트나 e2e 테스트가 하나 이상 있다.

## 행동 정책

### 항상

- 작업을 끝내기 전에 `npm test` 를 돌리고 모두 통과하는지 본다. e2e 를 건드렸고 브라우저가 있으면 `npm run e2e` 도 돌린다.
- 계산·상태 변화·변환 규칙은 `src/` 의 규칙 모듈에 두고, `src/app.js` 에는 DOM 연결만 둔다. 규칙을 고치면 단위 테스트부터 고친다.
- 규칙 파일은 끝에서 `if (typeof module !== 'undefined') module.exports = { ... }` 로 내보낸다.
- 성공 기준 하나를 마칠 때마다 표의 확인 방법에 적힌 테스트가 있는지 본다.

### 먼저 질문

- `@playwright/test` 밖의 의존성 추가(devDependency 포함).
- 성공 기준이나 가정(G1~G20)과 다르게 동작을 바꾸는 것.
- localStorage 키 이름이나 저장 형식 바꾸기(이미 저장된 데이터를 못 읽게 된다).

### 절대 금지

- 실패하는 테스트 지우기, 테스트 건너뛰기(`.skip`, `.only`, `test.fixme`), 기대 값을 구현에 맞춰 바꿔 통과시키기.
- 외부 CDN 이나 네트워크에서 스크립트·글꼴·스타일 읽기.
- ES 모듈(`type="module"`, `import`/`export`), 프레임워크, 번들러 쓰기.
- 브라우저 설치 명령을 직접 부르기(mvp-builder 가 한다).
- `eval`, `new Function` 으로 수식 계산하기.

## 작업 환경

언어와 도구:

- HTML, CSS, JavaScript(ES2020, 브라우저 전역 스크립트). 프레임워크와 번들러 없음.
- Node.js LTS 24.x(테스트 실행용). 단위 테스트는 `node:test`.
- `@playwright/test` 1.x(devDependency 하나뿐, 버전은 package-lock.json 으로 고정). 브라우저는 Chromium, 프로젝트 안(`PLAYWRIGHT_BROWSERS_PATH=0`)에 받는다.
- 데이터는 브라우저 localStorage. 서버 없음.

package.json 의 scripts:

```json
{
  "test": "node --test",
  "test:coverage": "node --test --experimental-test-coverage --test-coverage-include='src/**' --test-coverage-exclude='src/app.js' --test-coverage-lines=90",
  "e2e": "playwright test"
}
```

폴더 구조:

```text
index.html            앱 페이지 하나. src/ 의 파일을 아래 순서로 <script src> 로 읽는다. file:// 로 바로 연다.
style.css             표·수식 입력줄 모양. 음수 칸의 빨간 글자(`.grid td.negative`).
src/                  앱 코드. 규칙 모듈은 DOM 을 건드리지 않는다.
  address.js          주소 해석과 만들기(A1 ↔ {col,row}, $ 절대 표시, 범위).
  value.js            원문 해석(숫자·문자열·수식·빈 칸), 오류 값 상수, 보이는 글자 만들기, 정렬·음수 판정.
  formula.js          수식 토큰 나누기, 구문 분석(AST), 계산, 참조 옮기기.
  functions.js        SUM, AVERAGE, MIN, MAX, COUNT, IF, ROUND, ABS.
  sheet.js            칸 저장, 의존 그래프, 다시 계산, 순환 찾기.
  selection.js        활성 칸·범위 이동 계산.
  history.js          되돌리기·다시 하기 기록.
  clipboard.js        범위 복사와 붙여 넣기 계산.
  storage.js          저장 형식 직렬화·복원(저장소 객체를 인자로 받는다).
  csv.js              CSV 글자 만들기.
  app.js              DOM 그리기, 이벤트 연결, 내려받기. 맨 마지막에 읽는다.
tests/                단위 테스트(*.test.js). require 로 src/ 를 읽는다.
e2e/                  Playwright e2e 테스트(*.spec.js). index.html 을 file URL 로 연다.
playwright.config.js  e2e 설정.
package.json          scripts 와 devDependency.
```

`index.html` 의 스크립트 순서: address → value → functions → formula → sheet → selection → history → clipboard → storage → csv → app. 전역 이름이 겹치지 않게 파일마다 전역 객체 하나만 둔다(`Address`, `Value`, `Formula` 처럼 파일 이름의 대문자 꼴). 다른 규칙 모듈은 브라우저에서는 전역으로, Node 에서는 `require` 로 얻는다.

코드 스타일:

```js
// src/address.js
var Address = (function () {
  var MAX_COL = 26;
  var MAX_ROW = 100;

  function colToIndex(letters) {
    return letters.toUpperCase().charCodeAt(0) - 65;
  }

  function parseRef(text) {
    var m = /^(\$?)([A-Za-z]+)(\$?)(\d+)$/.exec(text);
    if (!m) return null;
    var col = m[2].length === 1 ? colToIndex(m[2]) : MAX_COL;
    var row = Number(m[4]) - 1;
    return { col: col, row: row, absCol: m[1] === '$', absRow: m[3] === '$',
             valid: col < MAX_COL && row >= 0 && row < MAX_ROW };
  }

  return { MAX_COL: MAX_COL, MAX_ROW: MAX_ROW, parseRef: parseRef };
})();

if (typeof module !== 'undefined') module.exports = Address;
```

```js
// tests/address.test.js
const test = require('node:test');
const assert = require('node:assert/strict');
const Address = require('../src/address.js');

test('parseRef reads absolute column and row', () => {
  assert.deepEqual(Address.parseRef('$B$3'),
    { col: 1, row: 2, absCol: true, absRow: true, valid: true });
});
```

- 들여쓰기 공백 2칸, 작은따옴표, 세미콜론 씀.
- `src/` 는 파일 범위가 전역이므로 IIFE 로 감싸고 전역 이름 하나만 낸다. 테스트와 설정 파일은 Node 에서만 돌므로 `const`·화살표 함수를 써도 된다.

이름 규칙:

- 파일: 소문자 한 단어(`formula.js`). 단위 테스트는 `<모듈>.test.js`, e2e 는 `<기능>.spec.js`.
- 전역 모듈 객체: 파스칼 표기(`Formula`). 함수·변수: 카멜 표기(`parseRef`). 상수: 대문자 밑줄(`MAX_ROW`).
- 오류 값 상수: `Value.ERR_DIV0` 처럼 `ERR_` 로 시작한다.
- 칸 주소 문자열은 늘 대문자(`'A1'`)로 저장한다.
- 테스트 이름은 영어 문장으로, 무엇이 어떻게 되는지 쓴다(`'SUM skips text in ranges'`).
