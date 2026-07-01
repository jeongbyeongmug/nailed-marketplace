import { useEffect, useState } from "react";

const PRICE_PRESETS = [
  { label: "5만원 이하", max: 50000 },
  { label: "10만원 이하", max: 100000 },
  { label: "20만원 이하", max: 200000 },
  { label: "30만원 이하", max: 300000 },
  { label: "50만원 이하", max: 500000 },
];

function ProductFilterPanel({ filters, onApplyFilters, namePrefix = "product" }) {
  const [genderOpen, setGenderOpen] = useState(true);
  const [priceOpen, setPriceOpen] = useState(true);
  const [draftExcludeSold, setDraftExcludeSold] = useState(Boolean(filters.excludeSold));
  const [draftGender, setDraftGender] = useState(filters.gender || "");
  const [minInput, setMinInput] = useState(filters.minPrice ? String(filters.minPrice) : "");
  const [maxInput, setMaxInput] = useState(filters.maxPrice ? String(filters.maxPrice) : "");

  useEffect(() => {
    setDraftExcludeSold(Boolean(filters.excludeSold));
    setDraftGender(filters.gender || "");
    setMinInput(filters.minPrice ? String(filters.minPrice) : "");
    setMaxInput(filters.maxPrice ? String(filters.maxPrice) : "");
  }, [filters]);

  function applyPreset(max) {
    setMinInput("");
    setMaxInput(String(max));
  }

  function handleApply(event) {
    event.preventDefault();
    onApplyFilters({
      excludeSold: draftExcludeSold,
      gender: draftGender,
      minPrice: minInput.trim(),
      maxPrice: maxInput.trim(),
    });
  }

  return (
    <aside className="up-sidebar product-filter-sidebar" aria-label="상품 필터">
      <form onSubmit={handleApply}>
        <p className="up-sidebar-title">필터</p>

        <div className="up-filter-check">
          <label>
            <input
              type="checkbox"
              checked={draftExcludeSold}
              onChange={(event) => setDraftExcludeSold(event.target.checked)}
            />
            품절 상품 제외
          </label>
        </div>

        <div className="up-filter-group">
          <button type="button" className="up-filter-head" onClick={() => setGenderOpen((open) => !open)}>
            성별 <span className={`up-filter-arrow ${genderOpen ? "open" : ""}`}>›</span>
          </button>
          {genderOpen && (
            <ul className="up-filter-list">
              {[
                { value: "", label: "전체" },
                { value: "MENS", label: "남성" },
                { value: "WOMENS", label: "여성" },
              ].map(({ value, label }) => (
                <li key={label}>
                  <label>
                    <input
                      type="radio"
                      name={`${namePrefix}-gender-filter`}
                      checked={draftGender === value}
                      onChange={() => setDraftGender(value)}
                    />
                    {label}
                  </label>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="up-filter-group">
          <button type="button" className="up-filter-head" onClick={() => setPriceOpen((open) => !open)}>
            가격 <span className={`up-filter-arrow ${priceOpen ? "open" : ""}`}>›</span>
          </button>
          {priceOpen && (
            <div className="up-price-body">
              <div className="up-price-range">
                <input
                  className="up-price-input"
                  type="number"
                  placeholder="0"
                  value={minInput}
                  onChange={(event) => setMinInput(event.target.value)}
                  min={0}
                />
                <span className="up-price-dash">-</span>
                <input
                  className="up-price-input"
                  type="number"
                  placeholder="0"
                  value={maxInput}
                  onChange={(event) => setMaxInput(event.target.value)}
                  min={0}
                />
              </div>
              <ul className="up-price-presets">
                {PRICE_PRESETS.map(({ label, max }) => (
                  <li key={max}>
                    <button type="button" className="up-price-preset-btn" onClick={() => applyPreset(max)}>
                      {label}
                    </button>
                  </li>
                ))}
              </ul>
              <button type="submit" className="up-price-apply">
                적용
              </button>
            </div>
          )}
        </div>
      </form>
    </aside>
  );
}

export default ProductFilterPanel;
