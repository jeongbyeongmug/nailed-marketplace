import AdminIcon from "./AdminIcon";

function QuickPanel({ title = "빠른 작업", items }) {
  return (
    <section className="admin-card quick-panel">
      <h2>{title}</h2>
      <div className="quick-list">
        {items.map((item) => (
          <button type="button" key={item.title}>
            <span className="quick-icon">
              <AdminIcon name={item.icon} />
            </span>
            <span>
              <strong>{item.title}</strong>
              <small>{item.description}</small>
            </span>
            <b aria-hidden="true">→</b>
          </button>
        ))}
      </div>
    </section>
  );
}

export default QuickPanel;
