import { useMemo, useState } from "react";
import Footer from "../components/common/Footer";
import Header from "../components/common/Header";
import { submitInquiry } from "../api/inquiryApi";
import {
  customerTabs,
  faqCategories,
  faqItems,
  noticeItems,
  serviceCards,
} from "../data/customerCenterMock";

const initialInquiryForm = {
  category: "",
  title: "",
  content: "",
};

const inquiryCategoryOptions = [
  { value: "ORDER", label: "주문 문의" },
  { value: "PAYMENT", label: "결제 문의" },
  { value: "PRODUCT", label: "상품 문의" },
  { value: "DELIVERY", label: "배송 문의" },
  { value: "ACCOUNT", label: "회원/계정 문의" },
  { value: "ETC", label: "기타 문의" },
];

const tabIcons = {
  notice: "!",
  faq: "?",
  inquiry: "✎",
  service: "□",
};

const NOTICE_PAGE_SIZE = 5;
const NOTICE_CATEGORY_ALL = "전체";
const noticeCategoryOptions = [NOTICE_CATEGORY_ALL, "점검 안내", "운영 정책", "서비스 안내", "이벤트"];
const FAQ_PAGE_SIZE = 5;

function getInitialTab() {
  const tab = new URLSearchParams(window.location.search).get("tab");
  return customerTabs.some((item) => item.id === tab) ? tab : "notice";
}

