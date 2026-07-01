import { useEffect, useState } from "react";
import Header from "../components/common/Header";
import Footer from "../components/common/Footer";
import ProductCard from "../components/home/ProductCard";
import ProductFilterPanel from "../components/ProductFilterPanel";
import { searchProducts } from "../api/productApi";
import { isValidSearchKeyword, normalizeSearchKeyword } from "../utils/search";
import "../styles/search-result.css";

const PAGE_SIZE = 20;

const DEFAULT_FILTERS = {
  excludeSold: false,
  gender: "",
  minPrice: "",
  maxPrice: "",
};

function toCardShape(product) {
  return {
    id: product.productId,
    name: product.title,
    price: product.price,
    imageUrl: product.thumbnailUrl || null,
    brandName: product.brandName || null,
    size: product.size || null,
    wishlistCount: product.wishlistCount ?? 0,
    productStatus: product.productStatus || null,
  };
}

function SearchResultPage({ search }) {
  const keyword = normalizeSearchKeyword(new URLSearchParams(search).get("keyword") || "");
  const isValidKeyword = isValidSearchKeyword(keyword);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [draftFilters, setDraftFilters] = useState(DEFAULT_FILTERS);
  const [appliedFilters, setAppliedFilters] = useState(DEFAULT_FILTERS);
  const [currentPage, setCurrentPage] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [totalCount, setTotalCount] = useState(null);
  const [filterKeyword, setFilterKeyword] = useState(keyword);

  useEffect(() => {
    setDraftFilters(DEFAULT_FILTERS);
    setAppliedFilters(DEFAULT_FILTERS);
    setCurrentPage(0);
    setTotalPages(0);
    setTotalCount(null);
    setFilterKeyword(keyword);
  }, [keyword]);

  useEffect(() => {
    if (keyword !== filterKeyword) {
      return;
    }

    if (!isValidKeyword) {
      setProducts([]);
      setLoading(false);
      setError(null);
      setTotalPages(0);
      setTotalCount(null);
      return;
    }

    let ignore = false;

    setLoading(true);
    setError(null);
    setProducts([]);

    searchProducts({
      keyword,
      page: currentPage,
      size: PAGE_SIZE,
      gender: appliedFilters.gender,
      excludeSold: appliedFilters.excludeSold,
      minPrice: appliedFilters.minPrice,
      maxPrice: appliedFilters.maxPrice,
    })
      .then((data) => {
        if (ignore) return;

        const list = Array.isArray(data) ? data : (data.content ?? []);
        setProducts(list.map(toCardShape));
        setTotalPages(Array.isArray(data) ? 1 : (data.totalPages ?? 1));
        setTotalCount(Array.isArray(data) ? list.length : (data.totalElements ?? list.length));
      })
      .catch((err) => {
        if (ignore) return;

        setError(err.message || "검색 결과를 불러오지 못했습니다.");
        setTotalPages(0);
        setTotalCount(null);
      })
      .finally(() => {
        if (!ignore) {
          setLoading(false);
        }
      });

    return () => {
      ignore = true;
    };
  }, [keyword, filterKeyword, isValidKeyword, appliedFilters, currentPage]);

  const handleApplyFilters = (nextFilters) => {
    setDraftFilters(nextFilters);
    setAppliedFilters(nextFilters);
    setCurrentPage(0);
  };

  const handlePageChange = (page) => {
    setCurrentPage(page);
  };

  return (
    <div className="home-page">
      <Header />
      <main className="home-content">
        <section className="product-section">
          <div className="section-heading">
            <div>
              <h2>{isValidKeyword ? `'${keyword}' 검색 결과` : "검색 결과"}</h2>
              {isValidKeyword && totalCount !== null && !error && (
                <p className="search-result-count">총 {totalCount.toLocaleString()}개 상품</p>
              )}
            </div>
          </div>

          <div className="search-result-layout">
            <ProductFilterPanel
              filters={draftFilters}
              onApplyFilters={handleApplyFilters}
              namePrefix="search"
            />
            <div className="search-result-products">
              {!isValidKeyword && (
                <p className="empty-result">두 글자 이상의 검색어를 입력해주세요.</p>
              )}

              {isValidKeyword && loading && (
                <p className="empty-result">검색 결과를 불러오는 중입니다.</p>
              )}

              {isValidKeyword && !loading && error && (
                <p className="empty-result">{error}</p>
              )}

              {isValidKeyword && !loading && !error && products.length === 0 && (
                <p className="empty-result">검색 결과가 없습니다.</p>
              )}

              {!loading && !error && products.length > 0 && (
                <div className="product-grid search-product-grid">
                  {products.map((product) => (
                    <ProductCard key={product.id ?? product.productId} product={product} />
                  ))}
                </div>
              )}

              {isValidKeyword && !loading && !error && totalPages > 1 && (
                <Pagination
                  currentPage={currentPage}
                  totalPages={totalPages}
                  onPageChange={handlePageChange}
                />
              )}
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}

function Pagination({ currentPage, totalPages, onPageChange }) {
  const maxVisible = 5;
  let start = Math.max(0, currentPage - Math.floor(maxVisible / 2));
  let end = Math.min(totalPages - 1, start + maxVisible - 1);
  if (end - start < maxVisible - 1) {
    start = Math.max(0, end - maxVisible + 1);
  }

  const pages = [];
  for (let i = start; i <= end; i++) pages.push(i);

  return (
    <div className="pagination">
      <button
        className="page-btn"
        onClick={() => onPageChange(currentPage - 1)}
        disabled={currentPage === 0}
      >
        &lt;
      </button>
      {pages.map((p) => (
        <button
          key={p}
          className={`page-btn${p === currentPage ? " active" : ""}`}
          onClick={() => onPageChange(p)}
        >
          {p + 1}
        </button>
      ))}
      <button
        className="page-btn"
        onClick={() => onPageChange(currentPage + 1)}
        disabled={currentPage === totalPages - 1}
      >
        &gt;
      </button>
    </div>
  );
}

export default SearchResultPage;
