# 🛍️ Nailed — 중고거래 플랫폼

[![CI](https://github.com/jeongbyeongmug/nailed-marketplace/actions/workflows/ci.yml/badge.svg)](https://github.com/jeongbyeongmug/nailed-marketplace/actions/workflows/ci.yml)

주문 → 결제 → 정산 → CS로 이어지는 거래 흐름 전체를 구현한 중고거래 웹 서비스

- **기간** : 2026.04 ~ 2026.06 · **팀** : 3인
- **배포** : http://52.78.146.81/ — 테스트 계정 id=`wnsdn929` / password=`qwer1234!`
- **기술** : Java 21 · Spring Boot 3.5 · Spring Security(JWT) · JPA · MySQL 8 · React · Docker Compose(Nginx) · AWS EC2
- **담당(정병묵)** : 주문 · 결제 · 정산 · CS(1:1 문의) · 마이페이지 · 관리자(주문/문의)

## 프로젝트 구조

```
nailed-marketplace
├── backend    Spring Boot (Java 21) — 도메인 로직·API 전체
│   └── com.nailed
│       ├── common   공통 응답 · 예외(ErrorCode, GlobalExceptionHandler) · enum
│       ├── config   SecurityConfig, JwtTokenProvider
│       └── web      도메인별 controller → service → repository → entity/dto
│                    auth · member · product · order · inquiry · admin · review · report · wishlist
├── frontend   React 19 (Vite) — Nginx가 빌드 결과물 서빙
└── docker-compose.yml
```

> 저장소 언어 비율은 프론트엔드 빌드 산출물 영향으로 JavaScript가 높게 잡히지만, 핵심 구현은 backend의 Java 코드입니다.

## 핵심 성과

### 1. 비관적 락으로 1점물 중복 주문 차단

중고거래는 모든 상품이 재고 1개입니다. 동시 결제 요청이 들어오면 `SELECT ... FOR UPDATE`(`@Lock(PESSIMISTIC_WRITE)`)로 상품 행을 선점해 직렬화합니다.

- **락 획득 후 재검증** : 락 경합에서 진 요청은 상품이 이미 SOLD이므로 P002(400)로 차단 — 정상 경합의 기본 경로
- **락 타임아웃** : 앞 트랜잭션이 오래 걸려 대기가 타임아웃되면 `PessimisticLockingFailureException` → O012(409 Conflict)

**검증 결과**

| 테스트 | 시나리오 | 결과 |
| --- | --- | --- |
| `OrderConcurrencyTest` | 동시 30요청 | 성공 1 / 차단 29(O012·P002) / 상품 SOLD / 주문 1건 |
| `OrderLockTimeoutTest` | 락 선점 상태에서 주문 시도 | 약 2초 대기 후 O012(409), 상품 ON_SALE 유지 |

JVM 내부 락이 아닌 DB 락이므로 백엔드 서버가 N대로 늘어나도 같은 상품 주문은 안전하게 직렬화됩니다. 트레이드오프 : 락 대기 중 커넥션을 점유하며, 락 타임아웃은 MySQL 기본값에 의존합니다.

### 2. 금액·배송지 스냅샷

수수료·최종 결제액·정산금·수령지 정보를 **주문 시점에 계산해 orders 테이블에 저장**합니다. 이후 수수료 정책이나 회원 정보가 바뀌어도 과거 주문 금액은 변하지 않습니다.

```
(상품가 + 배송비) × 수수료율 2% = 수수료(10원 단위 반올림)
예 : 490,000 + 4,000 = 494,000 → 수수료 9,880
최종 결제액 503,880 / 판매자 정산금 494,000
```

정산금은 DELIVERED 확정 후 지급하는 에스크로 방식을 전제로 계산·저장·조회까지 구현했으며, **실제 지급 트리거는 미구현**(다음 과제)입니다.

### 3. 트러블슈팅

- **@Builder.Default 누락** : 조회만 했는데 UPDATE 쿼리 발생, 초기값 필드 null 저장. Lombok `@Builder`가 필드 초기값을 무시한 것이 원인 → 초기값 있는 필드에 `@Builder.Default` 적용(5개 엔티티), 재실행으로 검증 후 팀 규칙화
- **배포 후 이미지 전체 깨짐** : 운영 DB에 `localhost:8080` 절대 URL이 저장돼 있던 것이 원인 → 상대 경로 저장으로 수정, 기존 데이터 일괄 정리

## 데이터 모델

총 12개 테이블. `orders` 테이블 설계 포인트 :

- **스냅샷 컬럼** (`commission`, `final_price`, `seller_settlement_amount`, `receiver_*`)
- **상태별 타임스탬프** (`paid_at`, `requested_at`, `shipped_at`, `delivered_at`)
- **취소 추적 분리** (`cancel_request_*` 컬럼 그룹)
- **이중 외래키** (`buyer_id` + `seller_id`) — 구매/판매 내역을 단일 조인으로 조회

## 주문 상태 머신

```
PAID → REQUESTED → SHIPPING → DELIVERED
  ↓________↓
   CANCELLED
```

취소는 PAID/REQUESTED 상태에서 구매자 본인만 가능하며, 취소 시 상품은 ON_SALE로 복구됩니다.

## API 명세

REST 컨벤션 : 자원 중심 URL, 상태 전이는 `PATCH`, 생성은 `201 Created` + `Location` 헤더. 전체 명세는 Swagger UI(`/swagger-ui/index.html`)에서 확인할 수 있습니다.

| Method | Endpoint | 설명 |
| --- | --- | --- |
| `POST` | `/api/orders` | 주문 생성 → 201 + Location |
| `GET` | `/api/orders/{id}` | 주문 조회 |
| `PATCH` | `/api/orders/{id}/pay` | 결제 처리 |
| `PATCH` | `/api/orders/{id}/confirm` | 판매자 주문 확인 |
| `PATCH` | `/api/orders/{id}/shipping` | 운송장 등록 |
| `PATCH` | `/api/orders/{id}/delivered` | 배송 완료 처리 |
| `POST` | `/api/orders/{id}/cancel` | 주문 취소(구매자) |
| `POST` | `/api/inquiries` | 1:1 문의 등록 |
| `GET` | `/api/inquiries/my` | 내 문의 목록(페이징) |

**통일 응답 포맷**

```json
// 성공
{ "success": true, "data": { "orderId": "...", "status": "PAID", "finalPrice": 503880 } }

// 실패
{ "success": false, "error": { "code": "O012", "message": "..." } }
```

**도메인 에러 코드** : O012(409 락 획득 실패) · P002(400 판매 완료 상품) · O004(400 본인 상품 구매) · O007(400 결제 금액 불일치) · O009(400 취소 불가 상태) · O003(403 주문 접근 권한 없음)

## 테스트

동시성 포함 **통합 테스트 19개**를 작성했고, **GitHub Actions CI가 push마다 실제 MySQL 8.4 서비스 컨테이너를 띄워 자동 실행**합니다(`SELECT ... FOR UPDATE` 락 동작까지 실제 DB에서 검증).

```bash
cd backend && ./mvnw test                                        # 전체
cd backend && ./mvnw -Dtest=OrderConcurrencyTest,OrderLockTimeoutTest test   # 동시성만
```

## 아키텍처 · 배포

```
브라우저(React) → EC2 [Docker Compose : Nginx(FE) → Spring Boot → MySQL 8]
```

- **인증** : Spring Security + JWT(Access/Refresh). Refresh Token은 HttpOnly 쿠키 + DB 저장
- **API 문서** : springdoc-openapi / Swagger UI
- **모니터링** : Spring Boot Actuator (`/actuator/health`, `/actuator/metrics`)
- **CI** : GitHub Actions — push/PR마다 백엔드 빌드 + 통합 테스트(동시성 포함)를 MySQL 8.4 서비스 컨테이너에서 실행
- **배포 절차** : 로컬 빌드 → SFTP(FileZilla)로 EC2 업로드 → `docker compose up -d --build` 수동 배포. 배포 자동화(CD)는 다음 과제입니다
- mysql 컨테이너는 `mysqladmin ping` healthcheck + 볼륨, backend는 `depends_on: service_healthy`, 외부 개방 포트는 80 단일

**로컬 실행**

```bash
cd backend && ./mvnw spring-boot:run
cd frontend && npm install && npm run dev
docker compose up -d --build
```

## 남은 과제

- 주문번호 count()+1 → 시퀀스/UUID 전환 (동시 주문 시 중복 가능성 제거)
- HTTPS 적용 (도메인 + Let's Encrypt)
- 정산금 지급 트리거 구현
- Refresh Token rotation(재사용 감지)
- GitHub Actions 기반 배포(CD) 자동화 — 테스트 CI는 적용 완료

## 팀

- **정병묵** : 주문 · 결제 · 정산 · CS · 마이페이지 · 관리자
- **정병민** : 인증 · 회원 · 제재
- **윤성준** : 상품 · 리뷰 · 홈 · 검색 · 위시리스트