function CustomerCenterPage() {
  const [activeTab, setActiveTab] = useState(getInitialTab);
  const [activeFaqCategory, setActiveFaqCategory] = useState("전체");
  const [openFaqIndex, setOpenFaqIndex] = useState(0);
  const [faqPage, setFaqPage] = useState(1);
  const [inquiryForm, setInquiryForm] = useState(initialInquiryForm);
  const [message, setMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [noticeKeyword, setNoticeKeyword] = useState("");
  const [noticeCategory, setNoticeCategory] = useState(NOTICE_CATEGORY_ALL);
  const [noticePage, setNoticePage] = useState(1);
  const [selectedNotice, setSelectedNotice] = useState(null);

  const filteredFaqItems = useMemo(() => {
    if (activeFaqCategory === "전체") {
      return faqItems;
    }

    return faqItems.filter((item) => item.category === activeFaqCategory);
  }, [activeFaqCategory]);

  const faqTotalPages = Math.max(1, Math.ceil(filteredFaqItems.length / FAQ_PAGE_SIZE));
  const faqPageItems = filteredFaqItems.slice((faqPage - 1) * FAQ_PAGE_SIZE, faqPage * FAQ_PAGE_SIZE);
  const faqPageNumbers = Array.from({ length: faqTotalPages }, (_, index) => index + 1);

  const filteredNoticeItems = useMemo(() => {
    const keyword = noticeKeyword.trim().toLowerCase();

    return noticeItems.filter((item) => {
      const matchesCategory = noticeCategory === NOTICE_CATEGORY_ALL || item.category === noticeCategory;
      const matchesKeyword =
        keyword.length === 0 ||
        item.title.toLowerCase().includes(keyword) ||
        item.category.toLowerCase().includes(keyword);

      return matchesCategory && matchesKeyword;
    });
  }, [noticeCategory, noticeKeyword]);

  const noticeTotalPages = Math.max(1, Math.ceil(filteredNoticeItems.length / NOTICE_PAGE_SIZE));
  const noticePageItems = filteredNoticeItems.slice(
    (noticePage - 1) * NOTICE_PAGE_SIZE,
    noticePage * NOTICE_PAGE_SIZE,
  );
  const noticePageNumbers = Array.from({ length: noticeTotalPages }, (_, index) => index + 1);

  const handleTabClick = (tabId) => {
    setActiveTab(tabId);
    setMessage("");
    window.history.pushState({}, "", `/customer-center?tab=${tabId}`);
  };

  const handleNoticeCategoryChange = (event) => {
    setNoticeCategory(event.target.value);
    setNoticePage(1);
    setSelectedNotice(null);
  };

  const handleNoticeKeywordChange = (event) => {
    setNoticeKeyword(event.target.value);
    setNoticePage(1);
    setSelectedNotice(null);
  };

  const handleNoticeKeyDown = (event, item) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      setSelectedNotice(item);
    }
  };

  const handleInquiryChange = (event) => {
    const { name, value } = event.target;
    setInquiryForm((prev) => ({
      ...prev,
      [name]: value,
    }));
    setMessage("");
  };

  const handleInquirySubmit = async (event) => {
    event.preventDefault();
    setIsSubmitting(true);
    setMessage("");

    try {
      await submitInquiry({
        category: inquiryForm.category,
        title: inquiryForm.title.trim(),
        content: inquiryForm.content.trim(),
      });
      setInquiryForm(initialInquiryForm);
      setMessage("문의가 접수되었습니다.");
    } catch (error) {
      setMessage(error.message || "문의 접수에 실패했습니다. 잠시 후 다시 시도해주세요.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="customer-center-page">
      <Header />
      <main>
        <section className="customer-hero" aria-label="고객센터 소개">
          <div className="customer-hero-inner">
            <h1>Nailed 고객센터</h1>
            <p>
              공지사항, 자주 묻는 질문과 문의를 통해
              <br />
              도움이 필요한 정보를 빠르게 확인할 수 있습니다.
            </p>
          </div>
        </section>

        <section className="customer-center-content">
          <aside className="customer-tabs" aria-label="고객센터 메뉴">
            <h2>고객센터 메뉴</h2>
            {customerTabs.map((tab) => (
              <button
                type="button"
                className={activeTab === tab.id ? "active" : ""}
                key={tab.id}
                onClick={() => handleTabClick(tab.id)}
              >
                <span aria-hidden="true">{tabIcons[tab.icon]}</span>
                {tab.label}
                <b aria-hidden="true">›</b>
              </button>
            ))}
          </aside>

          <div className="customer-panel">
            {activeTab === "notice" && (
              <section>
                <div className="customer-panel-head">
                  <h2>공지사항</h2>
                  <div className="notice-tools">
                    <select aria-label="공지 구분" value={noticeCategory} onChange={handleNoticeCategoryChange}>
                      {noticeCategoryOptions.map((category) => (
                        <option value={category} key={category}>
                          {category}
                        </option>
                      ))}
                    </select>
                    <input
                      type="search"
                      placeholder="검색어를 입력해주세요."
                      aria-label="공지 검색"
                      value={noticeKeyword}
                      onChange={handleNoticeKeywordChange}
                    />
                  </div>
                </div>
                {selectedNotice ? (
                  <article className="notice-detail">
                    <div className="notice-detail-top">
                      <span className="notice-badge">{selectedNotice.category}</span>
                      <time dateTime={selectedNotice.date}>{selectedNotice.date}</time>
                    </div>
                    <h3>{selectedNotice.title}</h3>
                    <div className="notice-detail-content">
                      {selectedNotice.content.split("\n").map((line) => (
                        <p key={line}>{line}</p>
                      ))}
                    </div>
                    <button type="button" className="notice-list-button" onClick={() => setSelectedNotice(null)}>
                      목록으로
                    </button>
                  </article>
                ) : (
                  <>
                    <div className="notice-table">
                      <div className="notice-row notice-head">
                        <span>제목</span>
                        <span>구분</span>
                        <span>작성일</span>
                      </div>
                      {noticePageItems.length > 0 ? noticePageItems.map((item) => (
                        <div
                          className="notice-row notice-link-row"
                          key={item.title}
                          role="button"
                          tabIndex={0}
                          onClick={() => setSelectedNotice(item)}
                          onKeyDown={(event) => handleNoticeKeyDown(event, item)}
                        >
                          <strong>{item.title}</strong>
                          <span className="notice-badge">{item.category}</span>
                          <time dateTime={item.date}>{item.date}</time>
                        </div>
                      )) : (
                        <div className="notice-empty">검색 결과가 없습니다.</div>
                      )}
                    </div>
                    {filteredNoticeItems.length > 0 && (
                      <div className="notice-pagination" aria-label="공지사항 페이지">
                        {noticePageNumbers.map((page) => (
                          <button
                            type="button"
                            className={noticePage === page ? "active" : ""}
                            key={page}
                            onClick={() => setNoticePage(page)}
                          >
                            {page}
                          </button>
                        ))}
                      </div>
                    )}
                  </>
                )}
              </section>
            )}

            {activeTab === "faq" && (
              <section>
                <div className="customer-panel-head">
                  <h2>자주 묻는 질문</h2>
                </div>
                <div className="faq-categories" aria-label="FAQ 카테고리">
                  {faqCategories.map((category) => (
                    <button
                      type="button"
                      className={activeFaqCategory === category ? "active" : ""}
                      key={category}
                      onClick={() => {
                        setActiveFaqCategory(category);
                        setFaqPage(1);
                        setOpenFaqIndex(0);
                      }}
                    >
                      {category}
                    </button>
                  ))}
                </div>
                <div className="faq-list">
                  {faqPageItems.length > 0 ? faqPageItems.map((item, index) => (
                    <div className="faq-item" key={item.question}>
                      <button type="button" onClick={() => setOpenFaqIndex(openFaqIndex === index ? -1 : index)}>
                        <span>{item.category}</span>
                        {item.question}
                        <b aria-hidden="true">{openFaqIndex === index ? "−" : "+"}</b>
                      </button>
                      {openFaqIndex === index && <p>{item.answer}</p>}
                    </div>
                  )) : (
                    <div className="faq-empty">등록된 질문이 없습니다.</div>
                  )}
                </div>
                {filteredFaqItems.length > 0 && (
                  <div className="faq-pagination" aria-label="FAQ 페이지">
                    {faqPageNumbers.map((page) => (
                      <button
                        type="button"
                        className={faqPage === page ? "active" : ""}
                        key={page}
                        onClick={() => {
                          setFaqPage(page);
                          setOpenFaqIndex(0);
                        }}
                      >
                        {page}
                      </button>
                    ))}
                  </div>
                )}
              </section>
            )}

            {activeTab === "inquiry" && (
              <section>
                <div className="customer-panel-head">
                  <h2>1:1 문의</h2>
                </div>
                <form className="inquiry-form" onSubmit={handleInquirySubmit}>
                  <label>
                    문의 유형
                    <select name="category" value={inquiryForm.category} onChange={handleInquiryChange} required>
                      <option value="">문의 유형을 선택해주세요.</option>
                      {inquiryCategoryOptions.map((option) => (
                        <option value={option.value} key={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label>
                    제목
                    <input
                      type="text"
                      name="title"
                      value={inquiryForm.title}
                      onChange={handleInquiryChange}
                      placeholder="제목을 입력해주세요."
                      required
                    />
                  </label>
                  <label>
                    내용
                    <textarea
                      name="content"
                      value={inquiryForm.content}
                      onChange={handleInquiryChange}
                      placeholder="문의 내용을 입력해주세요."
                      rows="7"
                      required
                    />
                  </label>
                  {message && <p className="inquiry-message">{message}</p>}
                  <button type="submit" disabled={isSubmitting}>
                    {isSubmitting ? "접수 중..." : "문의 접수"}
                  </button>
                </form>
              </section>
            )}

            {activeTab === "service" && (
              <section>
                <div className="customer-panel-head">
                  <h2>서비스</h2>
                </div>
                <div className="service-card-list">
                  {serviceCards.map((item) => (
                    <a href={item.href} className="service-card" key={item.title}>
                      <span className="service-card-icon" aria-hidden="true">{item.icon}</span>
                      <strong>{item.title}</strong>
                      <p>{item.description}</p>
                      <span className="service-card-button">자세히 보기</span>
                    </a>
                  ))}
                </div>
              </section>
            )}
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}

export default CustomerCenterPage;
