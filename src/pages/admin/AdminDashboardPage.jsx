import { useEffect, useState } from "react";
import StatCard from "../../components/admin/StatCard";
import { getAdminDashboard, getDashboardTrends } from "../../api/adminApi";

const TREND_PERIODS = {
  DAILY: { label: "일별", range: 30 },
  MONTHLY: { label: "월별", range: 12 },
};

// 매출 추이 차트의 두 줄: 거래액(전체 결제금액)과 사이트 매출(수수료)
const SALES_SERIES = [
  { key: "transactionAmount", label: "거래액", color: "#9ac8ff", fill: "rgba(154, 200, 255, 0.18)" },
  { key: "sales", label: "사이트 매출(수수료)", color: "#ff6b6b", fill: null },
];

const MEMBER_SERIES = [
  { key: "members", label: "신규 가입자", color: "#6c7bff", fill: "rgba(108, 123, 255, 0.16)" },
];

// 도넛(원형) 그래프: 주문 상태별 비율
const ORDER_STATUS_SEGMENTS = [
  { key: "requestedOrders", label: "주문접수", color: "#f4a259" },
  { key: "paidOrders", label: "결제완료", color: "#4c9be8" },
  { key: "shippingOrders", label: "배송중", color: "#9b8cff" },
  { key: "deliveredOrders", label: "배송완료", color: "#31c48d" },
  { key: "cancelledOrders", label: "취소", color: "#ff8585" },
];

function numberValue(value) {
  const number = Number(value);
  return Number.isFinite(number) ? number : 0;
}

function formatNumber(value) {
  return numberValue(value).toLocaleString("ko-KR");
}

function formatWon(value) {
  return `${formatNumber(value)}원`;
}

// 큰 금액을 축약 표기 (예: 123450000 -> 1.2억, 38500000 -> 3,850만)
function formatMoneyShort(value) {
  const number = numberValue(value);
  if (number >= 100000000) return `${(number / 100000000).toFixed(1)}억`;
  if (number >= 10000) return `${Math.round(number / 10000).toLocaleString("ko-KR")}만`;
  return number.toLocaleString("ko-KR");
}

function percent(part, total) {
  const safeTotal = numberValue(total);
  if (safeTotal <= 0) return 0;
  return Math.round((numberValue(part) / safeTotal) * 1000) / 10;
}

function formatSalesValue(value, isAxis) {
  return isAxis ? formatMoneyShort(value) : formatWon(value);
}

function formatMemberValue(value, isAxis) {
  return isAxis ? formatNumber(value) : `${formatNumber(value)}명`;
}

function chartX(index, length, width, padding) {
  if (length === 1) return width / 2;
  return padding + (index / (length - 1)) * (width - padding * 2);
}

function chartY(value, maxValue, height, padding) {
  return height - padding - (value / maxValue) * (height - padding * 2);
}

function buildLinePath(values, maxValue, width, height, padding) {
  return values
    .map((value, index) => {
      const x = chartX(index, values.length, width, padding);
      const y = chartY(value, maxValue, height, padding);
      return `${index === 0 ? "M" : "L"} ${x} ${y}`;
    })
    .join(" ");
}

function buildAreaPath(values, maxValue, width, height, padding) {
  const baseY = height - padding;
  const firstX = chartX(0, values.length, width, padding);
  const lastX = chartX(values.length - 1, values.length, width, padding);
  return `${buildLinePath(values, maxValue, width, height, padding)} L ${lastX} ${baseY} L ${firstX} ${baseY} Z`;
}

function formatAxisLabel(label, period) {
  if (!label) return "";
  if (period === "MONTHLY") {
    const month = label.match(/^\d{4}-(\d{2})$/);
    return month ? `${month[1]}월` : label;
  }
  const day = label.match(/^\d{4}-(\d{2}-\d{2})$/);
  return day ? day[1] : label;
}

function getVisibleLabels(labels, period) {
  if (labels.length <= 12) {
    return labels.map((label, index) => ({ label: formatAxisLabel(label, period), index }));
  }
  const step = Math.ceil(labels.length / 6);
  return labels
    .map((label, index) => ({ label: formatAxisLabel(label, period), index }))
    .filter((item) => item.index === 0 || item.index === labels.length - 1 || item.index % step === 0);
}

