import AdminIcon from "./AdminIcon";

function StatCard({ item }) {
  const content = (
    <>
      <span className="stat-icon">
        <AdminIcon name={item.icon} />
      </span>
      <div>
        <p>{item.label}</p>
        <strong>{item.value}</strong>
        {item.change ? (
          <span className={`stat-change ${item.trend === "down" ? "is-down" : ""}`}>
            {item.trend === "down" ? "↓" : "↑"} {item.change}
          </span>
        ) : null}
        <small>{item.caption}</small>
      </div>
    </>
  );

  if (item.onClick) {
    return (
      <button
        className="admin-stat-card admin-stat-card-button"
        type="button"
        onClick={item.onClick}
        aria-label={`${item.label} 관리 페이지로 이동`}
      >
        {content}
      </button>
    );
  }

  return (
    <article className="admin-stat-card">
      {content}
    </article>
  );
}

export default StatCard;
