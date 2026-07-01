const statusClass = {
  정상: "mint",
  판매중: "mint",
  결제완료: "mint",
  거래완료: "mint",
  처리완료: "mint",
  배송중: "blue",
  정지: "orange",
  숨김: "orange",
  처리중: "orange",
  탈퇴: "gray",
  취소: "red",
  미처리: "red",
};

function StatusBadge({ status }) {
  return <span className={`status-badge ${statusClass[status] || "gray"}`}>{status}</span>;
}

export default StatusBadge;
