function RecentList({ title, items }) {
  return (
    <section className="admin-card recent-card">
      <div className="side-card-header">
        <h2>{title}</h2>
        <a href="/admin/dashboard">더보기 ›</a>
      </div>
      <ul>
        {items.map((item) => (
          <li key={`${item.title}-${item.subtitle}`}>
            <span className="recent-thumb" aria-hidden="true" />
            <div>
              <strong>{item.title}</strong>
              <small>{item.subtitle}</small>
            </div>
            <time>{item.meta}</time>
          </li>
        ))}
      </ul>
    </section>
  );
}

export default RecentList;
