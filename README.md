# Nailed — 중고거래 플랫폼

Spring Boot + React 기반의 풀스택 중고거래 플랫폼입니다. 상품 등록부터 주문, 결제, 정산, CS까지 이커머스의 전체 트랜잭션 흐름을 팀 프로젝트로 직접 설계하고 구현했습니다.

- **배포 주소**: (배포 URL 입력)
- **프로젝트 기간**: 2026.04 ~ 2026.06
- **팀 구성**: 3인 (도메인별 풀스택 분담)

---

## 📁 프로젝트 구조

```
nailed-springboot-react/
├── backend/    # Spring Boot 기반 REST API 서버
└── frontend/   # React 기반 클라이언트
```

---

## 🛠 기술 스택

**Backend**
- Java, Spring Boot, Spring Security
- JPA (Hibernate)
- MySQL
- AWS EC2, Docker, Docker Compose

**Frontend**
- React, Vite
- Context API, React Router
- Axios

**Infra / Tools**
- AWS EC2 배포 (Docker Compose)
- Kakao Address API 연동
- Git / GitHub

---

## 👤 담당 역할 (정병묵)

**주문 · 결제 · 정산 · CS** 도메인을 백엔드부터 프론트엔드까지 단독으로 설계·구현했습니다. 아울러 팀원이 각자 자신의 파트를 구현한 공용 화면인 **마이페이지**와 **관리자 페이지**에서는 담당 파트(구매/판매/정산/문의 내역, 주문 관리·문의 관리)를 맡아 구현했습니다.

### 담당 도메인 한눈에 보기

| 영역 | Backend | Frontend |
|---|---|---|
| 주문/배송 | `order` 패키지 (Controller/Service/Entity/Repository) | `OrderFormPage`, `OrderDetailPage` |
| 결제 | `payment` 패키지, KakaoPay 연동 | `PaymentPage`, 결제수단 UI |
| 정산 | 주문 기준 수수료·정산금 산출 로직 | 마이페이지 정산 내역 |
| CS/고객센터 | 문의(`inquiry`) 처리 | 고객센터·이용안내 페이지 |
| 마이페이지 *(담당 파트)* | 구매/판매/정산/문의 내역 조회 Port | `UserProfilePage`, `myPageApi` |
| 관리자 *(담당 파트)* | 주문관리·문의관리 API | `AdminOrdersPage`, `AdminInquiriesPage` |

### 핵심 기술 성과: 동시성 제어 (Pessimistic Locking)

단일 재고 상품에 대해 여러 사용자가 동시에 구매를 시도할 경우 발생할 수 있는 **중복 주문 문제**를 해결했습니다.

- JPA `@Lock(PESSIMISTIC_WRITE)` 기반의 `findByIdWithLock`으로 `SELECT ... FOR UPDATE` 비관적 락 적용
- 먼저 락을 획득한 요청만 주문을 진행하고, 락 획득에 실패한 요청은 `PessimisticLockingFailureException`을 감지해 커스텀 에러코드(O012)와 함께 `409 Conflict`로 즉시 응답 처리
- 동시 요청 상황을 재현하여 락 적용 전/후 동작을 검증

### 정산(Settlement) 로직

주문 테이블을 기준으로 수수료와 정산 금액을 실시간 산출하는 구조를 설계했습니다. (기본 수수료율 2%, **10원 단위 반올림** 적용)

```
(상품가 + 배송비) × 수수료율 = 수수료
(상품가 + 배송비) + 수수료 = 최종 결제 금액
최종 결제 금액 − 수수료 = 판매자 정산 금액

예) 상품가 490,000원 + 배송비 4,000원 = 494,000원
    494,000원 × 2% = 9,880원 (수수료)
    최종 결제 금액 = 503,880원
```

### 주문 상태 흐름 & 주문 취소

- **주문 상태 흐름 설계**: `PAID → REQUESTED → SHIPPING → DELIVERED` (결제완료/주문접수 단계를 분리)
- **주문 취소**: 구매자 본인 + `REQUESTED / PAID` 상태에서만 취소 가능하도록 검증, 취소 시 상품 상태를 `SOLD → ON_SALE`로 복구
- **배송완료 처리**: 구매자가 배송완료 확인 시 상품 상태를 `SOLD`로 전환

### 판매자 등급 시스템

- **DELIVERED(배송완료) 주문 건수**를 기준으로 등급을 자동 산정 (`SellerGradeService`)
- 1건 → `SILVER`, 2건 → `GOLD`, 3건 이상 → `DIAMOND`, 그 외 → `BRONZE` 배지 부여
- 배송완료 시점에 등급을 재계산하여 회원 정보에 반영

### CS / 고객센터

- 1:1 문의(`Inquiry`) 등록·조회·답변 처리 로직 구현
- 고객센터 / 이용안내 페이지 구성 및 기본 배송비(4,000원) 안내 등 정책 정보 정리

### 마이페이지 (담당 파트)

> 마이페이지는 팀원이 각자 자신이 맡은 도메인 파트를 구현한 공용 화면이며, 그중 아래 항목을 담당했습니다.

- **구매 내역 / 판매 내역 / 정산 내역 / 문의 내역** 조회 구현 (`UserProfilePage`, `myPageApi`)
- 도메인 간 결합도를 낮추기 위해 **Port 인터페이스**(`OrderMemberQueryPort`, `SettlementMemberQueryPort`)로 회원 도메인과 분리
- 판매 내역의 운송장 등록 시 주문 시간(`updated_at`) 자동 최신화, 취소 주문 배지 표시 등 UX 개선

### 관리자 페이지 (담당 파트)

> 관리자 페이지 역시 각 담당자가 자신의 파트를 구현했으며, 그중 주문 관리·문의 관리를 담당했습니다.

- **주문 관리**: 전체 주문 조회 및 상태 관리 API/화면 (`AdminOrderController`, `AdminOrdersPage`)
- **문의 관리**: 답변대기 / 답변완료 상태 관리, 최신순 정렬 (`AdminInquiryController`, `AdminInquiriesPage`)

### 그 외 구현 내용

- **Mock 결제 · 배송 어댑터 패턴**: 실제 PG사 연동 없이 어댑터 패턴으로 확장 가능한 구조 설계 (`MockShippingService`, `MockDeliveryTracker`)
- **Kakao 주소 API 연동**: 배송지 입력 시 실주소 검색 및 검증
- **공통 예외 처리**: `GlobalExceptionHandler` / `ErrorCode` 기반 에러 응답 규격 통일(BE/FE), `EntityNotFound` 404 핸들링
- **AWS EC2 배포**: Docker Compose 기반 배포, 이미지 URL 하드코딩(`localhost:8080`) 이슈를 SSH 접속으로 진단 및 수정

---

## 팀원

| 이름 | 담당 |
|---|---|
| 정병묵 | 주문 / 결제 / 정산 / CS / 마이페이지·관리자(주문·문의) |
| 정병민 | 인증 / 회원 |
| 윤성준 | 상품 / 리뷰 / 홈 / 검색 |

---

## 실행 방법

```bash
# Backend
cd backend
./gradlew bootRun

# Frontend
cd frontend
npm install
npm run dev
```
