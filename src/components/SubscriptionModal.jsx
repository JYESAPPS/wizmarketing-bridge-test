/**
 * 파일명: components/SubscriptionModal.jsx
 * 설명: 구독/결제 테스트 모달(UI). START_SUBSCRIPTION / CANCEL_SUBSCRIPTION 전송 미리보기+전송.
 */

import React, { useEffect, useMemo, useState } from "react";

const drawer = { position: "fixed", top: 0, left: 0, height: "100%", width: 360, maxWidth: "92vw", background: "#fff", boxShadow: "8px 0 24px rgba(0,0,0,0.12)", overflowY: "auto", zIndex: 9999 };
const header = { padding: "16px 20px 8px", borderBottom: "1px solid #eee", fontWeight: 700, fontSize: 18 };
const body = { padding: 20 };
const footer = { padding: 16, borderTop: "1px solid #eee", display: "flex", gap: 10, justifyContent: "flex-end" };
const input = { width: "100%", padding: "10px 12px", border: "1px solid #ddd", borderRadius: 10, outline: "none" };
const label = { fontSize: 13, color: "#444", marginBottom: 6, display: "block" };
const err = { color: "#d00", fontSize: 12, marginTop: 6 };
const btn = { padding: "10px 14px", borderRadius: 10, border: "1px solid #ddd", background: "#fff", cursor: "pointer" };
const primary = { ...btn, background: "#222", color: "#fff", borderColor: "#222" };

/**
 * props 설명:
 * - form: { product_id, product_type, display_name, price, currency, metadata, transaction_id, cancel_reason }
 * - setField: (name, value) => void
 * - errors: { [key]: string }
 * - onStart / onCancel: () => void  (실제 postMessage는 상위에서)
 * - buildStartPayload / buildCancelPayload: () => object
 */
