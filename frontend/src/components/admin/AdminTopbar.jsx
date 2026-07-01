import { useEffect, useRef, useState } from "react";
import { logout } from "../../api/authApi";

const SESSION_KEY = "nailed_session";

function readAdminSession() {
  try {
    return JSON.parse(window.sessionStorage.getItem(SESSION_KEY) || "null") || {};
  } catch {
    return {};
  }
}

function AdminTopbar({ pageMeta }) {
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [infoOpen, setInfoOpen] = useState(false);
  const profileRef = useRef(null);
  const session = readAdminSession();
  const title = pageMeta?.title || "관리자";
  const subtitle = pageMeta?.subtitle || "";

  useEffect(() => {
    function handleClickOutside(event) {
      if (!profileRef.current?.contains(event.target)) {
        setDropdownOpen(false);
      }
    }

    document.addEventListener("click", handleClickOutside);
    return () => document.removeEventListener("click", handleClickOutside);
  }, []);

  async function handleLogout() {
    await logout();
    window.history.replaceState({}, "", "/login");
    window.dispatchEvent(new PopStateEvent("popstate"));
  }

  return (
    <header className="admin-topbar">
      <div className="admin-topbar-title">
        <h1>{title}</h1>
        {subtitle && <p>{subtitle}</p>}
      </div>

      <div className="admin-profile" ref={profileRef}>
        <button
          className="admin-profile-button"
          type="button"
          aria-expanded={dropdownOpen}
          onClick={() => setDropdownOpen((open) => !open)}
        >
          <span className="admin-avatar" aria-hidden="true" />
          <strong>NailedAdmin</strong>
          <span aria-hidden="true">▾</span>
        </button>

        {dropdownOpen && (
          <div className="admin-profile-menu">
            <strong>NailedAdmin</strong>
            <button
              type="button"
              onClick={() => {
                setInfoOpen(true);
                setDropdownOpen(false);
              }}
            >
              관리자 정보
            </button>
            <button type="button" onClick={handleLogout}>
              로그아웃
            </button>
          </div>
        )}
      </div>

      {infoOpen && (
        <div className="admin-modal-backdrop" role="presentation" onClick={() => setInfoOpen(false)}>
          <section className="admin-info-modal" role="dialog" aria-modal="true" aria-labelledby="admin-info-title" onClick={(event) => event.stopPropagation()}>
            <div className="admin-info-modal-head">
              <h2 id="admin-info-title">관리자 정보</h2>
              <button type="button" aria-label="관리자 정보 닫기" onClick={() => setInfoOpen(false)}>
                ×
              </button>
            </div>
            <dl className="admin-info-list">
              <div>
                <dt>표시명</dt>
                <dd>NailedAdmin</dd>
              </div>
              <div>
                <dt>권한</dt>
                <dd>{session.role || "ADMIN"}</dd>
              </div>
              <div>
                <dt>상태</dt>
                <dd>{session.memberStatus || "ACTIVE"}</dd>
              </div>
            </dl>
          </section>
        </div>
      )}
    </header>
  );
}

export default AdminTopbar;