function buildTrendSummary(points, series, formatValue, showAverage = true) {
  return series.flatMap((seriesItem) => {
    const values = points.map((point) => numberValue(point[seriesItem.key]));
    const total = values.reduce((sum, value) => sum + value, 0);
    const average = values.length ? Math.round(total / values.length) : 0;
    const items = [{ label: `${seriesItem.label} 합계`, value: formatValue(total) }];
    if (showAverage) items.push({ label: `${seriesItem.label} 평균`, value: formatValue(average) });
    return items;
  });
}

function ChartLegend({ series }) {
  return (
    <ul className="chart-legend" style={{ display: "flex", gap: 16, listStyle: "none", margin: "0 0 10px", padding: 0 }}>
      {series.map((item) => (
        <li key={item.key} style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, fontWeight: 800, color: "var(--admin-muted)" }}>
          <i style={{ background: item.color }} />
          <span>{item.label}</span>
        </li>
      ))}
    </ul>
  );
}

function TrendChart({ points, series, period, formatValue }) {
  const width = 960;
  const height = 280;
  const padding = 44;

  const allValues = series.flatMap((item) => points.map((point) => numberValue(point[item.key])));
  const maxValue = Math.max(...allValues, 0);

  if (!points.length || maxValue <= 0) {
    return (
      <div className="trend-chart-wrap" style={{ display: "grid", placeItems: "center", minHeight: 218, color: "var(--admin-muted)", fontSize: 13 }}>
        표시할 통계 데이터가 없습니다.
      </div>
    );
  }

  const labels = points.map((point) => point.label || "");
  const visibleLabels = getVisibleLabels(labels, period);
  const yTicks = [maxValue, maxValue / 2, 0];

  return (
    <div className="trend-chart-wrap">
      <svg className="trend-chart" viewBox={`0 0 ${width} ${height}`} role="img" aria-label="추이 차트">
        {yTicks.map((tick) => {
          const y = chartY(tick, maxValue, height, padding);
          return (
            <g key={tick}>
              <line className="trend-grid-line" x1={padding} y1={y} x2={width - padding} y2={y} />
              <text x={padding - 8} y={y + 4} textAnchor="end" style={{ fontSize: 11, fontWeight: 700, fill: "#9aa0aa" }}>
                {formatValue(tick, true)}
              </text>
            </g>
          );
        })}

        {series.map((item) => {
          const values = points.map((point) => numberValue(point[item.key]));
          return (
            <g key={item.key}>
              {item.fill && (
                <path d={buildAreaPath(values, maxValue, width, height, padding)} fill={item.fill} stroke="none" />
              )}
              <path className="trend-line" style={{ stroke: item.color, fill: "none" }} d={buildLinePath(values, maxValue, width, height, padding)} />
              {values.map((value, index) => {
                const x = chartX(index, values.length, width, padding);
                const y = chartY(value, maxValue, height, padding);
                return (
                  <circle className="trend-line-dot" style={{ stroke: item.color }} cx={x} cy={y} r="3.5" key={`${item.key}-${index}`}>
                    <title>{`${labels[index]} · ${item.label}: ${formatValue(value)}`}</title>
                  </circle>
                );
              })}
            </g>
          );
        })}
      </svg>
      <div className="trend-chart-labels" style={{ gridTemplateColumns: `repeat(${visibleLabels.length}, minmax(0, 1fr))` }}>
        {visibleLabels.map((item) => (
          <span key={`${item.label}-${item.index}`}>{item.label}</span>
        ))}
      </div>
    </div>
  );
}