export default function SubscriptionModal({
  isOpen = false,
  onClose = () => { },
  form = {},
  setField = () => { },
  errors = {},
  onStart = () => { },
  buildStartPayload = () => ({}),
  onCancel = () => { },
  buildCancelPayload, // 없으면 내부 기본 빌더 사용
  result = null,
}) {
  const [anim, setAnim] = useState(false);
  const [action, setAction] = useState("start"); // "start" | "cancel"

  useEffect(() => {
    if (isOpen) {
      const t = setTimeout(() => setAnim(true), 10);
      return () => clearTimeout(t);
    } else {
      setAnim(false);
    }
  }, [isOpen]);



  // cancel용 기본 빌더 (상위 미제공 시)
  const defaultBuildCancelPayload = () => {
    let meta = null;
    try { meta = form?.metadata ? JSON.parse(form.metadata) : null; } catch { meta = null; }
    const pid = form?.product_id?.trim?.() || "";
    const tx = form?.transaction_id?.trim?.() || undefined;
    const rs = form?.cancel_reason?.trim?.() || undefined;
    return {
      product_id: pid,
      transaction_id: tx,
      reason: rs,
      ...(meta ? { metadata: meta } : {}),
    };
  };

  const panelStyle = {
    ...drawer,
    transform: anim ? "translateX(0)" : "translateX(-100%)",
    transition: "transform 260ms ease",
  };

  // 미리보기 데이터 (form 변하면 cancel default 빌더 반영)
  const preview = useMemo(() => {
    if (action === "start") {
      return { type: "START_SUBSCRIPTION", payload: buildStartPayload() || {} };
    }
    const p = (typeof buildCancelPayload === "function" ? buildCancelPayload() : defaultBuildCancelPayload()) || {};
    return { type: "CANCEL_SUBSCRIPTION", payload: p };
  }, [action, buildStartPayload, buildCancelPayload, form]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!isOpen) return null;
  
  // 버튼 활성화 로직
  const hasAnyErrors = !!Object.keys(errors || {}).length;
  const cancelMissingRequired = action === "cancel" && !(form?.product_id?.trim?.());
  const disablePrimary = hasAnyErrors || cancelMissingRequired || (action === "cancel" && typeof onCancel !== "function");

  return (
    <div style={panelStyle} onClick={(e) => e.stopPropagation()}>
      <div style={header}>구독/결제 테스트</div>

      <div style={body}>
        {/* 액션 선택 */}
        <div style={{ marginBottom: 16 }}>
          <label style={label}>액션</label>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
            <button
              style={{ ...btn, ...(action === "start" ? { background: "#222", color: "#fff", borderColor: "#222" } : {}) }}
              onClick={() => setAction("start")}
            >
              결제 시작
            </button>
            <button
              style={{ ...btn, ...(action === "cancel" ? { background: "#222", color: "#fff", borderColor: "#222" } : {}) }}
              onClick={() => setAction("cancel")}
            >
              결제 취소
            </button>
          </div>
        </div>

        {/* START 입력 */}
        {action === "start" && (
          <>
            <div style={{ marginBottom: 12 }}>
              <label style={label}>product_id</label>
              <input style={input} value={form?.product_id || ""} onChange={(e) => setField("product_id", e.target.value)} />
              {errors?.product_id && <div style={err}>{errors.product_id}</div>}
            </div>

            <div style={{ marginBottom: 12 }}>
              <label style={label}>product_type</label>
              <select
                style={{ ...input, height: 40 }}
                value={form?.product_type || "subscription"}
                onChange={(e) => setField("product_type", e.target.value)}
              >
                <option value="subscription">구독형</option>
                <option value="consumable">포인트형</option>
              </select>
              {errors?.product_type && <div style={err}>{errors.product_type}</div>}
            </div>

            <div style={{ marginBottom: 12 }}>
              <label style={label}>display_name</label>
              <input style={input} value={form?.display_name || ""} onChange={(e) => setField("display_name", e.target.value)} />
              {errors?.display_name && <div style={err}>{errors.display_name}</div>}
            </div>

            <div style={{ marginBottom: 12 }}>
              <label style={label}>price</label>
              <input
                type="number"
                style={input}
                value={form?.price ?? ""}
                onChange={(e) => setField("price", e.target.value)}
              />
              {errors?.price && <div style={err}>{errors.price}</div>}
            </div>

            <div style={{ marginBottom: 12 }}>
              <label style={label}>currency</label>
              <input style={input} value={form?.currency || ""} onChange={(e) => setField("currency", e.target.value)} />
              {errors?.currency && <div style={err}>{errors.currency}</div>}
            </div>

            <div style={{ marginBottom: 12 }}>
              <label style={label}>metadata (JSON, 선택)</label>
              <textarea
                rows={4}
                style={{ ...input, fontFamily: "monospace" }}
                value={form?.metadata || ""}
                onChange={(e) => setField("metadata", e.target.value)}
              />
              {errors?.metadata && <div style={err}>{errors.metadata}</div>}
            </div>
          </>
        )}

        {/* CANCEL 입력 */}
        {action === "cancel" && (
          <>
            <div style={{ marginBottom: 12 }}>
              <label style={label}>product_id <span style={{ color: "#d00" }}>*</span></label>
              <input style={input} value={form?.product_id || ""} onChange={(e) => setField("product_id", e.target.value)} />
              {errors?.product_id && <div style={err}>{errors.product_id}</div>}
              {!errors?.product_id && !(form?.product_id?.trim?.()) && (
                <div style={err}>취소에는 product_id가 필요합니다.</div>
              )}
            </div>

            <div style={{ marginBottom: 12 }}>
              <label style={label}>transaction_id (선택)</label>
              <input style={input} value={form?.transaction_id || ""} onChange={(e) => setField("transaction_id", e.target.value)} />
              {errors?.transaction_id && <div style={err}>{errors.transaction_id}</div>}
            </div>

            <div style={{ marginBottom: 12 }}>
              <label style={label}>cancel_reason (선택)</label>
              <input style={input} value={form?.cancel_reason || ""} onChange={(e) => setField("cancel_reason", e.target.value)} />
              {errors?.cancel_reason && <div style={err}>{errors.cancel_reason}</div>}
            </div>

            <div style={{ marginBottom: 12 }}>
              <label style={label}>metadata (JSON, 선택)</label>
              <textarea
                rows={4}
                style={{ ...input, fontFamily: "monospace" }}
                value={form?.metadata || ""}
                onChange={(e) => setField("metadata", e.target.value)}
              />
              {errors?.metadata && <div style={err}>{errors.metadata}</div>}
            </div>
          </>
        )}

        {/* 미리보기 */}
        <section style={{ marginTop: 16 }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
            <div style={{ fontWeight: 600 }}>
              {action === "start" ? "START_SUBSCRIPTION 미리보기" : "CANCEL_SUBSCRIPTION 미리보기"}
            </div>
            <button
              onClick={async () => {
                try { await navigator.clipboard.writeText(JSON.stringify(preview, null, 2)); } catch { }
              }}
              style={{ fontSize: 12, padding: "6px 10px", borderRadius: 8, border: "1px solid #ddd", background: "#fff", cursor: "pointer" }}
            >복사</button>
          </div>
          <pre style={{ background: "#0f172a", color: "#e5e7eb", padding: 12, borderRadius: 8, fontSize: 12, overflowX: "auto", margin: 0 }}>
            {JSON.stringify(preview, null, 2)}
          </pre>
        </section>

        {/* 결과 표시 */}
        {result && (
          <section style={{ marginTop: 16 }}>
            <div style={{ fontWeight: 600, marginBottom: 8 }}>SUBSCRIPTION_RESULT 수신</div>
            <pre style={{ background: "#111827", color: "#e5e7eb", padding: 12, borderRadius: 8, fontSize: 12, overflowX: "auto", margin: 0 }}>
              {JSON.stringify(result, null, 2)}
            </pre>
          </section>
        )}
      </div>

      <div style={footer}>
        <button style={btn} onClick={onClose}>닫기</button>
        {action === "start" ? (
          <button
            style={primary}
            onClick={onStart}
            disabled={hasAnyErrors}
            title={hasAnyErrors ? "입력을 확인하세요" : ""}
          >
            결제 시작
          </button>
        ) : (
          <button
            style={primary}
            onClick={onCancel}
            disabled={disablePrimary}
            title={
              !onCancel
                ? "onCancel 핸들러가 필요합니다"
                : (cancelMissingRequired ? "product_id는 필수입니다" : (hasAnyErrors ? "입력을 확인하세요" : ""))
            }
          >
            결제 취소
          </button>
        )}
      </div>
    </div>
  );
}
