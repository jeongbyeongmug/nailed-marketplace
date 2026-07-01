import { useState, useEffect } from 'react';
import kakaoIcon from '../assets/kakaopay.png';
import naverIcon from '../assets/naverpay.png';
import tossIcon  from '../assets/tosspay.png';
import { mockPay } from '../api/orderApi';
import axios from 'axios';
import { navigate, getCurrentMemberId, safeParse, METHOD_LABELS } from '../utils/orderHelpers';
import { page, inner, card, cardTitle } from '../styles/orderShared';
const s = {
  page, inner,
  title: { fontSize: '22px', fontWeight: '700', color: '#111', marginBottom: '24px', paddingBottom: '16px', borderBottom: '2px solid #168f88' },
  card, cardTitle,
  row: { display: 'flex', justifyContent: 'space-between', padding: '10px 0', borderBottom: '1px solid #f5f5f5', fontSize: '14px' },
  rowLabel: { color: '#888' },
  rowTotal: { display: 'flex', justifyContent: 'space-between', padding: '12px 0 0', fontSize: '16px', fontWeight: '700', color: '#168f88' },
  steps: { display: 'flex', alignItems: 'flex-start', padding: '0 0 24px' },
  step: { flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px', position: 'relative' },
  stepLine: { position: 'absolute', top: '13px', left: '50%', width: '100%', height: '1px', background: '#e0e0e0' },
  methodGrid: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '16px' },
  methodBtn: (selected) => ({
    padding: '14px', border: `2px solid ${selected ? '#168f88' : '#e0e0e0'}`,
    borderRadius: '10px', background: selected ? '#f0faf9' : '#fff',
    cursor: 'pointer', textAlign: 'center', transition: 'all 0.15s',
    fontSize: '15px', fontWeight: selected ? '700' : '500', color: selected ? '#168f88' : '#333',
  }),
  methodIcon: { fontSize: '20px', marginBottom: '4px', display: 'block' },
  payBtn: { display: 'block', width: '100%', padding: '16px', background: '#168f88', color: '#fff', border: 'none', borderRadius: '10px', fontSize: '16px', fontWeight: '700', cursor: 'pointer', marginTop: '8px' },
  alertSuccess: { padding: '14px', borderRadius: '8px', background: '#e8f5f4', border: '1px solid #168f88', color: '#168f88', textAlign: 'center', marginBottom: '12px', fontSize: '15px', fontWeight: '600' },
  alertError: { padding: '12px', borderRadius: '8px', background: '#fff0f0', border: '1px solid #e05c5c', color: '#e05c5c', marginBottom: '12px', fontSize: '13px' },
  safeBanner: {
    display: 'flex', alignItems: 'center', gap: '10px',
    background: '#f0faf9', border: '1px solid #c0e8e4',
    borderRadius: '10px', padding: '14px 16px', marginBottom: '16px',
  },
  noticeBanner: {
    background: '#fffbea', border: '1px solid #ffe08a',
    borderRadius: '10px', padding: '14px 16px', marginBottom: '16px',
    fontSize: '13px', color: '#7a6000', lineHeight: '1.6',
  },
  sellerRow: { display: 'flex', alignItems: 'center', gap: '10px' },
  badge: (color) => ({
    fontSize: '11px', fontWeight: '700', color: '#fff',
    background: color, borderRadius: '4px', padding: '2px 7px',
  }),
  infoRow: { display: 'flex', justifyContent: 'space-between', padding: '7px 0', fontSize: '14px' },
};

const STEPS = ['주문서', '결제', '완료'];

const METHODS = [
  { id: 'card',  icon: '💳',      label: '신용/체크카드' },
  { id: 'kakao', icon: kakaoIcon, label: '카카오페이' },
  { id: 'naver', icon: naverIcon, label: '네이버페이' },
  { id: 'toss',  icon: tossIcon,  label: '토스페이' },
  { id: 'phone', icon: '📱',      label: '휴대폰 결제' },
  { id: 'bank',  icon: '🏧',      label: '무통장 입금' },
];

const BADGE_COLOR = { BRONZE: '#cd7f32', SILVER: '#9e9e9e', GOLD: '#f5a623', DIAMOND: '#5c9bd6' };

