# 🛍️ Nailed — 중고거래 웹 플랫폼

[![CI](https://github.com/jeongbyeongmug/nailed-springboot-react/actions/workflows/ci.yml/badge.svg)](https://github.com/jeongbyeongmug/nailed-springboot-react/actions/workflows/ci.yml)

> **주문 → 결제 → 정산 → CS**로 이어지는 이커머스 트랜잭션 흐름 전체를 설계·구현한 Spring Boot + React 풀스택 프로젝트입니다.

- **배포**: http://52.78.146.81/ ｜ **기간**: 2026.04 ~ 2026.06 ｜ **팀**: 3인
- **기술**: Java 21 · Spring Boot 3 · JPA · MySQL 8 · React · AWS EC2 · Docker Compose
- **담당 (정병묵)**: 주문 · 결제 · 정산 · CS + 마이페이지/관리자(주문·문의 파트)

<br>

## ⭐ 핵심 성과 3가지

### 1. 비관적 락으로 중복 주문 방지 — 2중 방어 + 실제 재현 검증

중고거래는 재고가 1개뿐이므로, 동시 구매 요청 시 중복 주문이 발생할 수 있습니다.
재고 1개 특성상 **충돌 확률이 높아** 낙관적 락의 실패-재시도 비용보다 비관적 락으로 선점 차단하는 것이 적합하다고 판단했습니다.

```java
// ProductRepository — 주문 시 상품 행에 쓰기 락(SELECT ... FOR UPDATE)을 선점
@Lock(LockModeType.PESSIMISTIC_WRITE)
@Query("SELECT p FROM Product p WHERE p.productId = :productId")
Optional<Product> findByIdWithLock(@Param("productId") Long productId);
```

- **1차 방어** — 락 대기 중 Lock wait timeout(MySQL SQL Error 1205) → `PessimisticLockingFailureException` 감지 → 커스텀 에러코드 `O012`(**409 Conflict**)
- **2차 방어** — 락 획득 후 상품 상태 재검증 → 이미 `SOLD`면 주문 차단 → 커스텀 에러코드 `P002`(**400 Bad Request**)
- **검증 ① (2차 방어 · 동시성)** — `@SpringBootTest` + 실제 MySQL에서 **스레드 30개**가 동일 상품을 동시 주문 → **성공 1건 / 차단 29건(전부 `P002`·400) / 상품 `SOLD` / 주문 레코드 1건**을 단정(assert)으로 검증 (`OrderConcurrencyTest`)
- **검증 ② (1차 방어 · 락 대기)** — 별도 트랜잭션이 상품 행을 `FOR UPDATE`로 점유한 상태에서 주문 요청 → 락 대기 타임아웃(MySQL 1205)으로 **약 2초 만에 `O012`(409) 차단 / 주문 0건 / 상품 `ON_SALE` 유지**를 단정으로 검증 (`OrderLockTimeoutTest`)

> **확장 고려** — 단일 인스턴스에선 DB 비관적 락으로 충분하지만, 다중 인스턴스로 스케일아웃하면 애플리케이션 레벨 분산 락(Redis/Redisson)이 필요합니다. 이때 `redisson-spring-boot-starter`는 자동설정이 부팅 시 Redis 커넥션을 강제 생성해 Redis 없이는 기동이 실패하므로, 순수 `redisson` + `@Lazy` 지연 로딩으로 부팅을 안전화해야 한다는 점까지 확인했습니다.

### 2. 금액·배송지 스냅샷 설계 — 정책이 바뀌어도 과거 주문은 불변

수수료·정산금(`commission`, `final_price`, `seller_settlement_amount`)과 배송지를 **주문 시점에 확정 저장**했습니다. 수수료율 정책이 바뀌거나 회원이 주소를 수정해도 과거 주문 데이터의 정합성이 유지됩니다.

```
(상품가 + 배송비) × 수수료율 2% = 수수료 (10원 단위 반올림)

예) 상품가 490,000원 + 배송비 4,000원 = 494,000원
    수수료 = 494,000원 × 2% = 9,880원
    → 최종 결제 금액 503,880원 / 판매자 정산 금액 494,000원
```

정산은 배송완료(`DELIVERED`) 확정 후 판매자에게 지급되는 에스크로 방식입니다.

### 3. 트러블슈팅 — 원인을 끝까지 추적해서 해결

- **`@Builder.Default` 누락 → 의도치 않은 UPDATE 쿼리**: Lombok `@Builder`가 필드 초기화 값을 무시해 `null`로 생성 → Hibernate dirty checking 오동작. 어노테이션 명시 + 팀 컨벤션화로 해결
- **배포 후 이미지 전부 깨짐**: SSH로 EC2 접속해 운영 DB를 직접 확인 → 이미지 URL에 `localhost:8080` 하드코딩이 원인. URL 생성 로직을 환경별 설정 기반으로 수정하고 기존 데이터 일괄 보정

<br>

## 🖼 화면

| 홈 | 상품 목록 (SOLD) | 주문서 작성 |
| --- | --- | --- |
| ![home](docs/home.webp) | ![list](docs/list.webp) | ![order](docs/order.png) |

| 결제 완료 | 주문 상세 (상태) | 마이페이지 (등급·정산) |
| --- | --- | --- |
| ![paydone](docs/paydone.png) | ![orderdetail](docs/orderdetail.png) | ![mypage](docs/mypage.png) |

<br>

## 🗂 ERD

![ERD](./docs/erd.png)

🟧 주황색 테이블(`orders`, `inquiries`)이 제가 설계·구현한 테이블입니다. (전체 12개)

- **주문/CS (정병묵)** — `orders` `inquiries`
- **회원 (정병민)** — `members` `member_penalties` `member_id_sequence`
- **상품/리뷰 (윤성준)** — `products` `product_groups` `product_images` `reviews` `wishlists` `product_grd_sequence`
- **공통** — `reports`

### `orders` 테이블 설계 의도

- **① 금액·정산 스냅샷** — `commission` `final_price` `seller_settlement_amount`를 주문 시점에 확정 저장. 정책 변경에도 과거 금액 불변
- **② 배송지 스냅샷** — `receiver_*` 컬럼군에 주문 시점 배송지 저장. 회원 정보 변경과 무관하게 유지
- **③ 상태별 타임스탬프 분리** — `paid_at / requested_at / shipped_at / delivered_at`으로 상태 전이 이력 확보 → 배송 추적·정산 시점 판단 근거
- **④ 취소 컬럼군 분리** — `cancel_request_status / cancel_requested_at / cancel_request_reason / cancel_responded_at`으로 취소 흐름을 독립 추적
- **⑤ 구매자·판매자 FK 동시 보유** — `buyer_id` + `seller_id`로 마이페이지 구매/판매 내역을 조인 한 번에 조회

<br>

## 👤 담당 구현 내용

**주문 상태 흐름**

```
PAID ──▶ REQUESTED ──▶ SHIPPING ──▶ DELIVERED
  │          │
  └──────────┴──▶ CANCELLED
```

**주문 · 결제 · 배송**

- 결제완료(PAID)와 주문접수(REQUESTED)를 분리해 판매자 확인 단계를 명시적으로 표현
- 주문 취소는 **구매자 본인 + PAID/REQUESTED 상태에서만** 허용, 취소 시 상품 상태를 `ON_SALE`로 복구해 재판매 처리
- sessionStorage 기반 4단계 결제 플로우 (`OrderFormPage` → `PaymentPage`)
- Kakao 주소 API 연동으로 배송지 검색·검증
- `ShippingService` 인터페이스 기반 어댑터 패턴 — 실제 PG/택배사 연동 시 Mock 구현체만 교체 (`MockShippingService`, `MockDeliveryTracker`)
- 배송완료 확인 시 상품 `SOLD` 확정 + 판매자 등급 자동 재산정 (`SellerGradeService`: DELIVERED 건수 기준 SILVER/GOLD/DIAMOND)

**CS · 마이페이지 · 관리자**

- 1:1 문의 등록·조회·답변 처리 (답변대기/답변완료 상태 관리)
- 마이페이지 구매/판매/정산/문의 내역 — **Port 인터페이스**(`OrderMemberQueryPort`, `SettlementMemberQueryPort`)로 회원 도메인과 결합도를 낮춰 구현
- 관리자 주문 관리·문의 관리 (`AdminOrderController`, `AdminInquiryController`)
- `GlobalExceptionHandler` + `ErrorCode` 기반 BE/FE 에러 응답 규격 통일

<br>

## 🏗 아키텍처 & 실행

```
Browser(React) ──▶ EC2 [ Docker Compose: Nginx(FE) ─▶ Spring Boot ─▶ MySQL 8 ]
```

- Spring Security + JWT (Access / Refresh Token) 인증
- Docker Compose 컨테이너 3개(FE/BE/DB)를 EC2 단일 인스턴스에 배포
- **CI** — push마다 GitHub Actions가 실제 MySQL 컨테이너를 띄워 백엔드 통합 테스트(동시성 포함, **총 19개**)를 실행 (`.github/workflows/ci.yml`)
- **관측성** — Spring Boot Actuator로 `/actuator/health`(LB·컨테이너 헬스체크)와 `/actuator/metrics`(Micrometer 메트릭)를 노출
- **다중 인스턴스 확장** — 비관적 락이 DB 레벨이라 백엔드를 N대로 늘려도 동일 상품 주문은 같은 행 락으로 직렬화되어 안전(JVM 로컬 락이면 깨짐). Nginx 로드밸런싱 예시 구성은 [`deploy/`](deploy/) 참고

```bash
# Backend (Maven)
cd backend && ./mvnw spring-boot:run

# Frontend
cd frontend && npm install && npm run dev

# 동시성 통합 테스트 (로컬 MySQL 필요 — 전용 스키마 자동 생성)
cd backend && ./mvnw -Dtest=OrderConcurrencyTest,OrderLockTimeoutTest test

# 배포 (Docker Compose)
docker compose up -d --build
```

<br>

## 👥 팀원

**정병묵** (주문/결제/정산/CS) · 정병민 (인증/회원/제재) · 윤성준 (상품/리뷰/홈/검색/찜)
