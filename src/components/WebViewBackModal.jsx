// components/WebViewBackModal.jsx
import React, { useEffect, useMemo, useRef, useState, useCallback } from "react";
import { addAppMessageListener, notifyNavState /*, postToApp */ } from "../bridges/appBridge";
import { HINTS } from "../hooks/useWebViewBack";

/** 라우트 기준 베이스 계산 */
function computeBaseNav() {
  const pathname = window.location?.pathname || "/";
  const isRoot = pathname === "/" || pathname === "/home";
  let canGoBackInWeb = false;
  try { canGoBackInWeb = window.history.length > 1; } catch { }
  return { isRoot, path: pathname, canGoBackInWeb };
}

export default function WebViewBackModal({
  isOpen,
  onClose,
}) {
  const base = useMemo(() => computeBaseNav(), []);
  const [choice, setChoice] = useState("home"); // 'home' | 'page' | 'modal' | 'confirm'
  const [lastBack, setLastBack] = useState(null);
  const [localLogs, setLocalLogs] = useState([]);
  const mountedRef = useRef(false);

  const pushLog = useCallback((title, payload) => {
    setLocalLogs(prev => [...prev.slice(-99), `[${new Date().toLocaleTimeString()}] ${title} ${payload ? JSON.stringify(payload) : ""}`]);
  }, []);

  /** 선택값 → NAV_STATE 계산 */
  const makeNavFromChoice = useCallback(() => {
    const common = {
      path: base.path,
      canGoBackInWeb: (() => { try { return window.history.length > 1; } catch { return base.canGoBackInWeb; } })(),
      hint: HINTS.ENTRY,
    };
    switch (choice) {
      case "home":
        return { ...common, isRoot: true, hasBlockingUI: false, needsConfirm: false };
      case "page":
        return { ...common, isRoot: false, hasBlockingUI: false, needsConfirm: false };
      case "modal":
        // 모달은 베이스 라우트 유지 + 차단 ON
        return { ...common, isRoot: base.isRoot, hasBlockingUI: true, needsConfirm: false, hint: HINTS.MODAL };
      case "confirm":
        // 확인 필요(폼 등)
        return { ...common, isRoot: base.isRoot, hasBlockingUI: false, needsConfirm: true };
      default:
        return { ...common, isRoot: base.isRoot, hasBlockingUI: false, needsConfirm: false };
    }
  }, [choice, base.path, base.isRoot, base.canGoBackInWeb]);

  /** 모달 열릴 때 현재 상태를 1회 통보(차단 ON) */
  useEffect(() => {
    if (!isOpen) return;
    mountedRef.current = true;

    // 기본 오픈 상태: 현재 선택이 'modal'이면 그 값, 아니면 차단만 ON해서 시작
    const openNav = choice === "modal"
      ? makeNavFromChoice()
      : { path: base.path, isRoot: base.isRoot, canGoBackInWeb: base.canGoBackInWeb, hasBlockingUI: true, needsConfirm: false, hint: HINTS.MODAL };

    notifyNavState(openNav);
    pushLog("NAV_STATE → (open)", openNav);

    // BACK_REQUEST 수신
    const unbind = addAppMessageListener((msg) => {
      if (msg?.type !== "BACK_REQUEST") return;
      const nav = msg.payload?.nav || {};
      setLastBack({ ...nav, at: Date.now() });
      pushLog("BACK_REQUEST ⇦", nav);

      // 우선순위: 차단 → 확인 → 히스토리 → 루트 → 기본 닫기
      if (nav.hasBlockingUI) {
        onClose?.(); return;
      }
      if (nav.needsConfirm) {
        const ok = window.confirm("이 페이지에서 나갈까요?");
        if (ok) {
          if (window.history.length > 1) window.history.back();
          else {
            // postToApp({ type: "EXIT_APP" });
          }
        }
        return;
      }
      if (nav.canGoBackInWeb) { window.history.back(); return; }
      if (nav.isRoot) { /* postToApp({ type: "EXIT_APP" }); */ return; }
      onClose?.();
    });

    return () => {
      // 닫힐 때 차단 OFF만 통보 (isRoot는 라우트 기준 유지)
      const closeNav = {
        path: base.path,
        isRoot: base.isRoot,
        canGoBackInWeb: (() => { try { return window.history.length > 1; } catch { return base.canGoBackInWeb; } })(),
        hasBlockingUI: false,
        needsConfirm: false,
        hint: HINTS.ENTRY,
      };
      notifyNavState(closeNav);
      pushLog("NAV_STATE → (close)", closeNav);

      mountedRef.current = false;
      unbind?.();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  if (!isOpen) return null;

  /** 적용 버튼: 현재 선택값을 NAV_STATE로 통보 */
  const applyChoice = () => {
    const nav = makeNavFromChoice();
    notifyNavState(nav);
    pushLog("NAV_STATE → (apply)", nav);
  };

  return (
    <div style={wrap}>
      <div style={sheet} onClick={(e) => e.stopPropagation()}>
        <div style={header}>
          <div>뒤로가기 테스트</div>
          <button style={closeBtn} onClick={() => onClose?.()}>닫기</button>
        </div>

        {/* 옵션 4개 */}
        <div style={row}>
          {[
            { key: "home", label: "메인페이지" },
            { key: "page", label: "일반 페이지" },
            { key: "modal", label: "모달" },
            { key: "confirm", label: "confirm" },
          ].map(opt => (
            <button
              key={opt.key}
              onClick={() => setChoice(opt.key)}
              style={{
                ...chip,
                background: choice === opt.key ? "#111" : "#fff",
                color: choice === opt.key ? "#fff" : "#111",
                borderColor: choice === opt.key ? "#111" : "#ddd",
              }}
            >
              {opt.label}
            </button>
          ))}
        </div>

        {/* 적용 버튼 */}
        <div style={{ margin: "8px 16px 0" }}>
          <button style={applyBtn} onClick={applyChoice}>적용</button>
        </div>


        <div style={{width:"90%", padding: "0px 10px", fontSize:12, color:"#666", marginTop:8}}>
          옵션 적용 후, 기기 뒤로가기 버튼으로 BACK_REQUEST 흐름을 확인하세요.
        </div>
        <div style={logBox}>
          {localLogs.map((l, i) => <div key={i}>{l}</div>)}
        </div>

        
      </div>
    </div>
  );
}

/* ─ 구성 요소 ─ */
function StatePreview({ nav, base }) {
  const items = [
    { k: "isRoot", v: String(nav.isRoot) },
    { k: "blocking", v: String(nav.hasBlockingUI) },
    { k: "confirm", v: String(nav.needsConfirm) },
    { k: "canGoBack", v: String(nav.canGoBackInWeb ?? base.canGoBackInWeb) },
  ];
  return (
    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 12 }}>
      {items.map(({ k, v }) => <Badge key={k} label={k} value={v} />)}
    </div>
  );
}

/* ─ 스타일 ─ */
const wrap = { position: "fixed", inset: 0, background: "rgba(0,0,0,.45)", zIndex: 9999, display: "flex", alignItems: "flex-end", justifyContent: "center", padding: 16 };
const sheet = { width: "100%", maxWidth: 960, background: "#fff", borderRadius: "16px 16px 0 0", overflow: "hidden", boxShadow: "0 -8px 24px rgba(0,0,0,.15)" };
const header = { display: "flex", justifyContent: "space-between", alignItems: "center", padding: "12px 16px", borderBottom: "1px solid #eee", fontWeight: 700, fontSize: 16 };
const closeBtn = { border: "1px solid #ddd", borderRadius: 10, padding: "8px 12px", background: "#fff", cursor: "pointer" };

const row = { display: "flex", gap: 8, padding: "12px 16px 0" };
const chip = { border: "1px solid #ddd", borderRadius: 10, padding: "10px 5px", cursor: "pointer" };
const applyBtn = { border: "1px solid #111", background: "#111", color: "#fff", borderRadius: 10, padding: "10px 16px", cursor: "pointer" };

const body = { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, padding: 16 };
const left = { display: "flex", flexDirection: "column" };
const right = { display: "flex", flexDirection: "column" };
const sectionTitle = { fontWeight: 700, margin: "8px 0" };
const muted = { fontSize: 12, color: "#666" };
const codeBox = { background: "#0f172a", color: "#e5e7eb", borderRadius: 8, padding: 12, fontSize: 12, overflow: "auto" };
const logBox = { border: "1px solid #eee", borderRadius: 8, padding: 12, height: 300, overflow: "auto", fontSize: 12 };

function Badge({ label, value }) {
  const bg = value === "true" ? "#e8f6ef" : value === "false" ? "#fdeaea" : "#f5f5f5";
  const fg = value === "true" ? "#0a7" : value === "false" ? "#c20" : "#777";
  return (
    <span style={{ display: "inline-block", padding: "4px 10px", borderRadius: 999, background: bg, color: fg, fontSize: 12 }}>
      {label}: {value}
    </span>
  );
}
