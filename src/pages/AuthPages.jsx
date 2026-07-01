import { useMemo, useState } from "react";
import { checkNickname, checkUserId, findPassword, login, signUp } from "../api/authApi";

const userIdPattern = /^[a-zA-Z0-9_]{4,20}$/;

// 관리자 예약 키워드 차단
const ADMIN_KEYWORDS = [
  // 관리자 관련
  "관리자", "관리원", "관리팀", "관리부",
  "admin", "administrator", "superadmin", "sysadmin",
  "어드민", "어드미니스트레이터",
  "member_000",
  // 운영자 관련
  "운영자", "운영팀", "운영진", "운영부", "운영원",
  "operator", "manager", "moderator",
  "오퍼레이터", "매니저", "모더레이터",
  // Nailed 브랜드 사칭
  "nailed", "네일드", "네일",
  "nailedadmin", "nailedofficial",
  // 공식/시스템 사칭
  "공식", "official", "공식계정", "공식운영",
  "시스템", "system",
  "고객센터", "고객지원", "support",
  "staff", "스태프",
  "master", "마스터",
  "root", "루트",
  // 사칭 가능성
  "총괄", "총관리", "책임자",
  "대표", "대표자",
  "임원", "직원",
  "bot", "봇",
];
function containsAdminKeyword(value) {
  if (!value) return false;
  const normalized = value.toLowerCase().replace(/\s/g, "");
  return ADMIN_KEYWORDS.some((keyword) => normalized.includes(keyword.toLowerCase().replace(/\s/g, "")));
}
const passwordPattern = /^(?=.*[A-Za-z])(?=.*\d)(?=.*[^A-Za-z\d]).{8,16}$/;

function AuthLayout({ children, onNavigate }) {
  return (
    <div className="auth-page">
      <header className="auth-header">
        <button className="auth-brand" type="button" onClick={() => onNavigate("/")}>
          Nailed
        </button>
        <nav className="auth-nav" aria-label="회원 메뉴">
          <button type="button" onClick={() => onNavigate("/login")}>
            로그인
          </button>
          <button type="button" onClick={() => onNavigate("/signup")}>
            회원가입
          </button>
        </nav>
      </header>
      {children}
      <footer className="auth-footer">
        <strong>Nailed</strong>
        <span>중고 의류 &amp; IT기기 거래 플랫폼</span>
      </footer>
    </div>
  );
}