function getExpectedDelivery() {
  const d = new Date();
  d.setDate(d.getDate() + 3);
  return `${d.getMonth() + 1}월 ${d.getDate()}일`;
}

export default function PaymentPage() {
  const [pendingPayment, setPendingPayment] = useState(null);
  const [pendingOrder,   setPendingOrder]   = useState(null);
  const [orderForm,      setOrderForm]      = useState(null);
  const [selectedMethod, setSelectedMethod] = useState('card');
  const [paying, setPaying] = useState(false);
  const [done,   setDone]   = useState(false);
  const [error,  setError]  = useState('');

  // 이전 단계(주문서 작성 페이지)에서 sessionStorage에 저장해둔 정보를 불러옴
  // pendingPayment(결제 대기 정보)가 없으면 이 페이지에 직접 접근한 것으로 간주하고 에러 처리
  useEffect(() => {
    const pay = safeParse('pendingPayment');
    if (pay) setPendingPayment(pay);
    else setError('잘못된 접근이거나 결제 정보가 존재하지 않습니다.');
    setPendingOrder(safeParse('pendingOrder'));
    setOrderForm(safeParse('orderForm'));
  }, []);

  if (error && !pendingPayment) return (
    <div style={s.page}>
      <div style={{ ...s.inner, textAlign: 'center', paddingTop: '80px' }}>
        <div style={{ fontSize: '40px', marginBottom: '16px' }}>⚠️</div>
        <div style={{ fontSize: '16px', color: '#555', marginBottom: '8px' }}>잘못된 접근이거나 결제 정보가 존재하지 않습니다.</div>
        <button style={{ ...s.payBtn, width: 'auto', padding: '10px 24px', marginTop: '20px' }} onClick={() => navigate('/')}>홈으로</button>
      </div>
    </div>
  );

  if (!pendingPayment) return <div style={s.page}><div style={{ textAlign: 'center', padding: '80px', color: '#888' }}>로딩 중...</div></div>;

const { orderId, finalPrice, title,
        productPrice, shippingFee: payShippingFee,
        commission } = pendingPayment;
// pendingPayment(주문 생성 응답)에 값이 있으면 그걸 쓰고, 없으면 이전 단계의 pendingOrder 값으로 보완
const productAmount = productPrice   || pendingOrder?.productAmount || 0;
const shippingFee   = payShippingFee || pendingOrder?.shippingFee   || 0;
const sellerNick    = pendingOrder?.sellerNickname || '판매자';
const sellerBadge   = pendingOrder?.sellerBadge    || 'Bronze';

  const onPay = async () => {
    if (paying) return;
    setPaying(true);
    setError('');
    try {
      await new Promise((res) => setTimeout(res, 1500));
      await mockPay(orderId);
      sessionStorage.removeItem('orderForm');
      sessionStorage.removeItem('pendingOrder');
      sessionStorage.removeItem('pendingPayment');
      sessionStorage.setItem('completedOrder', JSON.stringify({
        orderId, finalPrice, title, method: selectedMethod,
        receiver: orderForm,
        productAmount, shippingFee, commission,
      }));
      setDone(true);
    } catch (e) {
      setError(e.message || '결제 중 오류가 발생했습니다.');
    } finally {
      setPaying(false);
    }
  };

  return (
    <div style={s.page}>
      <div style={s.inner}>

        {/* 스텝바 */}
        <div style={s.steps}>
          {STEPS.map((label, i) => {
            // done_: 위 done 상태(결제 완료 여부)와 이름이 겹쳐 접미사를 붙임 — 스텝바에서 i번째 단계가 완료로 표시될지 여부
            const done_ = done ? i <= 2 : i <= 1;
            const active = done ? i === 2 : i === 1;
            return (
              <div key={label} style={s.step}>
                {i < STEPS.length - 1 && <div style={s.stepLine} />}
                <div style={{ width: '28px', height: '28px', borderRadius: '50%', zIndex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px', background: done_ ? '#168f88' : '#fff', border: `2px solid ${done_ || active ? '#168f88' : '#ddd'}`, color: done_ ? '#fff' : active ? '#168f88' : '#ccc', fontWeight: '600' }}>
                  {done_ ? '✓' : i + 1}
                </div>
                <span style={{ fontSize: '11px', color: done_ || active ? '#168f88' : '#bbb' }}>{label}</span>
              </div>
            );
          })}
        </div>

        <div style={s.title}>{done ? '결제 완료' : '결제 진행'}</div>

        {/* ── 결제 진행 화면 ── */}
        {!done && (<>

          {/* 안전결제 배너 */}
          <div style={s.safeBanner}>
            <span style={{ fontSize: '22px' }}>🔒</span>
            <div>
              <div style={{ fontSize: '13px', fontWeight: '700', color: '#168f88' }}>네일드 안전결제로 구매자를 보호합니다</div>
              <div style={{ fontSize: '12px', color: '#5aa39e', marginTop: '2px' }}>결제 금액은 판매자 발송 확인 후 정산됩니다</div>
            </div>
          </div>

          {/* 주문 확인 */}
          <div style={s.card}>
            <div style={s.cardTitle}>주문 확인</div>
            <div style={s.row}><span style={s.rowLabel}>주문 번호</span><span style={{ fontFamily: 'monospace', fontSize: '13px' }}>{orderId}</span></div>
            <div style={s.row}><span style={s.rowLabel}>상품명</span><span style={{ fontWeight: '500' }}>{title}</span></div>
            <div style={s.row}><span style={s.rowLabel}>상품 금액</span><span>{productAmount.toLocaleString()}원</span></div>
            <div style={s.row}><span style={s.rowLabel}>배송비</span><span>{shippingFee === 0 ? '무료' : `${shippingFee.toLocaleString()}원`}</span></div>
            <div style={s.row}><span style={s.rowLabel}>수수료</span><span>{commission.toLocaleString()}원</span></div>
            <div style={s.rowTotal}><span>총 결제 금액</span><span>{(finalPrice || 0).toLocaleString()}원</span></div>
          </div>

          {/* 판매자 정보 */}
          <div style={s.card}>
            <div style={s.cardTitle}>판매자 정보</div>
            <div style={s.sellerRow}>
              <div style={{ width: '36px', height: '36px', borderRadius: '50%', background: '#e8f5f4', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '18px' }}>👤</div>
              <div>
                <div style={{ fontSize: '14px', fontWeight: '600', color: '#111' }}>{sellerNick}</div>
                <span style={s.badge(BADGE_COLOR[sellerBadge] || '#cd7f32')}>{sellerBadge}</span>
              </div>
            </div>
          </div>

          {/* 배송지 요약 */}
          {orderForm && (
            <div style={s.card}>
              <div style={s.cardTitle}>배송지 정보</div>
              <div style={s.infoRow}><span style={s.rowLabel}>받는 분</span><span>{orderForm.receiverName}</span></div>
              <div style={s.infoRow}><span style={s.rowLabel}>연락처</span><span>{orderForm.receiverPhone}</span></div>
              <div style={s.infoRow}><span style={s.rowLabel}>주소</span><span style={{ textAlign: 'right', maxWidth: '60%' }}>{orderForm.address} {orderForm.addressDetail}</span></div>
              {orderForm.deliveryRequest && (
                <div style={s.infoRow}><span style={s.rowLabel}>요청사항</span><span>{orderForm.deliveryRequest}</span></div>
              )}
            </div>
          )}

          {/* 결제 수단 */}
          <div style={s.card}>
            <div style={s.cardTitle}>결제 수단 선택</div>
            <div style={s.methodGrid}>
              {METHODS.map(({ id, icon, label }) => (
                <button key={id} style={s.methodBtn(selectedMethod === id)} onClick={() => setSelectedMethod(id)}>
                {['kakao', 'naver', 'toss'].includes(id)
                ? <img src={icon} alt={label} style={{ width: '35px', height: '35px', display: 'block', margin: '0 auto 4px', objectFit: 'contain' }} />
  : <span style={s.methodIcon}>{icon}</span>
}
                  <span>{label}</span>
                </button>
              ))}
            </div>
            {error && <div style={s.alertError}>{error}</div>}
            <button style={s.payBtn} onClick={onPay} disabled={paying}>
              {paying ? '처리 중...' : `${(finalPrice || 0).toLocaleString()}원 결제하기`}
            </button>
            {/* 돌아가기: 결제를 진행하지 않고 나가는 경우, 생성해 둔 주문을 자동으로 취소하고 이전 화면으로 이동 */}
            <button style={{ display: 'block', width: '100%', padding: '14px', background: '#fff', color: '#555', border: '1px solid #ddd', borderRadius: '10px', fontSize: '14px', cursor: 'pointer', marginTop: '8px' }}
                onClick={async () => {
                  try {
                    const buyerId = getCurrentMemberId();
                    if (pendingPayment?.orderId && buyerId) {
                      await axios.post(`/api/orders/${pendingPayment.orderId}/cancel?buyerId=${buyerId}`);
                    }
                  } catch {}
                  sessionStorage.removeItem('pendingPayment');
                  window.history.back();
                }}>돌아가기</button>
          </div>

          {/* 결제 취소 안내 */}
          <div style={s.noticeBanner}>
            💡 <strong>결제 취소 안내</strong><br />
            판매자가 배송 처리 전이라면 마이페이지에서 주문 취소가 가능합니다.<br />
            배송 시작 후에는 판매자와 직접 협의가 필요합니다.
          </div>

        </>)}

        {/* ── 결제 완료 화면 ── */}
        {done && (<>

          <div style={s.card}>
            <div style={s.alertSuccess}>✓ 결제가 완료되었습니다</div>

            <div style={s.cardTitle}>주문 확인</div>
            <div style={s.infoRow}><span style={s.rowLabel}>주문 번호</span><span style={{ fontFamily: 'monospace', fontSize: '13px' }}>{orderId}</span></div>
            <div style={s.infoRow}><span style={s.rowLabel}>상품명</span><span style={{ fontWeight: '500' }}>{title}</span></div>
            <div style={s.infoRow}><span style={s.rowLabel}>결제 수단</span><span>{METHOD_LABELS[selectedMethod]}</span></div>
            <div style={{ ...s.rowTotal, paddingTop: '10px' }}><span>결제 금액</span><span>{(finalPrice || 0).toLocaleString()}원</span></div>
          </div>

          {/* 배송지 */}
          {orderForm && (
            <div style={s.card}>
              <div style={s.cardTitle}>배송지 정보</div>
              <div style={s.infoRow}><span style={s.rowLabel}>받는 분</span><span>{orderForm.receiverName}</span></div>
              <div style={s.infoRow}><span style={s.rowLabel}>연락처</span><span>{orderForm.receiverPhone}</span></div>
              <div style={s.infoRow}><span style={s.rowLabel}>주소</span><span style={{ textAlign: 'right', maxWidth: '60%' }}>{orderForm.address} {orderForm.addressDetail}</span></div>
            </div>
          )}

          {/* 배송 예정 */}
          <div style={s.card}>
            <div style={s.cardTitle}>배송 안내</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '8px 0' }}>
              <span style={{ fontSize: '28px' }}>📦</span>
              <div>
                <div style={{ fontSize: '14px', fontWeight: '600', color: '#111' }}>오늘 출발 시 {getExpectedDelivery()} 도착 예정</div>
                <div style={{ fontSize: '12px', color: '#888', marginTop: '3px' }}>판매자 발송 후 택배사 사정에 따라 달라질 수 있습니다</div>
              </div>
            </div>
            <div style={{
              backgroundColor: '#F0FAFA',
              borderLeft: '3px solid #2A9D8F',
              borderRadius: '6px',
              padding: '14px 16px',
              marginTop: '12px'
            }}>
              <strong>취소 정책</strong>
              <ul style={{ marginTop: '8px', paddingLeft: '16px', lineHeight: '1.9' }}>
                <li>결제 완료 상태에서만 취소 가능합니다.</li>
                <li>주문 접수 이후에는 취소가 불가합니다.</li>
                <li>취소 시 상품은 자동으로 판매 상태로 전환됩니다.</li>
              </ul>
            </div>
          </div>

          <button style={s.payBtn} onClick={() => navigate(`/order/detail/${orderId}`)}>주문 상세 보기</button>
          <button style={{ display: 'block', width: '100%', padding: '14px', background: '#fff', color: '#555', border: '1px solid #ddd', borderRadius: '10px', fontSize: '14px', cursor: 'pointer', marginTop: '8px' }}
            onClick={() => navigate('/')}>홈으로 돌아가기</button>

        </>)}

      </div>
    </div>
  );
}
