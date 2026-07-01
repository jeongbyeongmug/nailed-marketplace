import AdminIcon from "./AdminIcon";

function SearchFilterBar({ data }) {
  return (
    <section className="admin-card search-filter-card">
      <div className="filter-row">
        <div className="filter-field search-field">
          <label htmlFor={`${data.title}-search`}>{data.searchLabel}</label>
          <div className="filter-input">
            <input id={`${data.title}-search`} type="search" placeholder={data.searchPlaceholder} />
            <AdminIcon name="search" />
          </div>
        </div>
        {data.filters.map((filter) => (
          <div className="filter-field" key={filter.label}>
            <label htmlFor={`${data.title}-${filter.label}`}>{filter.label}</label>
            <select id={`${data.title}-${filter.label}`} defaultValue="전체">
              {filter.options.map((option) => (
                <option key={option}>{option}</option>
              ))}
            </select>
          </div>
        ))}
        <button className="admin-primary-button" type="button">
          검색
        </button>
      </div>
      <div className="filter-tabs">
        {data.tabs.map((tab, index) => (
          <button className={index === 0 ? "is-active" : ""} type="button" key={tab}>
            {tab}
          </button>
        ))}
        <button className="reset-button" type="button">
          ↻ 초기화
        </button>
      </div>
    </section>
  );
}

export default SearchFilterBar;
