import { useCallback, useEffect, useRef, useState } from "react";
import { banners } from "../../data/bannerData";

const SLIDE_INTERVAL_MS = 5000;
const BANNER_OBJECT_POSITIONS = {
  menswear: "center center",
  womenswear: "center center",
  luxury: "center center",
  kawaii: "center center",
  itTech: "center center",
  backpack: "center center",
};

function HeroBanner() {
  const [activeIndex, setActiveIndex] = useState(0);
  const timerRef = useRef(null);
  const activeBanner = banners[activeIndex] ?? null;

  const clearSlideTimer = useCallback(() => {
    if (!timerRef.current) return;
    window.clearInterval(timerRef.current);
    timerRef.current = null;
  }, []);

  const startSlideTimer = useCallback(() => {
    clearSlideTimer();

    if (banners.length <= 1) return;

    timerRef.current = window.setInterval(() => {
      setActiveIndex((currentIndex) => (currentIndex + 1) % banners.length);
    }, SLIDE_INTERVAL_MS);
  }, [clearSlideTimer]);

  const moveSlide = useCallback((direction) => {
    if (banners.length <= 1) return;

    setActiveIndex((currentIndex) => (
      (currentIndex + direction + banners.length) % banners.length
    ));
    startSlideTimer();
  }, [startSlideTimer]);

  const goToSlide = useCallback((index) => {
    setActiveIndex(index);
    startSlideTimer();
  }, [startSlideTimer]);

  const handleBannerClick = useCallback((event, path) => {
    event.preventDefault();
    window.history.pushState({}, "", path);
    window.dispatchEvent(new PopStateEvent("popstate"));
  }, []);

  useEffect(() => {
    startSlideTimer();
    return clearSlideTimer;
  }, [clearSlideTimer, startSlideTimer]);

  if (!activeBanner) return null;

  return (
    <section className="hero-banner" aria-label="main promotion">
      <a
        className="hero-link"
        href={activeBanner.link}
        onClick={(event) => handleBannerClick(event, activeBanner.link)}
        aria-label={`${activeBanner.label} category`}
      >
        <img
          className="hero-image"
          src={activeBanner.imageUrl}
          alt=""
          style={{
            objectPosition:
              BANNER_OBJECT_POSITIONS[activeBanner.id] || "center center",
          }}
        />
      </a>

      <div className="hero-copy">
        <div className="hero-dots" aria-label="banner pagination">
          {banners.map((banner, index) => (
            <button
              className={index === activeIndex ? "active" : ""}
              key={banner.id}
              type="button"
              aria-label={`show ${banner.label} banner`}
              aria-current={index === activeIndex ? "true" : undefined}
              onClick={(event) => {
                event.preventDefault();
                event.stopPropagation();
                goToSlide(index);
              }}
            />
          ))}
        </div>
        <strong>{activeBanner.title}</strong>
        <span>{activeBanner.description}</span>
      </div>

      <button
        className="hero-arrow hero-arrow-left"
        type="button"
        aria-label="previous banner"
        onClick={() => moveSlide(-1)}
      >
        &#8249;
      </button>

      <button
        className="hero-arrow hero-arrow-right"
        type="button"
        aria-label="next banner"
        onClick={() => moveSlide(1)}
      >
        &#8250;
      </button>

    </section>
  );
}

export default HeroBanner;
