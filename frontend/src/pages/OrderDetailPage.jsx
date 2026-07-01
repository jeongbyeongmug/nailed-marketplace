import { useState, useEffect } from 'react';
import axios from 'axios';
import { navigate, getCurrentMemberId, safeParse, METHOD_LABELS } from '../utils/orderHelpers';
import { page, inner, card, cardTitle } from '../styles/orderShared';
import { API_BASE_URL } from '../api/config';

const STATUS_LABEL = {
  REQUESTED: '주문접수',
  PAID:      '결제완료',
  SHIPPING:  '배송중',
  DELIVERED: '배송완료',
  CANCELLED: '취소됨',
};

const STATUS_STEPS = [
  { key: 'PAID',      label: '결제완료' },
  { key: 'REQUESTED', label: '주문접수' },
  { key: 'SHIPPING',  label: '배송중'   },
  { key: 'DELIVERED', label: '배송완료' },
];

const CARRIERS = [
  { value: 'CJ',         label: 'CJ대한통운' },
  { value: 'LOGEN',      label: '로젠택배' },
  { value: 'HANJIN',     label: '한진택배' },
  { value: 'KOREA_POST', label: '우체국택배' },
  { value: 'LOTTE',      label: '롯데택배' },
];

const s = {
  page, inner,
  title: { fontSize: '22px', fontWeight: '700', color: '#111', marginBottom: '8px' },
  orderId: { fontSize: '13px', color: '#888', fontFamily: 'monospace', marginBottom: '24px', display: 'flex', alignItems: 'center', gap: '8px' },
  card, cardTitle,
  row: { display: 'flex', justifyContent: 'space-between', padding: '10px 0', borderBottom: '1px solid #f5f5f5', fontSize: '14px', gap: '12px' },
  rowLabel: { color: '#888', minWidth: '90px' },
  rowValue: { textAlign: 'right', wordBreak: 'break-all' },
  steps: { display: 'flex', padding: '20px 0 28px' },
  step: { flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px', position: 'relative' },
  stepLine: (done) => ({ position: 'absolute', top: '13px', left: '50%', width: '100%', height: '2px', background: done ? '#168f88' : '#e0e0e0' }),
  backBtn: { display: 'block', width: '100%', padding: '14px', background: '#fff', color: '#555', border: '1px solid #ddd', borderRadius: '10px', fontSize: '14px', cursor: 'pointer', marginTop: '8px', fontFamily: 'inherit' },
  badge: (status) => {
    const colors = { REQUESTED: ['#fff3e0','#f57c00'], PAID: ['#e8f5e9','#2e7d32'], SHIPPING: ['#e3f2fd','#1565c0'], DELIVERED: ['#f3e5f5','#6a1b9a'], CANCELLED: ['#ffebee','#c62828'] };
    const [bg, color] = colors[status] || ['#f5f5f5','#555'];
    return { display: 'inline-block', padding: '3px 10px', borderRadius: '20px', fontSize: '12px', fontWeight: '700', background: bg, color };
  },
  productRow: { display: 'flex', gap: '14px', alignItems: 'center' },
  productImg: { width: '64px', height: '64px', borderRadius: '8px', background: '#f0f0f0', objectFit: 'cover', flexShrink: 0 },
  input: { width: '100%', padding: '10px 14px', border: '1px solid #ddd', borderRadius: '8px', fontSize: '14px', color: '#111', background: '#fafafa', outline: 'none', boxSizing: 'border-box' },
  select: { width: '100%', padding: '10px 14px', border: '1px solid #ddd', borderRadius: '8px', fontSize: '14px', color: '#111', background: '#fafafa', outline: 'none', boxSizing: 'border-box', marginBottom: '12px' },
  shipBtn: { display: 'block', width: '100%', padding: '13px', background: '#168f88', color: '#fff', border: 'none', borderRadius: '8px', fontSize: '14px', fontWeight: '700', cursor: 'pointer' },
  shipBtnDisabled: { display: 'block', width: '100%', padding: '13px', background: '#ccc', color: '#fff', border: 'none', borderRadius: '8px', fontSize: '14px', fontWeight: '700', cursor: 'not-allowed' },
  label: { display: 'block', fontSize: '12px', color: '#888', marginBottom: '6px', fontWeight: '500' },
};

const fmt = (v) => v ? new Date(v).toLocaleString('ko-KR') : '-';
const won = (v) => v != null ? `${Number(v).toLocaleString()}원` : '-';

function getProductImageUrl(product) {
  if (product?.imageUrl) return `${API_BASE_URL}${product.imageUrl}`;
  if (Array.isArray(product?.imageUrls) && product.imageUrls.length > 0) {
    return `${API_BASE_URL}${product.imageUrls[0]}`;
  }
  return '';
}

export default function OrderDetail({ orderId }) {
  const [order,          setOrder]          = useState(null);
  const [product,        setProduct]        = useState(null);
  const [loading,        setLoading]        = useState(true);
  const [error,          setError]          = useState('');
  const [carrierCode,    setCarrierCode]    = useState('CJ');
  const [trackingNumber, setTrackingNumber] = useState('');
  const [submitting,     setSubmitting]     = useState(false);
  const [confirming,     setConfirming]     = useState(false);

  const currentMemberId = getCurrentMemberId();
  // 결제 직후 PaymentPage에서 저장해 둔 정보 (결제 수단, 상품명 등 주문 API 응답에 없는 값의 보조용)
  const completed = safeParse('completedOrder');

useEffect(() => {
  if (!orderId) { setError('주문 번호가 없습니다.'); setLoading(false); return; }
  
  axios.get(`/api/orders/${orderId}`)
    .then((orderRes) => {
      setOrder(orderRes.data);
      const pid = completed?.productId || orderRes.data?.productId;
      if (pid) {
        return axios.get(`/api/products/${pid}`).then((res) =>  setProduct(res.data.data ?? res.data));
      }
    })
    .catch(() => setError('주문 정보를 불러오지 못했습니다.'))
    .finally(() => setLoading(false));
}, [orderId]);

  // [판매자 전용] REQUESTED(주문접수) 상태에서만 호출 가능 — 운송장 등록 → 주문 상태가 SHIPPING으로 전환됨
  const handleShip = async () => {
    if (!carrierCode || !trackingNumber) return;
    setSubmitting(true);
    try {
      await axios.patch(`/api/orders/${orderId}/shipping`, {
        carrierCode,
        trackingNumber,
      });
      setOrder((prev) => ({
        ...prev,
        orderStatus:   'SHIPPING',
        carrierCode,
        trackingNumber,
        shippedAt:     new Date().toISOString(),
      }));
      alert('운송장이 등록되었습니다.');
      window.location.reload();
    } catch (e) {
      alert('운송장 등록에 실패했습니다.');
    } finally {
      setSubmitting(false);
    }
  };

  // [구매자 전용] SHIPPING(배송중) 상태에서만 호출 가능 — 배송완료 확인 → DELIVERED 처리 → 정산 확정
  const handleConfirmDelivery = async () => {
    if (confirming) return;
    setConfirming(true);
    try {
      await axios.patch(`/api/orders/${orderId}/delivered`);
      alert('배송완료 처리되었습니다. 판매자에게 정산됩니다.');
      window.location.reload();
    } catch (e) {
      alert('배송완료 처리에 실패했습니다.');
    } finally {
      setConfirming(false);
    }
  };
  // [구매자 전용] PAID(결제완료) 상태에서만 호출 가능 — 그 이후 단계(주문접수~)에서는 취소 불가
  const handleCancel = async () => {
    if (!window.confirm('정말 취소하시겠습니까?')) return;
    try {
      await axios.post(`/api/orders/${orderId}/cancel?buyerId=${currentMemberId}`);
      alert('주문이 취소되었습니다.');
      window.location.reload();
    } catch (e) {
      alert('주문 취소에 실패했습니다.');
    }
  };

  // [판매자 전용] PAID(결제완료) 상태에서만 호출 가능 — 주문 확인 처리 → 주문 상태가 REQUESTED로 전환됨
  const handleConfirmOrder = async () => {
    try {
      await axios.patch(`/api/orders/${orderId}/confirm?sellerId=${currentMemberId}`);
      alert('주문이 확인되었습니다.');
      window.location.reload();
    } catch (e) {
      alert('주문 확인에 실패했습니다.');
    }
  };

  if (loading) return <div style={s.page}><div style={{ textAlign: 'center', padding: '80px', color: '#888' }}>로딩 중...</div></div>;

  if (error || !order) return (
    <div style={s.page}>
      <div style={{ ...s.inner, textAlign: 'center', paddingTop: '80px' }}>
        <div style={{ fontSize: '40px', marginBottom: '16px' }}>⚠️</div>
        <div style={{ fontSize: '16px', color: '#555', marginBottom: '8px' }}>{error || '주문 정보를 찾을 수 없습니다.'}</div>
        <button style={{ ...s.backBtn, width: 'auto', padding: '10px 24px', marginTop: '20px', display: 'inline-block' }} onClick={() => navigate('/')}>홈으로</button>
      </div>
    </div>
  );

  const currentStep = STATUS_STEPS.findIndex((step) => step.key === order.orderStatus);
  const imageUrl = getProductImageUrl(product);
  const title = product?.title || completed?.title || '-';
  const isSeller = currentMemberId && currentMemberId === order.sellerId;
  const isBuyer = currentMemberId && currentMemberId === order.buyerId;
  const canConfirmOrder = isSeller && order.orderStatus === 'PAID';
  const canShip = isSeller && order.orderStatus === 'REQUESTED';
  const canConfirmDelivery = isBuyer && order.orderStatus === 'SHIPPING'; 

  return (
    <div style={s.page}>
      <div style={s.inner}>

        {/* 스텝바 */}
        {order.orderStatus !== 'CANCELLED' && (
          <div style={s.steps}>
            {STATUS_STEPS.map((step, i) => {
              const done = i <= currentStep;
              const active = i === currentStep;
              return (
                <div key={step.key} style={s.step}>
                 {i < STATUS_STEPS.length - 1 && <div style={s.stepLine(i < currentStep)} />}
                  <div style={{ width: '28px', height: '28px', borderRadius: '50%', zIndex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px', background: done ? '#168f88' : '#fff', border: `2px solid ${done || active ? '#168f88' : '#ddd'}`, color: done ? '#fff' : active ? '#168f88' : '#ccc', fontWeight: '600' }}>
                    {done ? '✓' : i + 1}
                  </div>
                  <span style={{ fontSize: '11px', color: done || active ? '#168f88' : '#bbb', whiteSpace: 'nowrap' }}>{step.label}</span>
                </div>
              );
            })}
          </div>
        )}

        <div style={s.title}>주문 상세 내역</div>
        <div style={s.orderId}>
          {order.orderId}
          <span style={s.badge(order.orderStatus)}>{STATUS_LABEL[order.orderStatus] || order.orderStatus}</span>
        </div>

        {/* 상품 정보 */}
        <div style={s.card}>
          <div style={s.cardTitle}>상품 정보</div>
          <div style={s.productRow}>
            {imageUrl && <img src={imageUrl} alt={title} style={s.productImg} />}
            <div>
              <div style={{ fontSize: '15px', fontWeight: '600', color: '#111', marginBottom: '4px' }}>{title}</div>
              <div style={{ fontSize: '17px', fontWeight: '700', color: '#168f88' }}>{won(order.finalPrice)}</div>
            </div>
          </div>
        </div>

        {/* 기본 정보 */}
        <div style={s.card}>
          <div style={s.cardTitle}>기본 정보</div>
          <div style={s.row}><span style={s.rowLabel}>주문 번호</span><span style={{ ...s.rowValue, fontFamily: 'monospace', fontSize: '13px' }}>{order.orderId}</span></div>
          <div style={{ ...s.row, borderBottom: 'none' }}><span style={s.rowLabel}>주문 상태</span><span style={s.rowValue}><span style={s.badge(order.orderStatus)}>{STATUS_LABEL[order.orderStatus] || order.orderStatus}</span></span></div>
        </div>

        {/* 결제 정보 */}
        <div style={s.card}>
          <div style={s.cardTitle}>결제 정보</div>
          <div style={s.row}><span style={s.rowLabel}>상품 금액</span><span style={s.rowValue}>{won(order.productPrice)}</span></div>
          <div style={s.row}><span style={s.rowLabel}>배송비</span><span style={s.rowValue}>{order.shippingFee === 0 ? '무료' : won(order.shippingFee)}</span></div>
          <div style={s.row}><span style={s.rowLabel}>수수료율</span><span style={s.rowValue}>{order.commission}%</span></div>
          <div style={{ ...s.row, color: '#168f88', fontWeight: '700' }}><span style={{ ...s.rowLabel, color: '#168f88' }}>최종 결제 금액</span><span style={{ ...s.rowValue, fontSize: '16px' }}>{won(order.finalPrice)}</span></div>
          {completed?.method && <div style={{ ...s.row, borderBottom: 'none' }}><span style={s.rowLabel}>결제 수단</span><span style={s.rowValue}>{METHOD_LABELS[completed.method] || completed.method}</span></div>}
        </div>

        {/* 배송지 */}
        <div style={s.card}>
          <div style={s.cardTitle}>배송지 정보</div>
          <div style={s.row}><span style={s.rowLabel}>수령자</span><span style={s.rowValue}>{order.receiverName}</span></div>
          <div style={s.row}><span style={s.rowLabel}>연락처</span><span style={s.rowValue}>{order.receiverPhone}</span></div>
          <div style={s.row}><span style={s.rowLabel}>주소</span><span style={s.rowValue}>[{order.receiverZipcode}] {order.receiverAddress} {order.receiverAddressDetail}</span></div>
          {order.deliveryRequest && <div style={{ ...s.row, borderBottom: 'none' }}><span style={s.rowLabel}>배송 요청</span><span style={s.rowValue}>{order.deliveryRequest}</span></div>}
        </div>

        {/* 주문 확인 - 판매자 + 결제완료 상태일 때만 */}
        {canConfirmOrder && (
          <div style={{ ...s.card, border: '1.5px solid #168f88' }}>
            <div style={s.cardTitle}>주문 확인</div>
            <p style={{ fontSize: '13px', color: '#888', margin: '0 0 14px' }}>
              주문을 확인하고 배송을 준비해주세요.
            </p>
            <button style={s.shipBtn} onClick={handleConfirmOrder}>
              주문 확인
            </button>
          </div>
        )}

        {/* 운송장 입력 - 판매자 + 주문접수 상태일 때만 */}
        {canShip && (
          <div style={{ ...s.card, border: '1.5px solid #168f88' }}>
            <div style={s.cardTitle}>운송장 등록</div>
            <div style={{ marginBottom: '12px' }}>
              <label style={s.label}>택배사 선택 *</label>
              <select style={s.select} value={carrierCode} onChange={(e) => setCarrierCode(e.target.value)}>
                {CARRIERS.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
              </select>
            </div>
            <div style={{ marginBottom: '16px' }}>
              <label style={s.label}>운송장 번호 *</label>
              <input
                style={s.input}
                type="text"
                placeholder="숫자만 입력하세요"
                maxLength={13}
                value={trackingNumber}
                onChange={(e) => setTrackingNumber(e.target.value.replace(/[^0-9]/g, ''))}
                onFocus={(e) => e.target.style.borderColor = '#168f88'}
                onBlur={(e) => e.target.style.borderColor = '#ddd'}
              />
            </div>
            <button
            style={carrierCode && trackingNumber.length >= 10 ? s.shipBtn : s.shipBtnDisabled}
            onClick={handleShip}
            disabled={!carrierCode || trackingNumber.length < 10 || submitting}
>
  {submitting ? '등록 중...' : '운송장 등록'}
</button>
          </div>
        )}

        {/* 운송장 조회 - 등록된 경우 */}
        {order.carrierCode && order.trackingNumber && (
          <div style={s.card}>
            <div style={s.cardTitle}>배송 추적</div>
            <div style={s.row}><span style={s.rowLabel}>택배사</span><span style={s.rowValue}>{CARRIERS.find((c) => c.value === order.carrierCode)?.label || order.carrierCode}</span></div>
            <div style={{ ...s.row, borderBottom: 'none' }}><span style={s.rowLabel}>운송장 번호</span><span style={{ ...s.rowValue, fontFamily: 'monospace' }}>{order.trackingNumber}</span></div>
          </div>
        )}

        {/* 배송완료 확인 - 구매자 + SHIPPING 상태일 때만 */}
        {canConfirmDelivery && (
          <div style={{ ...s.card, border: '1.5px solid #168f88' }}>
            <div style={s.cardTitle}>배송 확인</div>
            <p style={{ fontSize: '13px', color: '#888', margin: '0 0 14px' }}>
              상품을 받으셨나요? 배송완료 확인 시 판매자에게 정산됩니다.
            </p>
            <button
              style={s.shipBtn}
              onClick={handleConfirmDelivery}
              disabled={confirming}
            >
              {confirming ? '처리 중...' : '배송완료 확인'}
            </button>
          </div>
        )}

        {/* 타임라인 */}
        <div style={s.card}>
          <div style={s.cardTitle}>주문 타임라인</div>
          {[
            { label: '결제완료', val: order.paidAt },
            { label: '주문접수', val: order.requestedAt },
            { label: '배송중',   val: order.shippedAt },
            { label: '배송완료', val: order.deliveredAt },
            { label: '취소됨',  val: order.cancelledAt },
          ].filter((t) => t.val).map((t, i, arr) => (
            <div key={t.label} style={{ ...s.row, ...(i === arr.length - 1 ? { borderBottom: 'none' } : {}) }}>
              <span style={s.rowLabel}>{t.label}</span>
              <span style={{ ...s.rowValue, fontFamily: 'monospace', fontSize: '12px' }}>{fmt(t.val)}</span>
            </div>
          ))}
          {!order.paidAt && <div style={{ color: '#bbb', fontSize: '13px', textAlign: 'center' }}>타임라인 정보가 없습니다.</div>}
        </div>

        {isBuyer ? (
  <div style={{ display: 'flex', gap: '8px', marginTop: '8px' }}>
    {order.orderStatus === 'PAID' && (
      <button
        style={{ ...s.backBtn, marginTop: '0', flex: 1, color: '#c62828', borderColor: '#c62828' }}
        onClick={handleCancel}
      >
        주문 취소
      </button>
    )}
    <button
      style={{ ...s.backBtn, marginTop: '0', flex: 1 }}
      onClick={() => navigate('/')}
    >
      쇼핑 계속하기
    </button>
    <button
      style={{ ...s.backBtn, marginTop: '0', flex: 1, background: '#168f88', color: '#fff', border: 'none', fontWeight: '700' }}
      onClick={() => navigate('/mypage/orders')}
    >
      구매 내역으로
    </button>
  </div>
) : isSeller ? (
  <button
    style={{ ...s.backBtn, marginTop: '8px', background: '#168f88', color: '#fff', border: 'none', fontWeight: '700' }}
    onClick={() => navigate('/mypage/selling')}
  >
    판매 내역으로
  </button>
) : (
  <button
    style={{ ...s.backBtn, marginTop: '8px' }}
    onClick={() => navigate('/')}
  >
    홈으로
  </button>
)}

      </div>
    </div>
  );
}
