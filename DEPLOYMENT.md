# 지음 1차 배포

사용자 선택: 첫 버전은 읽기 전용 데모. 외부 Supabase 없이 화면·검색·공개 예시를 확인합니다. `vercel.json`의 빌드/실행 환경을 모두 demo로 고정하며 회원 데이터를 수집하지 않습니다.

작업 브랜치: `release/v0.1.0`. 초기 MVP 기준 커밋은 `7ba5178`입니다.
운영 기준 브랜치는 `main`이며, 미리보기 검증이 끝난 커밋을 운영에 반영합니다.
롤백은 문제가 확인될 때만 수행합니다. 현재 롤백을 실행하지 않습니다.

## 데이터 모드

| 설정                        | 동작                                                                |
| --------------------------- | ------------------------------------------------------------------- |
| `JI_EUM_DATA_MODE=demo`     | 명시적인 읽기 전용 데모. 남아 있는 로컬 DB 환경변수를 사용하지 않음 |
| `JI_EUM_DATA_MODE=supabase` | 실제 DB 필수. URL/공개 키가 없으면 빌드·실행에서 실패               |
| 미설정 또는 `auto`          | 기존 로컬 개발 동작. URL/공개 키가 함께 있으면 DB, 모두 없으면 데모 |

외부 Supabase 프로젝트가 아직 없으면 화면·검색·공개 예시 탐색은 demo로 배포할 수 있습니다.
가입·저장·사용자 기록은 실제 DB 연결 전 사용할 수 없습니다. 화면에도 이를 명시합니다.
가상 데이터와 법적 초안을 실서비스 정보처럼 표시하지 않습니다.

## 배포 입력 보호

- `.vercelignore`로 `.env*`, `.git`, `node_modules`, `.next`, 로컬 Supabase/도구 캐시, 테스트 결과를 업로드에서 제외합니다.
- `.vercel/`은 Git에 넣지 않습니다. 프로젝트 링크·배포·인증 관련 로컬 상태를 공개하지 않습니다.
- DB 도구 제외 규칙은 `/supabase/`로 최상위 폴더에 한정합니다. 앱에서 사용하는 `src/lib/supabase/server.ts`는 배포에 포함합니다.
- Vercel에서는 localhost DB 주소, 불완전한 URL/키 설정, Supabase secret/service_role 키를 거부합니다.
- `NEXT_PUBLIC_SITE_URL`을 지정하면 외부 HTTPS 기본 주소여야 합니다. 지정하지 않으면 Vercel의 실제 배포/운영 도메인을 사용합니다.
- 데모 및 preview의 검색엔진 수집은 막습니다. 공개 서비스의 실제 데이터 모드로 전환할 때 운영 정책과 개인정보 절차를 확정하세요.

## 배포 전 검사

```sh
npm ci
JI_EUM_DATA_MODE=demo npm run typecheck
JI_EUM_DATA_MODE=demo npm run lint
JI_EUM_DATA_MODE=demo npm test
JI_EUM_DATA_MODE=demo npm run build
JI_EUM_DATA_MODE=demo npm run test:e2e -- --grep-invert 'A–H:|배포된 홈'
```

시스템 Chromium을 쓰는 이 환경에서는 `PLAYWRIGHT_EXECUTABLE_PATH=/usr/bin/chromium`을 추가합니다.
다른 서버와 테스트 포트를 분리하려면 `E2E_PORT=3100`을 지정합니다.
`.env.local`을 삭제하거나 덮어써서 테스트 모드를 만들지 않습니다.

실제 DB 모드 검증은 로컬 Supabase에서만 합니다.

```sh
npm run db:start
node scripts/supabase.mjs migration up --local
npm run test:db
JI_EUM_DATA_MODE=supabase npm run build
JI_EUM_DATA_MODE=supabase E2E_CONNECTED=1 npm run test:e2e -- --grep 'A–H:'
```

`.github/workflows/checks.yml`은 데모와 격리된 로컬 Supabase를 두 작업으로 검사합니다.
외부 운영 DB를 CI 테스트에 연결하지 않습니다. GitHub의 자동 검사 결과는 실제 실행 결과를 확인한 뒤 통과로 판단합니다.

## 1. 미리보기 배포

Node.js 24.x / Next.js가 자동 설정되도록 `vercel.json`을 포함합니다.
환경의 기존 계정 인증을 먼저 확인하고, 인증 값은 환경 설정의 안전한 입력을 사용합니다.
Vercel 로그인 정보나 토큰을 문서·소스·채팅에 넣지 않습니다.

