## SpotBalance : 혼잡 없이, 나답게. 데이터로 증명된 최적의 강원도 여행지 추천 서비스
> **SpotBalance**는 복잡한 검색 과정 없이, 사용자 맞춤형 데이터와 실시간 환경 정보를 결합하여 '지금 가장 쾌적하게 여행할 수 있는 강원도 관광지'를 추천해 주는 스마트 여행 큐레이션 서비스입니다. 인기 관광지의 긴 대기 줄과 날씨 고민 없이, 오직 데이터로 증명된 가장 완벽한 여행지를 제안합니다.
---
## Tech Stack
* **Frontend:** Next.js, Tailwind CSS
* **Backend:** Supabase
* **Data Pipelines:** pg_cron, 공공데이터 API 연동
* **Deployment:** Supabase Edge Functions
---
## 로컬 개발 환경 실행 방법

### 1. 저장소 클론 및 패키지 설치

```bash
git clone <저장소 주소>
cd spot-balance
npm install
```
### 2. 환경 변수 파일 생성
프로젝트 루트에 .env 파일을 생성하고 다음 정보를 입력합니다.
```bash
SUPABASE_URL=your_supabase_url
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
DATA_GO_KR_KEY=your_public_api_key
```
### 3. 프로젝트 연결 및 함수 로컬 실행
Supabase CLI가 설치되어 Supabase있어야 합니다.
```bash
# Supabase 서비스 로그인
supabase login
# Supabase 로컬 개발 서버 실행
supabase start
# 프로젝트 연결
supabase link --project-ref <project-ref>
# 로컬에서 Edge Functions 실행
supabase functions serve --env-file .env
```
### 4. 웹 애플리케이션 실행
```bash
npm run dev
```
---
### 1. 문제 정의(Why)

강원도 관광은 일부 유명 관광지에 방문객이 집중되는 오버투어리즘 문제가 발생하고 있다. 관광객은 혼잡을 피해 쾌적한 여행을 원하지만, 특정 지역에 편중되는 현상이 지속된다. 기존 서비스는 날씨나 혼잡도 같은 실시간 데이터를 충분히 반영하지 못하고, 대도시 중심의 획일적인 추천을 제공한다.

### 2. 솔루션(What)

SpotBalance는 실시간 방문객 통계와 사용자 취향을 결합하여 최적의 관광지를 추천하는 데이터 기반 스마트 여행 서비스이다. 강원도 관광 산업과 ICT 기술을 융합하여 관광객 분산과 균형 있는 관광 생태계 조성을 목표로 한다.

### 3. 핵심 기술(How)

* 기상청, 한국관광공사 DataLab 등 공공데이터를 자동 수집하는 데이터 파이프라인 구축(Supabase).
* 사용자 취향, 실시간 날씨, 혼잡도를 통합한 추천 엔진 구현.
* 카카오 API 호출 제한에 대응하기 위해 OSRM 및 하버사인 거리 기반 우회 로직 적용.
* 로그인 없이 Guest Session ID를 발급하여 사용자 행동 데이터를 수집.
* 연령 가중치의 월별 데이터를 누적 평균 알고리즘으로 관리하여 관광 트렌드 변화를 반영.
* 연령 가중치의 최신 데이터 테이블과 이력 로그 테이블을 분리해 데이터 무결성 확보.

### 4. 성과 및 기대효과

실시간 날씨와 혼잡도를 반영한 관광지 추천 및 경로 제공 기능을 구현·배포하였다. 이를 통해 사용자가 여행지를 고민하는 시간을 단축시킬 수 있다. 또한, 특정 지역의 혼잡 완화와 강원도 관광 데이터의 활용 가치를 향상시킬 수 있다.

### 5. 확장성

향후 강원도 지자체 관광 서비스와 연계하고, 타 지역으로 확대 적용하여 숙박·맛집 정보를 포함한 종합 여행 플랫폼으로 발전시킬 계획이다.
