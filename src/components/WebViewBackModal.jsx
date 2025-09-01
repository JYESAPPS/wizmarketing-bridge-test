
/**
 * 파일명: components/WebViewBackModal.jsx
 * 설명: WebView 뒤로가기 처리 테스트 모달(UI).
 *       NAV_STATE(payload) 구성/미리보기/복사와 실행 플로우(편집 → 실행중 → 결과)를 통해
 *       앱(WebView)과 웹 간 뒤로가기 정책을 안전하게 검증한다.
 *
 * 주요 기능:
 * - NAV_STATE 미리보기/복사: 현재 입력값(제목/카테고리/hint/수동오버라이드)을 기반으로
 *   { type:"NAV_STATE", payload:{ isRoot, canGoBackInWeb, hasBlockingUI, needsConfirm, hint, context } } 생성
 * - 편집 단계(modal):
 *   · 카테고리(일반/홈/모달/입력폼) 선택 → 기본 플래그 자동 계산
 *   · hint(페이지 이름) 자유 입력 (예: home/detail/payment/modal/form/result)
 *   · 수동 오버라이드(useManualFlags)로 isRoot/canGoBackInWeb/hasBlockingUI/needsConfirm 직접 토글
 * - 실행 단계(running): 테스트 진행 표시, “중단” 버튼 제공(중단 시 편집 단계로 복귀)
 * - 결과 단계(result): 입력 요약 표시, “다시 실행/닫기” 제공
 *
 * 사용 맥락:
 * - RN WebView 기반 앱에서 안드로이드 하드웨어 뒤로가기 대응을 검증할 때 사용
 *   · 웹은 라우트/모달 상태가 바뀔 때마다 NAV_STATE를 앱에 통보
 *   · 앱은 하드웨어 뒤로가기 시 마지막 NAV_STATE를 실어 BACK_REQUEST를 웹에 전달(패스스루)
 *   · 웹은 BACK_REQUEST 수신 시 모달 닫기/confirm/back 등 자체 처리
 *
 * 연관 메시지 타입:
 * - Web → App: NAV_STATE
 * - App → Web: BACK_REQUEST (앱 하드웨어 뒤로가기 발생 시 전달됨)
 *
 * 비고:
 * - hint는 자동 결정하지 않고 사용자가 직접 입력하도록 설계(테스트 유연성 확보)
 * - 카테고리 선택은 기본 플래그를 빠르게 구성하기 위한 편의 기능이며,
 *   수동 오버라이드 체크 시 해당 플래그들이 우선 적용됨
 * - 미리보기 JSON은 복사 버튼으로 쉽게 공유 가능(앱/QA와 커뮤니케이션 용이)
 */


import React, { useEffect, useState } from "react";

const drawerBase = {
  position: "fixed",
  top: 0,
  left: 0,
  height: "100%",
  width: "320px",
  maxWidth: "90vw",
  background: "#fff",
  boxShadow: "8px 0 24px rgba(0,0,0,0.12)",
  overflowY: "auto",
  zIndex: 9999,
};

const headerStyle = {
  padding: "16px 20px 8px",
  borderBottom: "1px solid #eee",
  fontWeight: 700,
  fontSize: 18,
};

const bodyStyle = { padding: 20 };
const footerStyle = {
  padding: 16,
  borderTop: "1px solid #eee",
  display: "flex",
  gap: 10,
  justifyContent: "flex-end",
};

const inputStyle = {
  width: "100%",
  padding: "10px 12px",
  border: "1px solid #ddd",
  borderRadius: 10,
  outline: "none",
};
const labelStyle = { fontSize: 13, color: "#444", marginBottom: 6, display: "block" };
const errorStyle = { color: "#d00", fontSize: 12, marginTop: 6 };
const row = { display: "flex", alignItems: "center", gap: 10 };
const rowBetween = { display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10 };
const btn = {
  padding: "10px 14px",
  borderRadius: 10,
  border: "1px solid #ddd",
  background: "#fff",
  cursor: "pointer",
};
const primaryBtn = { ...btn, background: "#222", color: "#fff", borderColor: "#222" };

