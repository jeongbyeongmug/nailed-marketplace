import { useState, useEffect} from 'react';
import { createOrder } from '../api/orderApi';
import axios from 'axios';
import { navigate, getCurrentMemberId, safeParse, COMMISSION_RATE } from '../utils/orderHelpers';
import { page, inner, card, cardTitle } from '../styles/orderShared';

const s = {
  page, inner,
  title: { fontSize: '22px', fontWeight: '700', color: '#111', marginBottom: '24px', paddingBottom: '16px', borderBottom: '2px solid #168f88' },
  card, cardTitle,
  productRow: { display: 'flex', gap: '14px', alignItems: 'center' },
  productImg: { width: '64px', height: '64px', borderRadius: '8px', background: '#f0f0f0', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '22px', flexShrink: 0 },
  productName: { fontSize: '15px', fontWeight: '600', color: '#111', marginBottom: '4px' },
  productPrice: { fontSize: '18px', fontWeight: '700', color: '#168f88' },
  row: { display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid #f5f5f5', fontSize: '14px' },
  rowLabel: { color: '#888' },
  rowTotal: { display: 'flex', justifyContent: 'space-between', padding: '12px 0 0', fontSize: '16px', fontWeight: '700', color: '#168f88' },
  formGroup: { marginBottom: '14px' },
  label: { display: 'block', fontSize: '12px', color: '#888', marginBottom: '6px', fontWeight: '500' },
  input: { width: '100%', padding: '10px 14px', border: '1px solid #ddd', borderRadius: '8px', fontSize: '14px', color: '#111', background: '#fafafa', outline: 'none', boxSizing: 'border-box' },
  agreeBox: { display: 'flex', alignItems: 'flex-start', gap: '10px', padding: '14px', background: '#f9fffe', border: '1px solid #d0eeec', borderRadius: '8px', marginBottom: '12px', cursor: 'pointer' },
  agreeText: { fontSize: '13px', color: '#333', lineHeight: 1.5 },
  checkbox: { width: '18px', height: '18px', accentColor: '#168f88', flexShrink: 0, marginTop: '1px', cursor: 'pointer' },
  btn: { display: 'block', width: '100%', padding: '16px', background: '#168f88', color: '#fff', border: 'none', borderRadius: '10px', fontSize: '16px', fontWeight: '700', cursor: 'pointer', transition: 'background 0.2s' },
  btnDisabled: { display: 'block', width: '100%', padding: '16px', background: '#ccc', color: '#fff', border: 'none', borderRadius: '10px', fontSize: '16px', fontWeight: '700', cursor: 'not-allowed' },
};

// 주문 진행 흐름: pendingOrder → orderForm → pendingPayment → completedOrder (sessionStorage 경유)
export default function OrderForm() {

 const [pendingOrder, setPendingOrder] = useState(null);

useEffect(() => {
  setPendingOrder(safeParse('pendingOrder', { productId: 1, title: '기본 상품', productAmount: 0, finalPrice: 0, shippingFee: 0 }));
}, []);
  const [form, setForm] = useState(() => safeParse('orderForm', {
    receiverName: '', receiverPhone: '', zipcode: '',
    address: '', addressDetail: '', deliveryRequest: '',
  }));
  const [agree1, setAgree1] = useState(false);
  const [addressTouched, setAddressTouched] = useState(false);
  const [paying, setPaying] = useState(false); 

// 결제 금액 미리보기 — 실제 금액은 주문 생성 시 백엔드에서 재계산됨
const productAmount    = pendingOrder?.productAmount || 0;
const shippingFee      = pendingOrder?.shippingFee || 0;
// 수수료는 10원 단위로 반올림 (백엔드 OrderService와 동일한 계산)
const rawCommission = (productAmount + shippingFee) * COMMISSION_RATE / 100;
const commission = Math.round(rawCommission / 10) * 10;
const finalPrice       = productAmount + shippingFee + commission;

  const isValidPhone   = /^\d{10,11}$/.test(form.receiverPhone);
  const isValidZipcode = /^\d{5}$/.test(form.zipcode);
  const canPay = agree1 && form.receiverName && isValidPhone && isValidZipcode && form.address;

  const onChange = (key) => (e) => {
    let val = e.target.value;
    if (key === 'receiverPhone' || key === 'zipcode') {
      val = val.replace(/[^0-9]/g, '');
    }
    if (key === 'receiverPhone' && val.length > 11) return;
    if (key === 'receiverName') {
      val = val.replace(/[^가-힣ㄱ-ㅎㅏ-ㅣ\s]/g, '');
    }
    // _buyerId: 다른 사용자가 로그인했을 때 ProductDetailPage에서 이 배송지가 본인 것인지 판별하는 용도
    const updated = { ...form, [key]: val, _buyerId: getCurrentMemberId() };
    setForm(updated);
    sessionStorage.setItem('orderForm', JSON.stringify(updated));
  };

  const handlePayment = async () => {
    if (!canPay || paying) return; 
    setPaying(true);

    // 이전에 결제 진행 중이던 주문(pendingPayment)이 남아있다면 취소 처리
    const existingPayment = sessionStorage.getItem('pendingPayment');
    if (existingPayment) {
      try {
        const existing = JSON.parse(existingPayment);
        const buyerId = getCurrentMemberId() || pendingOrder?.buyerId;
        await axios.post(`/api/orders/${existing.orderId}/cancel?buyerId=${buyerId}`);
      } catch (err) {
        console.error('이전 주문 자동 취소 실패:', err);
      }
    }
    sessionStorage.removeItem('pendingPayment'); 

    try {
      const orderData = {
        productId:             pendingOrder.productId,
        receiverName:          form.receiverName,
        receiverPhone:         form.receiverPhone,
        receiverZipcode:       form.zipcode,
        receiverAddress:       form.address,
        receiverAddressDetail: form.addressDetail,
        deliveryRequest:       form.deliveryRequest,
      };
      const buyerId = getCurrentMemberId() || pendingOrder.buyerId;
      const response = await createOrder(buyerId, pendingOrder.sellerId, orderData);
      
      if (response?.orderId) {
        sessionStorage.setItem('pendingPayment', JSON.stringify({
          orderId:                response.orderId,
          finalPrice:             response.finalPrice,
          productPrice:           response.productPrice,
          shippingFee:            response.shippingFee,
          commission:             response.finalPrice - response.sellerSettlementAmount,
          sellerSettlementAmount: response.sellerSettlementAmount,
          title:                  pendingOrder.title,
          productId:              pendingOrder.productId,
        }));
        navigate('/order/payment');
      }
} catch (error) {
      console.error('주문 처리 중 에러 발생:', error);

      // O012(락 획득 실패) / P002(이미 판매완료) → 동시 구매 충돌이므로 동일한 안내로 통일
      // 메시지 문자열 매칭 대신 백엔드 에러 코드로 분기 (문구가 바뀌어도 안 깨짐)
      const CONFLICT_CODES = ['O012', 'P002'];
      if (CONFLICT_CODES.includes(error?.code)) {
        alert('현재 다른 고객님이 결제를 진행 중인 상품입니다.');
      } else {
        alert('주문 요청에 실패했습니다.');
      }
    } finally {
      setPaying(false);
    }
  };

 const fields = [
  { key: 'receiverName',    label: '받는 분 성함 *',           placeholder: '홍길동' },
  { key: 'receiverPhone',   label: '연락처 * (숫자만, - 제외)', placeholder: '01012345678' },
  { key: 'zipcode',         label: '우편번호',                 placeholder: '우편번호 검색' },
  { key: 'address',         label: '주소 *',                  placeholder: '우편번호 검색 시 자동 입력됩니다' },
  { key: 'addressDetail',   label: '상세 주소',                placeholder: '101동 202호' },
  { key: 'deliveryRequest', label: '배송 요청사항',             placeholder: '문 앞에 놓아주세요' },
];

if (!pendingOrder) return <div style={s.page}><div style={{ textAlign: 'center', padding: '80px', color: '#888' }}>로딩 중...</div></div>
  return (
    <div style={s.page}>
      <div style={s.inner}>
        <div style={{ display: 'flex', padding: '20px 0 24px' }}>
  {['주문서', '결제', '완료'].map((label, i) => (
    <div key={label} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px', position: 'relative' }}>
      {i < 2 && <div style={{ position: 'absolute', top: '13px', left: '50%', width: '100%', height: '2px', background: '#e0e0e0' }} />}
      <div style={{ width: '28px', height: '28px', borderRadius: '50%', zIndex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px', background: i === 0 ? '#168f88' : '#fff', border: `2px solid ${i === 0 ? '#168f88' : '#ddd'}`, color: i === 0 ? '#fff' : '#ccc', fontWeight: '600' }}>
        {i === 0 ? '✓' : i + 1}
      </div>
      <span style={{ fontSize: '11px', color: i === 0 ? '#168f88' : '#bbb', whiteSpace: 'nowrap' }}>{label}</span>
    </div>
  ))}
</div>
        <div style={s.title}>주문서 작성</div>

        {/* 상품 정보 */}
        <div style={s.card}>
          <div style={s.cardTitle}>상품 정보</div>
          <div style={s.productRow}>
            {pendingOrder.imageUrl
              ? <img src={pendingOrder.imageUrl} alt={pendingOrder.title} style={{ width: '64px', height: '64px', borderRadius: '8px', objectFit: 'cover' }} />
              : <div style={s.productImg}>👕</div>
            }
            <div>
              <div style={s.productName}>{pendingOrder.title}</div>
              <div style={s.productPrice}>{(pendingOrder.productAmount || 0).toLocaleString()}원</div>
            </div>
          </div>
        </div>

        {/* 배송지 */}
        <div style={s.card}>
          <div style={s.cardTitle}>배송지 정보</div>
          {fields.map(({ key, label, placeholder }) => (
            <div style={s.formGroup} key={key}>
              <label style={s.label}>{label}</label>
              <input
                style={{ ...s.input, cursor: key === 'address' ? 'pointer' : 'text' }}
                value={form[key]}
                onChange={onChange(key)}
                placeholder={placeholder}
                readOnly={key === 'address' || key === 'zipcode'}
                onClick={() => {
                  if (key !== 'zipcode') return;
                  new window.daum.Postcode({
                    oncomplete: (data) => {
                      const updated = {
                       ...form,
                       address: data.roadAddress || data.jibunAddress,
                       zipcode: data.zonecode,
                       _buyerId: getCurrentMemberId(),
                      };
                      setForm(updated);
                      sessionStorage.setItem('orderForm', JSON.stringify(updated));
                      setAddressTouched(false);
                    }
                  }).open();
                }}
                onFocus={(e) => e.target.style.borderColor = '#168f88'}
                onBlur={(e) => {
                  e.target.style.borderColor = '#ddd';
                  if (key === 'address') setAddressTouched(true);
                }}
              />
              {key === 'receiverPhone' && form.receiverPhone.length > 11 && (
                <span style={{ fontSize: '12px', color: '#e05c5c', marginTop: '4px', display: 'block' }}>
                  숫자만 10~11자리 입력하세요
                </span>
              )}
              {key === 'zipcode' && form.zipcode.length > 5 && (
                <span style={{ fontSize: '12px', color: '#e05c5c', marginTop: '4px', display: 'block' }}>
                  우편번호는 숫자 5자리입니다
                </span>
              )}
              {key === 'address' && addressTouched && form.address && !/\d$/.test(form.address) && (
                <span style={{ fontSize: '12px', color: '#e05c5c', marginTop: '4px', display: 'block' }}>
                  번지/건물번호까지 입력해주세요 (예: 테헤란로 123)
                </span>
              )}
            </div>
          ))}
        </div>

        {/* 결제 금액 */}
        <div style={s.card}>
          <div style={s.cardTitle}>결제 금액</div>
          <div style={s.row}><span style={s.rowLabel}>상품 금액</span><span>{(pendingOrder.productAmount || 0).toLocaleString()}원</span></div>
          <div style={s.row}><span style={s.rowLabel}>배송비</span><span>{shippingFee === 0 ? '무료' : `${shippingFee.toLocaleString()}원`}</span></div>
          <div style={s.row}><span style={s.rowLabel}>수수료</span><span>{commission.toLocaleString()}원</span></div>
          <div style={s.rowTotal}><span>총 결제 금액</span><span>{finalPrice.toLocaleString()}원</span></div>
          </div>
        {/* 동의 */}
        <div style={s.card}>
          <div style={s.cardTitle}>결제 동의</div>
          <label style={s.agreeBox}>
            <input type="checkbox" style={s.checkbox} checked={agree1} onChange={(e) => setAgree1(e.target.checked)} />
            <span style={s.agreeText}>주문할 상품의 결제, 배송, 주문정보를 확인하였으며 이에 동의합니다. <span style={{ color: '#168f88', fontWeight: 600 }}>[필수]</span></span>
          </label>
        </div>

        <button style={canPay && !paying ? s.btn : s.btnDisabled} onClick={handlePayment} disabled={!canPay || paying}>
          {paying ? '처리 중...' : `${finalPrice.toLocaleString()}원 안전결제`}
        </button>
        {!canPay && !agree1 && <p style={{ textAlign: 'center', fontSize: '12px', color: '#e05c5c', marginTop: '8px' }}>배송지 입력 및 필수 동의를 완료해 주세요.</p>}
      </div>
    </div>
  );
}
