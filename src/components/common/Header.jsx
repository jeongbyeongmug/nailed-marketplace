import { useEffect, useState } from "react";
import { logout } from "../../api/authApi";
import { useCategories } from "../../hooks/useCategories";
import {
  clearSearchHistory,
  getSearchHistory,
  removeSearchHistory,
  saveSearchHistory,
} from "../../utils/searchHistory";

const ACCESS_TOKEN_KEY = "accessToken";
const SESSION_KEY = "nailed_session";

const menuItems = [
  { label: "마이페이지", icon: "userCircle", href: "/mypage" },
  { label: "판매", icon: "shoppingBag", href: "/sell" },
  { label: "고객센터", icon: "headphones", href: "/customer-center" },
];

const iconProps = {
  width: 24,
  height: 24,
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.8,
  strokeLinecap: "round",
  strokeLinejoin: "round",
};

const quickIcons = {
  shoppingBag: (
    <svg viewBox="0 0 24 24" role="img" focusable="false" {...iconProps}>
      <path d="M6.5 8.5h11l1 11h-13l1-11Z" />
      <path d="M9 8.5V7a3 3 0 0 1 6 0v1.5" />
    </svg>
  ),
  logIn: (
    <svg viewBox="0 0 24 24" role="img" focusable="false" {...iconProps}>
      <path d="M10 7V5.5A2.5 2.5 0 0 1 12.5 3h5A2.5 2.5 0 0 1 20 5.5v13a2.5 2.5 0 0 1-2.5 2.5h-5A2.5 2.5 0 0 1 10 18.5V17" />
      <path d="M4 12h10" />
      <path d="m11 8 4 4-4 4" />
    </svg>
  ),
  userPlus: (
    <svg viewBox="0 0 24 24" role="img" focusable="false" {...iconProps}>
      <path d="M15 20a6 6 0 0 0-12 0" />
      <path d="M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8Z" />
      <path d="M19 8v6" />
      <path d="M16 11h6" />
    </svg>
  ),
  userCircle: (
    <svg viewBox="0 0 24 24" role="img" focusable="false" {...iconProps}>
      <path d="M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18Z" />
      <path d="M12 12a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z" />
      <path d="M6.4 18a6 6 0 0 1 11.2 0" />
    </svg>
  ),
  headphones: (
    <svg viewBox="0 0 24 24" role="img" focusable="false" {...iconProps}>
      <path d="M4 13a8 8 0 0 1 16 0" />
      <path d="M4 13v4a2 2 0 0 0 2 2h1v-6H6a2 2 0 0 0-2 2" />
      <path d="M20 13v4a2 2 0 0 1-2 2h-1v-6h1a2 2 0 0 1 2 2" />
      <path d="M18 19a4 4 0 0 1-4 2h-2" />
    </svg>
  ),
};

function QuickIcon({ name }) {
  return quickIcons[name] || name;
}

function hasAuthSession() {
  return Boolean(
    window.sessionStorage.getItem(ACCESS_TOKEN_KEY) &&
      window.sessionStorage.getItem(SESSION_KEY),
  );
}