export default function WebViewBackModal({
  isOpen,
  phase,
  form,
  errors,
  onClose,
  onSubmit,
  onAbort,
  onChange,
}) {
  const [animIn, setAnimIn] = useState(false);

  useEffect(() => {
    if (isOpen) {
      const t = setTimeout(() => setAnimIn(true), 10);
      return () => clearTimeout(t);
    } else {
      setAnimIn(false);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const panelStyle = {
    ...drawerBase,
    transform: animIn ? "translateX(0)" : "translateX(-100%)",
    transition: "transform 260ms ease",
  };

  // NAV_STATE 미리보기 JSON
  const buildPreview = () => {
    const useManual = !!form.useManualFlags;

    // 기본 정책(카테고리 기준)
    let base_isRoot = form.mode === "home";
    let base_hasBlockingUI = form.mode === "modal";
    let base_needsConfirm = form.mode === "form";
    let base_canGoBackInWeb;
    try { base_canGoBackInWeb = window.history.length > 1; } catch { base_canGoBackInWeb = false; }

    // 수동 오버라이드 반영
    const isRoot = useManual ? !!form.m_isRoot : base_isRoot;
    const hasBlockingUI = useManual ? !!form.m_hasBlockingUI : base_hasBlockingUI;
    const needsConfirm = useManual ? !!form.m_needsConfirm : base_needsConfirm;
    const canGoBackInWeb = useManual ? !!form.m_canGoBackInWeb : base_canGoBackInWeb;

    return {
      type: "NAV_STATE",
      payload: {
        isRoot,
        canGoBackInWeb,
        hasBlockingUI,
        needsConfirm,
        hint: (form.hint || "detail").trim(),
        context: {
          title: (form.title || "").trim(),
          scenario: form.mode,
          hint: (form.hint || "").trim(),
          count: Number(form.count) || 0,
          at: Date.now(),
          manual: useManual,
        },
      },
    };
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(JSON.stringify(buildPreview(), null, 2));
    } catch {}
  };

  return (
    <div style={panelStyle} onClick={(e) => e.stopPropagation()}>
      <div style={headerStyle}>WebView 뒤로가기 처리</div>

      <div style={bodyStyle}>
        {/* 설명 */}
        <section style={{ marginBottom: 16 }}>
          <p style={{ margin: 0, color: "#333" }}>
            버튼을 누르면 바로 실행하지 않고, <b>설명과 입력값을 확인</b>한 뒤
            “테스트 시작”을 눌러 실행합니다. 실행 중에는 뒤로가기에 대해 확인을 거칩니다.
          </p>
        </section>

        {/* NAV_STATE 미리보기 */}
        <section style={{ marginBottom: 16 }}>
          <div style={rowBetween}>
            <div style={{ fontWeight: 600 }}>NAV_STATE 미리보기</div>
            <button onClick={handleCopy} style={{ fontSize: 12, padding: "6px 10px", borderRadius: 8, border: "1px solid #ddd", background: "#fff", cursor: "pointer" }}>복사</button>
          </div>
          <pre style={{ background: "#0f172a", color: "#e5e7eb", padding: 12, borderRadius: 8, fontSize: 12, overflowX: "auto", margin: 0 }}>
{JSON.stringify(buildPreview(), null, 2)}
          </pre>
        </section>

        {phase === "modal" && (
          <section>
            {/* 제목 */}
            <div style={{ marginBottom: 12 }}>
              <label style={labelStyle}>제목</label>
              <input
                style={inputStyle}
                placeholder="예: 브릿지 시나리오 A"
                value={form.title}
                onChange={(e) => onChange("title", e.target.value)}
              />
              {errors.title && <div style={errorStyle}>{errors.title}</div>}
            </div>

            {/* 카테고리(앱 동작 유형) */}
            <div style={{ marginBottom: 12 }}>
              <label style={labelStyle}>카테고리</label>
              <select
                style={{ ...inputStyle, height: 40 }}
                value={form.mode}
                onChange={(e) => onChange("mode", e.target.value)}
              >
                <option value="detail">일반 페이지</option>
                <option value="home">홈 화면</option>
                <option value="modal">모달 화면</option>
                <option value="form">입력 폼(확인 필요)</option>
              </select>
              {errors.mode && <div style={errorStyle}>{errors.mode}</div>}
            </div>

            {/* hint (페이지 이름) */}
            <div style={{ marginBottom: 12 }}>
              <label style={labelStyle}>hint (페이지 이름)</label>
              <input
                type="text"
                style={inputStyle}
                placeholder="예: home, detail, payment, modal, player, form, result..."
                value={form.hint}
                onChange={(e) => onChange("hint", e.target.value)}
              />
              {errors.hint && <div style={errorStyle}>{errors.hint}</div>}
            </div>

            {/* 횟수 (데모) */}
            <div style={{ marginBottom: 12 }}>
              <label style={labelStyle}>횟수</label>
              <input
                type="number"
                style={inputStyle}
                min={1}
                value={form.count}
                onChange={(e) => onChange("count", e.target.value)}
              />
              {errors.count && <div style={errorStyle}>{errors.count}</div>}
            </div>

            {/* 수동 오버라이드 토글 */}
            <div style={{ margin: "16px 0 8px", fontWeight: 600 }}>수동 오버라이드</div>
            <div style={{ ...row, marginBottom: 8 }}>
              <input
                id="useManualFlags"
                type="checkbox"
                checked={!!form.useManualFlags}
                onChange={(e) => onChange("useManualFlags", e.target.checked)}
              />
              <label htmlFor="useManualFlags">직접 값 지정하기 (체크 시 아래 토글이 적용됩니다)</label>
            </div>

            {/* 플래그 토글들 */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <label style={row}>
                <input
                  type="checkbox"
                  checked={!!form.m_isRoot}
                  onChange={(e) => onChange("m_isRoot", e.target.checked)}
                  disabled={!form.useManualFlags}
                />
                <span>isRoot</span>
              </label>
              <label style={row}>
                <input
                  type="checkbox"
                  checked={!!form.m_canGoBackInWeb}
                  onChange={(e) => onChange("m_canGoBackInWeb", e.target.checked)}
                  disabled={!form.useManualFlags}
                />
                <span>canGoBackInWeb</span>
              </label>
              <label style={row}>
                <input
                  type="checkbox"
                  checked={!!form.m_hasBlockingUI}
                  onChange={(e) => onChange("m_hasBlockingUI", e.target.checked)}
                  disabled={!form.useManualFlags}
                />
                <span>hasBlockingUI</span>
              </label>
              <label style={row}>
                <input
                  type="checkbox"
                  checked={!!form.m_needsConfirm}
                  onChange={(e) => onChange("m_needsConfirm", e.target.checked)}
                  disabled={!form.useManualFlags}
                />
                <span>needsConfirm</span>
              </label>
            </div>
          </section>
        )}

        {phase === "running" && (
          <section style={{ textAlign: "center", padding: "24px 0" }}>
            <div style={{ fontSize: 14, color: "#666", marginBottom: 12 }}>실행 중...</div>
            <div
              className="spinner"
              style={{
                width: 28,
                height: 28,
                margin: "0 auto",
                border: "3px solid #ddd",
                borderTopColor: "#222",
                borderRadius: "50%",
                animation: "spin 0.9s linear infinite",
              }}
            />
            <style>{`@keyframes spin { to { transform: rotate(360deg); } } `}</style>
          </section>
        )}

        {phase === "result" && (
          <section style={{ background: "#f7f7f7", padding: 12, borderRadius: 10 }}>
            <div style={{ fontWeight: 600, marginBottom: 8 }}>결과</div>
            <div style={{ fontSize: 14, color: "#444" }}>
              데모 완료! 입력값 요약 – <b>{form.title}</b> / <b>{form.mode}</b> / <b>{(form.hint || "").trim()}</b> / <b>{form.count}</b> {form.useManualFlags ? "(수동)" : ""}
            </div>
          </section>
        )}
      </div>

      <div style={footerStyle}>
        {phase === "modal" && (
          <>
            <button style={btn} onClick={onClose}>취소</button>
            <button
              style={primaryBtn}
              onClick={onSubmit}
              disabled={Object.keys(errors).length > 0}
              title={Object.keys(errors).length ? "입력을 확인해주세요" : ""}
            >
              테스트 시작
            </button>
          </>
        )}
        {phase === "running" && (
          <>
            <button style={{ ...btn, opacity: 0.6, cursor: "not-allowed" }} disabled>닫기</button>
            <button style={primaryBtn} onClick={onAbort}>중단</button>
          </>
        )}
        {phase === "result" && (
          <>
            <button style={btn} onClick={onClose}>닫기</button>
            <button style={primaryBtn} onClick={onSubmit}>다시 실행</button>
          </>
        )}
      </div>
    </div>
  );
}
