import { Fragment } from "react";
import Footer from "../components/common/Footer";
import Header from "../components/common/Header";
import { guidePageData } from "../data/serviceGuideMock";

function GuideSection({ section }) {
  if (section.variant === "calc") {
    return (
      <section className="guide-section">
        <div className="guide-section-heading">
          <h2>{section.title}</h2>
        </div>
        <div className="guide-calc-box">
          {section.items.map((item, index) => (
            <div className="guide-calc-item" key={item.title}>
              <span>{item.title}</span>
              <strong>{item.value}</strong>
              {index < section.items.length - 1 && <b aria-hidden="true">→</b>}
            </div>
          ))}
        </div>
      </section>
    );
  }

  return (
    <section className="guide-section">
      <div className="guide-section-heading">
        <h2>{section.title}</h2>
      </div>
      <div className={`guide-card-grid guide-card-grid-${section.variant}`}>
        {section.items.map((item, index) => (
          <Fragment key={item.title}>
            <article className="guide-card">
              {item.value && (
                <div className="guide-card-icon" aria-hidden="true">
                  {item.value}
                </div>
              )}
              <h3>{item.title}</h3>
              <p>{item.text}</p>
            </article>
            {section.variant === "steps" && index < section.items.length - 1 && (
              <span className="guide-step-arrow" aria-hidden="true">→</span>
            )}
          </Fragment>
        ))}
      </div>
    </section>
  );
}

function ServiceGuidePage({ type }) {
  const page = guidePageData[type] || guidePageData.guide;

  return (
    <div className="service-guide-page">
      <Header />
      <main>
        <section className={`service-guide-hero ${page.heroClass}`}>
          <div className="service-guide-hero-inner">
            <h1>{page.title}</h1>
            <p>{page.subtitle}</p>
          </div>
        </section>

        <div className="service-guide-content">
          {page.sections.map((section) => (
            <GuideSection section={section} key={section.title} />
          ))}

          <section className="guide-notice">
            <div className="guide-notice-icon" aria-hidden="true">!</div>
            <div>
              <h2>{page.noticeTitle}</h2>
              {page.notices.length > 2 ? (
                <ul>
                  {page.notices.map((notice) => (
                    <li key={notice}>{notice}</li>
                  ))}
                </ul>
              ) : (
                page.notices.map((notice) => <p key={notice}>{notice}</p>)
              )}
            </div>
          </section>
        </div>
      </main>
      <Footer />
    </div>
  );
}

export default ServiceGuidePage;
