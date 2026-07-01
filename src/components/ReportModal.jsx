import { useState } from "react";
import { REPORT_REASONS, submitReport } from "../api/reportApi";
import "../styles/product-detail.css";

function ReportModal({ targetMemberId, targetNickname, onClose }) {
  const [reasonCode, setReasonCode] = useState("");
  const [detail, setDetail] = useState("");
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async () => {
    if (!reasonCode) return;
    setLoading(true);
    setError("");
    try {
      await submitReport({ targetMemberId, reasonCode, detail: detail.trim() || null });
      setDone(true);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="report-overlay" onClick={onClose}>
      <div className="report-box" onClick={(e) => e.stopPropagation()}>
        <button className="report-close" onClick={onClose} aria-label="닫기">×</button>

        {done ? (
          <div className="report-done">
            <div className="report-done-check">✓</div>
            <p className="report-done-title">신고가 접수되었습니다.</p>
            <p className="report-done-desc">검토 후 적절한 조치를 취하겠습니다.</p>
            <button className="report-done-btn" onClick={onClose}>확인</button>
          </div>
        ) : (
          <>
            <h2 className="report-title">신고 사유를 선택해 주세요.</h2>
            <ul className="report-reasons">
              {REPORT_REASONS.map(({ code, label }) => (
                <li key={code}>
                  <label className="report-reason-label">
                    <input
                      type="radio"
                      name="report-reason"
                      value={code}
                      checked={reasonCode === code}
                      onChange={() => setReasonCode(code)}
                    />
                    {label}
                  </label>
                </li>
              ))}
            </ul>
            <div className="report-detail-wrap">
              <textarea
                className="report-detail"
                placeholder="신고 사유를 자세히 적어주세요. (선택)"
                maxLength={500}
                value={detail}
                onChange={(e) => setDetail(e.target.value)}
              />
              <span className="report-detail-count">{detail.length}/500</span>
            </div>
            {error && <p style={{ fontSize: 13, color: "#d32f2f", margin: "-8px 0 12px" }}>{error}</p>}
            <button
              className={`report-submit ${reasonCode ? "ready" : ""}`}
              onClick={handleSubmit}
              disabled={loading || !reasonCode}
            >
              {loading ? "접수 중..." : "신고하기"}
            </button>
          </>
        )}
      </div>
    </div>
  );
}

export default ReportModal;