인증된 계정으로는 Vercel CLI의 일반 preview 배포를 사용합니다.
새 프로젝트의 첫 배포는 Vercel에서 production만 허용합니다. 이때 `--prod --skip-domain`으로 운영 도메인 연결을 미루고 개별 배포 주소를 검사한 뒤 `vercel promote`로 운영 주소에 연결합니다. 이후 배포부터 일반 preview를 사용합니다.
CLI 65.9.0은 로그인 전 `--temporary` 배포도 지원합니다. 임시 배포는 계정 소유의 운영 배포와 구분하고, 실제 만료/유지 조건과 결과를 확인해야 합니다.
읽기 전용 데모라면 **빌드와 실행 양쪽**에 `JI_EUM_DATA_MODE=demo`를 설정합니다.
로컬 `.env.local`을 업로드하거나 `--prebuilt`로 로컬 DB 설정이 포함된 빌드를 올리지 않습니다.

2026-11-02 확인: 기존 Vercel API 접속 차단은 해소되었습니다. 인증 없는 API 요청은 이제 프록시가 아닌 Vercel에서 인증 토큰 부재 응답을 반환합니다.

실제 임시 배포에서 발견한 빌드 문제를 보완했습니다.

- 임시 배포는 로컬에서 `vercel build --prod`를 실행하며 기존 `.env.local`을 읽을 수 있습니다.
- `npm run deploy:demo -- --temporary --yes --json`은 커밋된 소스를 별도 배포 산출물 디렉터리에 내보내고, 이 명령의 환경에서만 demo 모드와 빈 DB 설정을 사용합니다. 기존 환경 파일은 보존합니다. Git worktree를 만들지 않습니다.
- 공개 주소가 아직 없는 빌드는 DB 모드만 먼저 검증하고, 요청 시 실제 배포 호스트로 공유 메타데이터를 만듭니다.
- 실제 환경 파일은 함수 추적에서도 제외합니다. Vercel SDK가 참조하는 값 없는 `.env.example` 템플릿만 업로드 제외 규칙의 예외로 유지합니다.
- 임시 배포의 실제 호스트는 `*.tmp.now`였습니다. 원래 허용한 `*.vercel.app`과 다르므로 내부 자동 검증을 위한 `*.tmp.now` 추가안을 환경 초안에 저장했습니다. 실제 적용에는 환경 설정 검토·저장·게시가 필요합니다.
- Vercel SDK에서 배포 READY와 만료 시각을 확인했습니다. 외부 HTTP·브라우저 검증은 실제 접근 결과와 구분해서 기록합니다.

이 관리형 환경에서 CLI 설정 저장소를 기존과 같이 사용하려면 명령 앞에 `XDG_CONFIG_HOME=/workspace/.config XDG_DATA_HOME=/workspace/.local/share XDG_CACHE_HOME=/workspace/.cache`를 지정합니다. 사용자 홈이나 기존 인증 정보를 덮어쓰지 않습니다.

## 2. 배포 주소의 실제 검증

배포가 성공한 경우에만 반환된 실제 HTTPS URL을 사용합니다.

```sh
E2E_BASE_URL=https://실제-배포-주소 npm run test:e2e -- --grep-invert 'A–H:'
```

- 배포된 데모의 검색, 곡, 공개 기록, 프로필, 플레이리스트, 모바일, 비활성 저장 안내를 검증합니다.
- 실제 Open Graph 이미지가 HTTPS로 열리고 localhost를 가리키지 않는지 확인합니다.
- URL이 주어지면 로컬 서버를 새로 시작하지 않습니다.
- 계정을 생성하는 DB E2E는 외부 배포를 대상으로 실행하지 못하게 차단합니다.
- Deployment Protection이 적용되어 접근이 막히면 프로젝트의 설정·허용 대상을 확인하고 결과를 명시합니다.

## 3. 운영 반영

- 미리보기의 실제 HTTP 및 브라우저 검사가 통과한 커밋만 `main`에 반영합니다.
- Vercel 계정의 운영 프로젝트·운영 환경변수·도메인을 확인하고 production 배포를 실행합니다.
- 데모를 운영 도메인에 올린 경우에도 읽기 전용·가상 데이터 표시는 유지합니다.
- 실제 회원 기능은 외부 Supabase 생성, 모든 SQL migration 순차 적용, 공개 키, Auth callback/메일 설정, 운영자·정책/신고 경로 준비 후 켭니다.
- Supabase는 Vercel 앱과 별도입니다. 앱 재배포 시 운영 DB를 reset/seed하지 않습니다.

## 4. 문제가 발생한 경우

운영 배포 ID와 대응 Git 커밋을 기록한 뒤, 필요할 때 Vercel의 이전 검증된 앱 배포로 복귀합니다.
DB 변경은 앱 롤백으로 돌아가지 않으므로 별도의 호환 마이그레이션과 백업 복구 계획이 필요합니다.
문제가 없는 상태에서 롤백을 미리 실행하지 않습니다.