function TrendBody({ points, series, period, formatValue, loading, errorMessage, showAverage = true }) {
  if (loading) return <p className="admin-inquiry-message">통계 데이터를 불러오는 중입니다.</p>;
  if (errorMessage) return <p className="admin-inquiry-message">{errorMessage}</p>;

  const summary = buildTrendSummary(points, series, (value) => formatValue(value, false), showAverage);

  return (
    <div className="trend-card-body">
      <TrendChart points={points} series={series} period={period} formatValue={formatValue} />
      <dl className="trend-summary-panel">
        {summary.map((item) => (
          <div key={item.label}>
            <dt>{item.label}</dt>
            <dd>{item.value}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}

function OrderStatusDonut({ orders }) {
  const items = ORDER_STATUS_SEGMENTS.map((segment) => ({
    ...segment,
    count: numberValue(orders[segment.key]),
  }));
  const total = items.reduce((sum, item) => sum + item.count, 0);

  let cumulative = 0;
  const gradientStops = items.map((item) => {
    const start = total > 0 ? (cumulative / total) * 100 : 0;
    cumulative += item.count;
    const end = total > 0 ? (cumulative / total) * 100 : 0;
    return `${item.color} ${start}% ${end}%`;
  });
  const background = total > 0 ? `conic-gradient(${gradientStops.join(", ")})` : "#e6e6e6";

  return (
    <section className="admin-card donut-card">
      <div className="side-card-header">
        <h2>주문 상태 비율</h2>
        <span>전체 {formatNumber(total)}건</span>
      </div>
      <div className="donut-visual" style={{ background }}><div /></div>
      <ul className="donut-legend">
        {items.map((item) => (
          <li key={item.key}>
            <i style={{ background: item.color }} />
            <span>{item.label}</span>
            <strong>{formatNumber(item.count)}건 ({percent(item.count, total)}%)</strong>
          </li>
        ))}
      </ul>
    </section>
  );
}

function navigateAdmin(path) {
  window.history.pushState({}, "", path);
  window.dispatchEvent(new PopStateEvent("popstate"));
}

function AdminDashboardPage() {
  const [dashboard, setDashboard] = useState(null);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [trendPeriod, setTrendPeriod] = useState("DAILY");
  const [trendPoints, setTrendPoints] = useState([]);
  const [trendLoading, setTrendLoading] = useState(false);
  const [trendErrorMessage, setTrendErrorMessage] = useState("");
  const [memberTrendPoints, setMemberTrendPoints] = useState([]);
  const [memberTrendLoading, setMemberTrendLoading] = useState(false);
  const [memberTrendErrorMessage, setMemberTrendErrorMessage] = useState("");

  useEffect(() => {
    let ignore = false;

    async function loadDashboard() {
      setLoading(true);
      setErrorMessage("");

      try {
        const data = await getAdminDashboard();
        if (!ignore) setDashboard(data || {});
      } catch (error) {
        if (!ignore) {
          setDashboard(null);
          setErrorMessage(error.message || "대시보드 통계를 불러오지 못했습니다.");
        }
      } finally {
        if (!ignore) setLoading(false);
      }
    }

    loadDashboard();

    return () => {
      ignore = true;
    };
  }, []);

  useEffect(() => {
    let ignore = false;

    async function loadTrends() {
      setTrendLoading(true);
      setTrendErrorMessage("");

      try {
        const data = await getDashboardTrends({
          period: trendPeriod,
          range: TREND_PERIODS[trendPeriod].range,
        });
        if (!ignore) setTrendPoints(Array.isArray(data?.points) ? data.points : []);
      } catch (error) {
        if (!ignore) {
          setTrendPoints([]);
          setTrendErrorMessage(error.message || "통계 데이터를 불러오지 못했습니다.");
        }
      } finally {
        if (!ignore) setTrendLoading(false);
      }
    }

    loadTrends();

    return () => {
      ignore = true;
    };
  }, [trendPeriod]);

  useEffect(() => {
    let ignore = false;

    async function loadMemberTrends() {
      setMemberTrendLoading(true);
      setMemberTrendErrorMessage("");

      try {
        const data = await getDashboardTrends({ period: "MONTHLY", range: 12 });
        if (!ignore) setMemberTrendPoints(Array.isArray(data?.points) ? data.points : []);
      } catch (error) {
        if (!ignore) {
          setMemberTrendPoints([]);
          setMemberTrendErrorMessage(error.message || "통계 데이터를 불러오지 못했습니다.");
        }
      } finally {
        if (!ignore) setMemberTrendLoading(false);
      }
    }

    loadMemberTrends();

    return () => {
      ignore = true;
    };
  }, []);

  const members = dashboard?.members || {};
  const products = dashboard?.products || {};
  const orders = dashboard?.orders || {};
  const reports = dashboard?.reports || {};
  const inquiries = dashboard?.inquiries || {};
  const sales = dashboard?.sales || {};

  const totalMembers = numberValue(members.totalMembers);
  const totalProducts = numberValue(products.totalProducts);
  const validOrderCount = numberValue(sales.deliveredOrderCount);
  const transactionAmount = numberValue(sales.transactionAmount);
  const commissionRevenue = numberValue(sales.commissionRevenue);
  const totalReports = numberValue(reports.totalReports);
  const pendingReports = numberValue(reports.approvedReports);
  const totalInquiries = numberValue(inquiries.totalInquiries);

  const statCards = [
    {
      label: "전체 회원",
      value: formatNumber(totalMembers),
      caption: `일반 ${formatNumber(members.userMembers)} / 관리자 ${formatNumber(members.adminMembers)}`,
      icon: "userPlus",
      onClick: () => navigateAdmin("/admin/members"),
    },
    {
      label: "전체 상품",
      value: formatNumber(totalProducts),
      caption: `판매중 ${formatNumber(products.onSaleProducts)} / 판매완료 ${formatNumber(products.soldProducts)}`,
      icon: "tag",
      onClick: () => navigateAdmin("/admin/products"),
    },
    {
      label: "신고 건수",
      value: formatNumber(totalReports),
      caption: `미처리 ${formatNumber(pendingReports)} / 반려 ${formatNumber(reports.rejectedReports)} / 완료 ${formatNumber(reports.doneReports)}`,
      icon: "alert",
      onClick: () => navigateAdmin("/admin/reports"),
    },
    {
      label: "유효 거래 건수",
      value: formatNumber(validOrderCount),
      caption: "결제 이후 진행·완료 주문",
      icon: "cart",
      onClick: () => navigateAdmin("/admin/orders"),
    },
    {
      label: "문의 건수",
      value: formatNumber(totalInquiries),
      caption: `미답변 ${formatNumber(inquiries.pendingInquiries)} / 답변 ${formatNumber(inquiries.answeredInquiries)}`,
      icon: "document",
      onClick: () => navigateAdmin("/admin/inquiries"),
    },
  ];

  return (
    <div className="admin-page dashboard-page">
      {loading && <p className="admin-inquiry-message">대시보드 통계를 불러오는 중입니다.</p>}
      {errorMessage && <p className="admin-inquiry-message">{errorMessage}</p>}

      <div className="admin-stat-grid dashboard-total-grid">
        {statCards.map((item) => (
          <StatCard item={item} key={item.label} />
        ))}
      </div>

      <div className="dashboard-upper-grid">
        <section className="admin-card dashboard-chart-card" style={{ padding: 16 }}>
          <div className="dashboard-section-head">
            <div>
              <h2>매출 추이</h2>
              <p>{TREND_PERIODS[trendPeriod].label} · 거래액과 사이트 매출(수수료)</p>
            </div>
            <div className="trend-period-toggle" aria-label="통계 기간 선택">
              {Object.entries(TREND_PERIODS).map(([value, option]) => (
                <button
                  type="button"
                  className={trendPeriod === value ? "is-active" : ""}
                  key={value}
                  onClick={() => setTrendPeriod(value)}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>
          <ChartLegend series={SALES_SERIES} />
          <TrendBody
            points={trendPoints}
            series={SALES_SERIES}
            period={trendPeriod}
            formatValue={formatSalesValue}
            loading={trendLoading}
            errorMessage={trendErrorMessage}
          />
        </section>

        <OrderStatusDonut orders={orders} />
      </div>

      <section className="admin-card dashboard-chart-card" style={{ padding: 16 }}>
        <div className="dashboard-section-head">
          <div>
            <h2>신규 가입자 추이</h2>
            <p>월별 신규 가입 회원 수</p>
          </div>
        </div>
        <TrendBody
          points={memberTrendPoints}
          series={MEMBER_SERIES}
          period="MONTHLY"
          formatValue={formatMemberValue}
          loading={memberTrendLoading}
          errorMessage={memberTrendErrorMessage}
          showAverage={false}
        />
      </section>
    </div>
  );
}

export default AdminDashboardPage;