function Header() {
  const categories = useCategories();
  const [isLoggedIn, setIsLoggedIn] = useState(hasAuthSession);
  const [searchKeyword, setSearchKeyword] = useState(() => {
    if (window.location.pathname !== "/search") {
      return "";
    }

    return new URLSearchParams(window.location.search).get("keyword") || "";
  });
  const authMenuItems = isLoggedIn
    ? [
        { label: "로그아웃", icon: "↪", href: "/" },
      ]
    : [
        { label: "회원가입", icon: "userPlus", href: "/signup" },
        { label: "로그인", icon: "logIn", href: "/login" },
      ];
  const quickMenuItems = [...menuItems, ...authMenuItems];
  const [activeCategory, setActiveCategory] = useState(null);
  const [searchHistory, setSearchHistory] = useState(getSearchHistory);
  const [showHistoryDropdown, setShowHistoryDropdown] = useState(false);

  useEffect(() => {
    const syncLoginState = () => {
      setIsLoggedIn(hasAuthSession());
    };

    window.addEventListener("storage", syncLoginState);
    return () => window.removeEventListener("storage", syncLoginState);
  }, []);

  useEffect(() => {
    const closeCategoryMenu = () => {
      setActiveCategory(null);
    };

    const closeCategoryMenuOnOutsideClick = (event) => {
      if (event.target.closest(".category-menu-area")) {
        return;
      }

      setActiveCategory(null);
    };

    window.addEventListener("popstate", closeCategoryMenu);
    document.addEventListener("click", closeCategoryMenuOnOutsideClick);

    return () => {
      window.removeEventListener("popstate", closeCategoryMenu);
      document.removeEventListener("click", closeCategoryMenuOnOutsideClick);
    };
  }, []);

  const handleMenuClick = async (event, item) => {
    if (item.label !== "로그아웃") {
      return;
    }

    event.preventDefault();
    await logout();
    setIsLoggedIn(false);
    window.history.pushState({}, "", "/");
    window.dispatchEvent(new PopStateEvent("popstate"));
  };

  const executeSearch = (keyword = searchKeyword) => {
    const trimmed = keyword.trim();
    const hasSearchText = /[\p{L}\p{N}]/u.test(trimmed);

    if (!trimmed || !hasSearchText) {
      return;
    }

    saveSearchHistory(trimmed);
    setSearchHistory(getSearchHistory());
    setShowHistoryDropdown(false);

    window.history.pushState(
      {},
      "",
      `/search?keyword=${encodeURIComponent(trimmed)}`,
    );
    window.dispatchEvent(new PopStateEvent("popstate"));
  };

  const handleSearchFocus = () => {
    const history = getSearchHistory();
    setSearchHistory(history);
    if (history.length > 0) {
      setShowHistoryDropdown(true);
    }
  };

  const handleSearchBlur = () => {
    setTimeout(() => setShowHistoryDropdown(false), 150);
  };

  const handleHistoryItemClick = (keyword) => {
    setSearchKeyword(keyword);
    executeSearch(keyword);
  };

  const handleRemoveHistory = (event, keyword) => {
    event.stopPropagation();
    removeSearchHistory(keyword);
    const updated = getSearchHistory();
    setSearchHistory(updated);
    if (updated.length === 0) {
      setShowHistoryDropdown(false);
    }
  };

  const handleClearHistory = () => {
    clearSearchHistory();
    setSearchHistory([]);
    setShowHistoryDropdown(false);
  };

  const handleSearchSubmit = (event) => {
    event.preventDefault();
    executeSearch();
  };

  const handleSearchKeyDown = (event) => {
    if (event.key !== "Enter") {
      return;
    }

    event.preventDefault();
    executeSearch();
  };

  const handleCategoryClick = (event, category, subcategory) => {
    event.preventDefault();

    const params = new URLSearchParams();
    if (subcategory) {
      params.set("subcategory", subcategory.value);
    }

    const queryString = params.toString();
    const nextPath = `/category/${encodeURIComponent(category.value)}${
      queryString ? `?${queryString}` : ""
    }`;

    window.history.pushState({}, "", nextPath);
    window.dispatchEvent(new PopStateEvent("popstate"));
    setActiveCategory(null);
  };

  return (
    <header className="site-header">
      <div className="header-main">
        <a className="header-logo" href="/" aria-label="Nailed 홈">
          Nailed
        </a>
        <div className="search-bar-wrapper">
          <form className="search-bar" onSubmit={handleSearchSubmit}>
            <label className="sr-only" htmlFor="home-search">
              상품명, 브랜드, 키워드 검색
            </label>
            <input
              id="home-search"
              type="search"
              placeholder="상품명, 브랜드, 키워드 검색"
              autoComplete="off"
              value={searchKeyword}
              onChange={(event) => setSearchKeyword(event.target.value)}
              onKeyDown={handleSearchKeyDown}
              onFocus={handleSearchFocus}
              onBlur={handleSearchBlur}
            />
            <button type="submit" aria-label="검색">
              ⌕
            </button>
          </form>
          {showHistoryDropdown && searchHistory.length > 0 && (
            <div className="search-history-dropdown">
              <div className="search-history-header">
                <span>최근 검색어</span>
                <button type="button" onClick={handleClearHistory}>
                  전체 삭제
                </button>
              </div>
              {searchHistory.map((keyword) => (
                <div
                  key={keyword}
                  className="search-history-item"
                  onClick={() => handleHistoryItemClick(keyword)}
                >
                  <span>{keyword}</span>
                  <button
                    type="button"
                    aria-label={`${keyword} 삭제`}
                    onClick={(event) => handleRemoveHistory(event, keyword)}
                  >
                    ✕
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
        <nav className="quick-menu" aria-label="사용자 메뉴">
          {quickMenuItems.map((item) => (
            <a
              href={item.href}
              className="quick-menu-item"
              key={item.label}
              onClick={(event) => handleMenuClick(event, item)}
            >
              <span className="quick-icon" aria-hidden="true">
                <QuickIcon name={item.icon} />
                {item.badge && <b>{item.badge}</b>}
              </span>
              <span>{item.label}</span>
            </a>
          ))}
        </nav>
      </div>
      <div className="category-menu-area" onMouseLeave={() => setActiveCategory(null)}>
        <nav className="category-nav" aria-label="상품 카테고리">
          {categories.map((category) => (
            <a
              href={`/category/${encodeURIComponent(category.value)}`}
              key={category.value}
              onClick={(event) => handleCategoryClick(event, category)}
              onFocus={() => setActiveCategory(category)}
              onMouseEnter={() => setActiveCategory(category)}
            >
              {category.label}
            </a>
          ))}
        </nav>
        {activeCategory && (
          <div className="mega-menu">
            <div className="mega-menu-inner">
              <div className="mega-menu-title">
                <strong>{activeCategory.label}</strong>
                <a
                  href={`/category/${encodeURIComponent(activeCategory.value)}`}
                  onClick={(event) => handleCategoryClick(event, activeCategory)}
                >
                  전체보기
                </a>
              </div>
              <div className="mega-menu-columns">
                {activeCategory.groups.map((group) => {
                  const isLuxuryBrandGroup =
                    activeCategory.value === "luxury" && group.value === "brand";

                  return (
                    <div
                      className={`mega-menu-column${
                        isLuxuryBrandGroup ? " mega-menu-column-luxury-brand" : ""
                      }`}
                      key={group.title}
                    >
                      <h2>
                        <a
                          href={`/category/${encodeURIComponent(
                            activeCategory.value,
                          )}?subcategory=${encodeURIComponent(group.value)}`}
                          onClick={(event) =>
                            handleCategoryClick(event, activeCategory, {
                              label: group.title,
                              value: group.value,
                            })
                          }
                        >
                          {group.title}
                        </a>
                      </h2>
                      <div
                        className={`mega-menu-links${
                          isLuxuryBrandGroup ? " mega-menu-links-luxury-brand" : ""
                        }`}
                      >
                        {group.items.map((subcategory) => (
                          <a
                            href={`/category/${encodeURIComponent(
                              activeCategory.value,
                            )}?subcategory=${encodeURIComponent(subcategory.value)}`}
                            key={subcategory.value}
                            onClick={(event) => handleCategoryClick(event, activeCategory, subcategory)}
                          >
                            {subcategory.label}
                          </a>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}
      </div>
    </header>
  );
}

export default Header;