export function LoginPage({ onNavigate }) {
  const [form, setForm] = useState({ userId: "", password: "" });
  const [message, setMessage] = useState({ type: "", text: "" });
  const [submitting, setSubmitting] = useState(false);

  function update(key, value) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  async function handleSubmit(event) {
    event.preventDefault();

    if (!form.userId.trim() || !form.password) {
      setMessage({ type: "error", text: "아이디와 비밀번호를 입력해주세요." });
      return;
    }

    setSubmitting(true);
    setMessage({ type: "", text: "" });

    try {
      const session = await login({ userId: form.userId, password: form.password });
      const nextPath = String(session?.role || "").toUpperCase() === "ADMIN" ? "/admin" : "/";
      setMessage({ type: "success", text: "로그인되었습니다. 이동합니다." });
      window.setTimeout(() => onNavigate(nextPath), 600);
    } catch (error) {
      setMessage({ type: "error", text: error.message || "로그인에 실패했습니다." });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <AuthLayout onNavigate={onNavigate}>
      <main className="auth-shell auth-shell-narrow">
        <section className="auth-panel">
          <div className="auth-title">
            <h1>로그인</h1>
          </div>

          <form className="auth-form" onSubmit={handleSubmit}>
            <Field label="아이디">
              <input
                type="text"
                placeholder="아이디를 입력해주세요"
                autoComplete="username"
                value={form.userId}
                onChange={(event) => update("userId", event.target.value)}
              />
            </Field>

            <Field label="비밀번호">
              <input
                type="password"
                placeholder="비밀번호를 입력해주세요"
                autoComplete="current-password"
                value={form.password}
                onChange={(event) => update("password", event.target.value)}
              />
            </Field>

            <StatusMessage message={message} />

            <button className="primary-button" type="submit" disabled={submitting}>
              {submitting ? "로그인 중..." : "로그인"}
            </button>
          </form>

          <div className="auth-actions">
            <button type="button" onClick={() => onNavigate("/password/reset")}>
              비밀번호 찾기
            </button>
            <button type="button" onClick={() => onNavigate("/signup")}>
              회원가입
            </button>
          </div>
        </section>
      </main>
    </AuthLayout>
  );
}

export function SignupPage({ onNavigate }) {
  const [form, setForm] = useState({
    name: "",
    nickname: "",
    userId: "",
    password: "",
    passwordConfirm: "",
  });
  const [agreements, setAgreements] = useState({
    age: false,
    terms: false,
    privacy: false,
    marketing: false,
  });
  const [checks, setChecks] = useState({
    nickname: false,
    userId: false,
  });
  const [message, setMessage] = useState({ type: "", text: "" });
  const [submitting, setSubmitting] = useState(false);
  const [fieldErrors, setFieldErrors] = useState({ name: "", userId: "", passwordConfirm: "" });

  const canSubmit = useMemo(() => {
    return (
      checks.nickname &&
      checks.userId &&
      Boolean(form.name.trim()) &&
      passwordPattern.test(form.password) &&
      form.password === form.passwordConfirm &&
      agreements.age &&
      agreements.terms &&
      agreements.privacy &&
      !submitting
    );
  }, [agreements, checks, form, submitting]);

  function update(key, value) {
    setForm((current) => ({ ...current, [key]: value }));

    if (key === "nickname") {
      setChecks((current) => ({ ...current, nickname: false }));
    }

    if (key === "userId") {
      setChecks((current) => ({ ...current, userId: false }));
    }
  }

  async function handleNicknameCheck() {
    if (!form.nickname.trim()) {
      setMessage({ type: "error", text: "닉네임을 입력해주세요." });
      return;
    }
    if (containsAdminKeyword(form.nickname)) {
      setMessage({ type: "error", text: "사용할 수 없는 닉네임입니다." });
      return;
    }

    try {
      const result = await checkNickname(form.nickname);
      if (!result.available) {
        setChecks((current) => ({ ...current, nickname: false }));
        setMessage({ type: "error", text: "이미 사용 중인 닉네임입니다." });
        return;
      }

      setChecks((current) => ({ ...current, nickname: true }));
      setMessage({ type: "success", text: "사용 가능한 닉네임입니다." });
    } catch (error) {
      setMessage({ type: "error", text: error.message || "닉네임 중복 확인에 실패했습니다." });
    }
  }

  async function handleUserIdCheck() {
    if (!userIdPattern.test(form.userId.trim())) {
      setMessage({ type: "error", text: "아이디는 영문, 숫자를 포함해 4~20자로 입력해주세요." });
      return;
    }
    if (containsAdminKeyword(form.userId)) {
      setMessage({ type: "error", text: "사용할 수 없는 아이디입니다." });
      return;
    }

    try {
      const result = await checkUserId(form.userId.trim());
      if (!result.available) {
        setChecks((current) => ({ ...current, userId: false }));
        setMessage({ type: "error", text: "이미 사용 중인 아이디입니다." });
        return;
      }

      setChecks((current) => ({ ...current, userId: true }));
      setMessage({ type: "success", text: "사용 가능한 아이디입니다." });
    } catch (error) {
      setMessage({ type: "error", text: error.message || "아이디 중복 확인에 실패했습니다." });
    }
  }

  async function handleSubmit(event) {
    event.preventDefault();

    const validationMessage = validateSignup(form, agreements, checks);
    if (validationMessage) {
      setMessage({ type: "error", text: validationMessage });
      return;
    }
    if (containsAdminKeyword(form.name)) {
      setMessage({ type: "error", text: "사용할 수 없는 이름입니다." });
      return;
    }

    setSubmitting(true);
    setMessage({ type: "", text: "" });

    try {
      await signUp({
        name: form.name,
        userId: form.userId.trim(),
        nickname: form.nickname,
        password: form.password,
        serviceTermsAgreed: agreements.terms,
        privacyPolicyAgreed: agreements.privacy,
        marketingAgreed: agreements.marketing,
      });
      setMessage({ type: "success", text: "회원가입이 완료되었습니다. 로그인 화면으로 이동합니다." });
      window.setTimeout(() => onNavigate("/login"), 700);
    } catch (error) {
      setMessage({ type: "error", text: error.message || "회원가입에 실패했습니다." });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <AuthLayout onNavigate={onNavigate}>
      <main className="auth-shell">
        <section className="auth-panel signup-panel">
          <div className="auth-title">
            <h1>회원가입</h1>
          </div>

          <form className="auth-form signup-form" onSubmit={handleSubmit}>
            <Field label="이름" error={fieldErrors.name}>
              <input
                type="text"
                placeholder="이름을 입력해주세요"
                autoComplete="name"
                maxLength={30}
                value={form.name}
                onChange={(event) => {
                  update("name", event.target.value);
                  if (event.target.value.trim()) {
                    setFieldErrors((prev) => ({ ...prev, name: "" }));
                  }
                }}
                onBlur={() => {
                  if (!form.name.trim()) {
                    setFieldErrors((prev) => ({ ...prev, name: "이름을 입력해주세요." }));
                  }
                }}
              />
            </Field>

            <Field label="닉네임">
              <div className="inline-field">
                <input
                  type="text"
                  placeholder="닉네임을 입력해주세요"
                  maxLength={30}
                  value={form.nickname}
                  onChange={(event) => update("nickname", event.target.value)}
                />
                <button className="outline-button" type="button" onClick={handleNicknameCheck}>
                  중복 확인
                </button>
              </div>
            </Field>

            <Field label="아이디" hint="영문, 숫자를 포함해 4~20자로 입력해주세요." error={fieldErrors.userId}>
              <div className="inline-field">
                <input
                  type="text"
                  placeholder="아이디를 입력해주세요"
                  autoComplete="username"
                  maxLength={20}
                  value={form.userId}
                  onChange={(event) => {
                    update("userId", event.target.value);
                    if (!event.target.value || userIdPattern.test(event.target.value.trim())) {
                      setFieldErrors((prev) => ({ ...prev, userId: "" }));
                    }
                  }}
                  onBlur={() => {
                    if (form.userId.trim() && !userIdPattern.test(form.userId.trim())) {
                      setFieldErrors((prev) => ({
                        ...prev,
                        userId: "아이디 형식에 맞춰 입력해주세요. (영문, 숫자를 포함해 4~20자)",
                      }));
                    }
                  }}
                />
                <button className="outline-button" type="button" onClick={handleUserIdCheck}>
                  중복 확인
                </button>
              </div>
            </Field>

            <Field label="비밀번호" hint="영문, 숫자, 특수문자를 포함해 8~16자로 입력해주세요.">
              <input
                type="password"
                placeholder="비밀번호"
                autoComplete="new-password"
                maxLength={16}
                value={form.password}
                onChange={(event) => {
                  update("password", event.target.value);
                  if (!event.target.value || passwordPattern.test(event.target.value)) {
                    setMessage({ type: "", text: "" });
                  }
                }}
                onBlur={() => {
                  if (form.password && !passwordPattern.test(form.password)) {
                    setMessage({
                      type: "error",
                      text: "비밀번호 형식에 맞춰 입력해주세요. (영문, 숫자, 특수문자 포함 8~16자)",
                    });
                  }
                }}
              />
            </Field>

            <Field label="비밀번호 확인" error={fieldErrors.passwordConfirm}>
              <input
                type="password"
                placeholder="비밀번호를 다시 입력해주세요"
                autoComplete="new-password"
                maxLength={16}
                value={form.passwordConfirm}
                onChange={(event) => {
                  update("passwordConfirm", event.target.value);
                  if (form.password === event.target.value) {
                    setFieldErrors((prev) => ({ ...prev, passwordConfirm: "" }));
                  }
                }}
                onBlur={() => {
                  if (form.passwordConfirm && form.password !== form.passwordConfirm) {
                    setFieldErrors((prev) => ({
                      ...prev,
                      passwordConfirm: "비밀번호가 일치하지 않습니다.",
                    }));
                  }
                }}
              />
            </Field>

            <div className="terms-box">
              <Agreement
                checked={agreements.age}
                label="[필수] 만 14세 이상입니다."
                onChange={(checked) => setAgreements((current) => ({ ...current, age: checked }))}
              />
              <Agreement
                checked={agreements.terms}
                label="[필수] 서비스 이용약관에 동의합니다."
                onChange={(checked) => setAgreements((current) => ({ ...current, terms: checked }))}
              />
              <Agreement
                checked={agreements.privacy}
                label="[필수] 개인정보 수집 및 이용에 동의합니다."
                onChange={(checked) => setAgreements((current) => ({ ...current, privacy: checked }))}
              />
              <Agreement
                checked={agreements.marketing}
                label="[선택] 마케팅 정보 수신에 동의합니다."
                onChange={(checked) => setAgreements((current) => ({ ...current, marketing: checked }))}
              />
            </div>

            <StatusMessage message={message} />

            <button className="primary-button" type="submit" disabled={!canSubmit}>
              {submitting ? "가입 처리 중..." : "회원가입 완료"}
            </button>
          </form>

          <div className="auth-actions">
            <span>이미 계정이 있으신가요?</span>
            <button type="button" onClick={() => onNavigate("/login")}>
              로그인
            </button>
          </div>
        </section>
      </main>
    </AuthLayout>
  );
}

export function FindPasswordPage({ onNavigate }) {
  const [userId, setUserId] = useState("");
  const [message, setMessage] = useState({ type: "", text: "" });
  const [submitting, setSubmitting] = useState(false);

  async function handleSendTemporaryPassword(event) {
    event.preventDefault();

    if (!userIdPattern.test(userId.trim())) {
      setMessage({ type: "error", text: "가입한 아이디를 입력해주세요." });
      return;
    }

    setSubmitting(true);
    setMessage({ type: "", text: "" });

    try {
      const result = await findPassword({ userId });
      if (!result.temporaryPassword) {
        setMessage({ type: "error", text: "임시 비밀번호를 응답에서 확인할 수 없습니다." });
        return;
      }

setMessage({ type: "success", text: `비밀번호: ${result.temporaryPassword} ` });
    } catch (error) {
      setMessage({ type: "error", text: error.message || "비밀번호 찾기에 실패했습니다." });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <AuthLayout onNavigate={onNavigate}>
      <main className="auth-shell auth-shell-narrow">
        <section className="auth-panel">
          <div className="auth-title">
            <h1>비밀번호 찾기</h1>
          </div>

          <form className="auth-form" onSubmit={handleSendTemporaryPassword}>
            <Field label="아이디">
              <input
                type="text"
                placeholder="가입한 아이디를 입력해주세요"
                autoComplete="username"
                value={userId}
                onChange={(event) => setUserId(event.target.value)}
              />
            </Field>

            <StatusMessage message={message} />

            <button className="primary-button" type="submit" disabled={submitting}>
              {submitting ? "발급 중..." : "임시 비밀번호 받기"}
            </button>
          </form>

          <div className="auth-actions">
            <button type="button" onClick={() => onNavigate("/login")}>
              로그인으로 돌아가기
            </button>
          </div>
        </section>
      </main>
    </AuthLayout>
  );
}

function Field({ children, hint, label, error }) {
  return (
    <label className="form-row">
      <span>{label}</span>
      <div className={`field-control${error ? " has-error" : ""}`}>
        {children}
        {error && <small className="field-error">{error}</small>}
        {!error && hint && <small>{hint}</small>}
      </div>
    </label>
  );
}

function Agreement({ checked, label, onChange }) {
  return (
    <label className="agreement">
      <input checked={checked} type="checkbox" onChange={(event) => onChange(event.target.checked)} />
      <span>{label}</span>
      <button type="button"></button>
    </label>
  );
}

function StatusMessage({ message }) {
  if (!message.text) return null;
  return <p className={`status-message ${message.type}`}>{message.text}</p>;
}

function validateSignup(form, agreements, checks) {
  if (!form.name.trim()) return "이름을 입력해주세요.";
  if (!form.nickname.trim()) return "닉네임을 입력해주세요.";
  if (!checks.nickname) return "닉네임 중복 확인을 완료해주세요.";
  if (!userIdPattern.test(form.userId.trim())) {
    return "아이디는 영문, 숫자를 포함해 4~20자로 입력해주세요.";
  }
  if (!checks.userId) return "아이디 중복 확인을 완료해주세요.";
  if (!passwordPattern.test(form.password)) {
    return "비밀번호는 영문, 숫자, 특수문자를 포함해 8~16자로 입력해주세요.";
  }
  if (form.password !== form.passwordConfirm) return "비밀번호가 일치하지 않습니다.";
  if (!agreements.age || !agreements.terms || !agreements.privacy) {
    return "필수 약관에 모두 동의해주세요.";
  }
  return "";
}
