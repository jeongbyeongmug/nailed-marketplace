function DonutChart({ title, center, items }) {
  const colors = {
    mint: "#b9f1df",
    green: "#31c48d",
    gray: "#a7a7a7",
    light: "#e6e6e6",
    red: "#ff8585",
    orange: "#ffbf59",
    blue: "#9ac8ff",
  };

  const segments = items.map((item, index) => {
    const numeric = Number.parseFloat(item.value);
    return `${colors[item.color] || colors.mint} ${index * 28}% ${Math.min(100, index * 28 + numeric)}%`;
  });

  return (
    <section className="admin-card donut-card">
      <div className="side-card-header">
        <h2>{title}</h2>
        <span>이번 달 기준</span>
      </div>
      <div className="donut-visual" style={{ background: `conic-gradient(${segments.join(", ")})` }}>
        <div>
          <span>{center.label}</span>
          <strong>{center.value}</strong>
        </div>
      </div>
      <ul className="donut-legend">
        {items.map((item) => (
          <li key={item.label}>
            <i className={`legend-${item.color}`} />
            <span>{item.label}</span>
            <strong>{item.value}</strong>
          </li>
        ))}
      </ul>
    </section>
  );
}

export default DonutChart;
