import { useState } from "react";
import Footer from "../components/common/Footer";
import Header from "../components/common/Header";
import { writeReview } from "../api/reviewApi";
import "../styles/review.css";

function navigate(path) {
  window.history.pushState({}, "", path);
  window.dispatchEvent(new PopStateEvent("popstate"));
}

const REVIEWED_ORDERS_KEY = "nailed_reviewed_orders";
function markOrderReviewed(orderId) {
  try {
    const list = JSON.parse(localStorage.getItem(REVIEWED_ORDERS_KEY) || "[]");
    if (!list.includes(orderId)) {
      localStorage.setItem(REVIEWED_ORDERS_KEY, JSON.stringify([...list, orderId]));
    }
  } catch {}
}

function StarInput({ value, onChange }) {
  const [hover, setHover] = useState(0);
  const display = hover || value;
  const labels = ["", "별로예요", "아쉬워요", "보통이에요", "좋아요", "최고예요"];
  return (
    <div className="star-input">
      {[1, 2, 3, 4, 5].map((n) => (
        <button
          key={n}
          type="button"
          className={`star-btn ${n <= display ? "on" : ""}`}
          onMouseEnter={() => setHover(n)}
          onMouseLeave={() => setHover(0)}
          onClick={() => onChange(n)}
          aria-label={`${n}점`}
        >★</button>
      ))}
      <span className="star-text">{labels[display] || "별점을 선택해 주세요"}</span>
    </div>
  );
}

function ReviewWritePage({ orderId, sellerId }) {
  const [rating, setRating] = useState(0);
  const [content, setContent] = useState("");
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (rating === 0) { setError("별점을 선택해 주세요."); return; }
    setLoading(true);
    setError("");
    try {
      await writeReview({ orderId, sellerId, rating, content: content.trim() || undefined });
      markOrderReviewed(orderId);
      setDone(true);
    } catch (err) { setError(err.message); }
    finally { setLoading(false); }
  };

  return (
    <div className="rw-page">
      <Header />
      <div className="rw-inner">
        {done ? (
          <div className="rw-done">
            <div className="rw-done-icon">✓</div>
            <h2 className="rw-done-title">후기가 등록되었습니다.</h2>
            <p className="rw-done-desc">소중한 후기 감사합니다.</p>
            <button className="rw-done-btn" onClick={() => navigate("/mypage/orders")}>구매 내역으로</button>
          </div>
        ) : (
          <>
            <button className="rw-back" onClick={() => window.history.back()}>‹ 돌아가기</button>
            <div className="rw-card">
              <div className="rw-card-header">
                <h1>거래 후기 작성</h1>
                <p>주문번호 <span className="rw-order-id">{orderId}</span>에 대한 후기를 남겨주세요.</p>
              </div>

              <form onSubmit={handleSubmit}>
                <div className="rw-card-body">
                  <div className="rw-field">
                    <span className="rw-label">별점</span>
                    <StarInput value={rating} onChange={setRating} />
                  </div>
                  <div className="rw-field">
                    <label className="rw-label" htmlFor="rv-content">
                      후기 내용 <span className="rw-optional">선택 · 최대 500자</span>
                    </label>
                    <textarea
                      id="rv-content"
                      className="rw-textarea"
                      placeholder="거래는 어떠셨나요? 자세한 후기를 남겨주세요."
                      maxLength={500}
                      rows={5}
                      value={content}
                      onChange={(e) => setContent(e.target.value)}
                    />
                    <span className="rw-char-count">{content.length}/500</span>
                  </div>
                  {error && <p className="rw-error">{error}</p>}
                </div>
                <div className="rw-card-footer">
                  <button type="button" className="rw-cancel" onClick={() => window.history.back()}>취소</button>
                  <button type="submit" className="rw-submit" disabled={loading || rating === 0}>
                    {loading ? "등록 중..." : "후기 등록"}
                  </button>
                </div>
              </form>
            </div>
          </>
        )}
      </div>
      <Footer />
    </div>
  );
}

export default ReviewWritePage;