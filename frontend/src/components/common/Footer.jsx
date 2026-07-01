const socialIcons = {
  instagram: (
    <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true">
      <rect x="4" y="4" width="16" height="16" rx="5" fill="none" stroke="currentColor" strokeWidth="1.8" />
      <circle cx="12" cy="12" r="3.2" fill="none" stroke="currentColor" strokeWidth="1.8" />
      <circle cx="16.7" cy="7.3" r="1" fill="currentColor" />
    </svg>
  ),
  facebook: (
    <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true">
      <path
        d="M14 8.2h2V5h-2.6C10.7 5 9 6.7 9 9.4V12H7v3.2h2V21h3.4v-5.8h2.8l.5-3.2h-3.3V9.7c0-1 .4-1.5 1.6-1.5Z"
        fill="currentColor"
      />
    </svg>
  ),
  twitter: (
    <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true">
      <path
        d="M5 5h3.3l3.9 5 4.4-5H19l-5.7 6.5L19 19h-3.3l-4.2-5.4L6.8 19H4.4l6-6.9L5 5Zm2.2 1.4 9.2 11.2h.4L7.6 6.4h-.4Z"
        fill="currentColor"
      />
    </svg>
  ),
  youtube: (
    <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true">
      <path
        d="M20.3 8.1a2.5 2.5 0 0 0-1.8-1.8C17 6 12 6 12 6s-5 0-6.5.3a2.5 2.5 0 0 0-1.8 1.8A25 25 0 0 0 3.4 12a25 25 0 0 0 .3 3.9 2.5 2.5 0 0 0 1.8 1.8C7 18 12 18 12 18s5 0 6.5-.3a2.5 2.5 0 0 0 1.8-1.8 25 25 0 0 0 .3-3.9 25 25 0 0 0-.3-3.9ZM10.4 14.5v-5l4.4 2.5-4.4 2.5Z"
        fill="currentColor"
      />
    </svg>
  ),
};

function Footer() {
  return (
    <footer className="site-footer">
      <div className="footer-inner">
        <div className="footer-brand">
          <a className="brand" href="/">
            Nailed
          </a>
          <p>
            프리미엄 중고 거래 플랫폼, NAILED
            <br />
            당신의 가치를 가장 잘 보여주는 거래
          </p>
          <div className="social-links">
            <a href="https://www.instagram.com/" aria-label="인스타그램" style={{ color: "#E4405F" }}>
              {socialIcons.instagram}
            </a>
            <a href="https://www.facebook.com/" aria-label="페이스북" style={{ color: "#1877F2" }}>
              {socialIcons.facebook}
            </a>
            <a href="https://twitter.com/" aria-label="트위터" style={{ color: "#1DA1F2" }}>
              {socialIcons.twitter}
            </a>
            <a href="https://www.youtube.com/" aria-label="유튜브" style={{ color: "#FF0000" }}>
              {socialIcons.youtube}
            </a>
          </div>
        </div>
        <div className="footer-company-info">
          <p>
            (주)네일드컴퍼니 · 대표: 정병민 / 소재지: 경기도 성남시 분당구 분당로 111/
            <br />
            고객센터: 02-1234-5678 / 이메일 문의 Nailed@support.com
          </p>
        </div>
        <div className="footer-contact">
          <h2>고객센터</h2>
          <strong>02-1234-5678</strong>
          <h2>평일 10:00 - 18:00 <br></br>(주말/공휴일 휴무)</h2>
          <h2>이메일</h2>
          <strong>Nailed@support.com</strong>
        </div>
      </div>
      <p className="copyright">© 2026 NAILED, Inc. All rights reserved.</p>
    </footer>
  );
}

export default Footer;
