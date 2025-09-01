
/**
 * 파일명: components/SubscriptionModal.jsx
 * 설명: 구독/결제 테스트 모달(UI). Web → App으로 START_SUBSCRIPTION 메시지를 보내고,
 *       App → Web의 SUBSCRIPTION_RESULT 응답을 확인하기 위한 입력/미리보기/결과 뷰를 제공한다.
 *
 * 주요 기능:
 * - 상품 입력 폼: product_id, product_type(subscription|consumable), display_name, price, currency, metadata(JSON)
 * - JSON 미리보기: 현재 입력값으로 구성한 { type:"START_SUBSCRIPTION", payload }를 표시/복사
 * - 전송 버튼: 상위에서 내려온 onStart() 호출(실제 postMessage는 훅/페이지에서 수행)
 * - 결과 패널: App → Web으로 수신된 SUBSCRIPTION_RESULT(payload)를 JSON으로 출력
 *
 * 사용 맥락:
 * - RN WebView 기반 앱에서 인앱결제를 네이티브 SDK로 실행하고,
 *   완료 결과를 웹에 postMessage로 통지하는 흐름을 검증
 * - 페이지/훅(useSubscription)과 함께 사용하여 상태/검증/전송을 분리
 *
 * 연관 메시지 타입:
 * - Web → App: START_SUBSCRIPTION { product_id, product_type, display_name, price, currency, metadata? }
 * - App → Web: SUBSCRIPTION_RESULT
 *   • 성공: { success:true, product_id, transaction_id, expires_at? }
 *   • 실패: { success:false, product_id, error_code, message }
 *
 * 비고:
 * - product_type은 현재 subscription(구독형) / consumable(소모성)만 제공
 * - metadata는 유효한 JSON이어야 하며, 파싱 실패 시 errors.metadata로 표시
 * - 모달 애니메이션은 내부 상태(anim)로 제어하며 isOpen=false 시 언마운트
 * - 실제 결제/검증은 네이티브/스토어에서 수행되며, 본 모달은 입력·미리보기·결과 표시 역할에 집중
 */


import React, { useEffect, useState } from "react";

const drawer = { position: "fixed", top: 0, left: 0, height: "100%", width: 360, maxWidth: "92vw", background: "#fff", boxShadow: "8px 0 24px rgba(0,0,0,0.12)", overflowY: "auto", zIndex: 9999 };
const header = { padding: "16px 20px 8px", borderBottom: "1px solid #eee", fontWeight: 700, fontSize: 18 };
const body = { padding: 20 };
const footer = { padding: 16, borderTop: "1px solid #eee", display: "flex", gap: 10, justifyContent: "flex-end" };
const input = { width: "100%", padding: "10px 12px", border: "1px solid #ddd", borderRadius: 10, outline: "none" };
const label = { fontSize: 13, color: "#444", marginBottom: 6, display: "block" };
const err = { color: "#d00", fontSize: 12, marginTop: 6 };
const btn = { padding: "10px 14px", borderRadius: 10, border: "1px solid #ddd", background: "#fff", cursor: "pointer" };
const primary = { ...btn, background: "#222", color: "#fff", borderColor: "#222" };

export default function SubscriptionModal({ isOpen, onClose, form, setField, errors, onStart, buildStartPayload, result }) {
  const [anim, setAnim] = useState(false);
  useEffect(() => { if (isOpen) { const t = setTimeout(() => setAnim(true), 10); return () => clearTimeout(t);} else setAnim(false); }, [isOpen]);
  if (!isOpen) return null;

  const panelStyle = { ...drawer, transform: anim ? "translateX(0)" : "translateX(-100%)", transition: "transform 260ms ease" };
  const preview = { type: "START_SUBSCRIPTION", payload: buildStartPayload() };

  return (
    <div style={panelStyle} onClick={(e) => e.stopPropagation()}>
      <div style={header}>구독/결제 테스트</div>
      <div style={body}>
        {/* 입력 */}
        <div style={{ marginBottom: 12 }}>
          <label style={label}>product_id</label>
          <input style={input} value={form.product_id} onChange={(e) => setField("product_id", e.target.value)} />
          {errors.product_id && <div style={err}>{errors.product_id}</div>}
        </div>

        <div style={{ marginBottom: 12 }}>
          <label style={label}>product_type</label>
          <select style={{ ...input, height: 40 }} value={form.product_type} onChange={(e) => setField("product_type", e.target.value)}>
            <option value="subscription">구독형</option>
            <option value="consumable">포인트형</option>
          </select>
          {errors.product_type && <div style={err}>{errors.product_type}</div>}
        </div>

        <div style={{ marginBottom: 12 }}>
          <label style={label}>display_name</label>
          <input style={input} value={form.display_name} onChange={(e) => setField("display_name", e.target.value)} />
          {errors.display_name && <div style={err}>{errors.display_name}</div>}
        </div>

        <div style={{ marginBottom: 12 }}>
          <label style={label}>price</label>
          <input type="number" style={input} value={form.price} onChange={(e) => setField("price", e.target.value)} />
          {errors.price && <div style={err}>{errors.price}</div>}
        </div>

        <div style={{ marginBottom: 12 }}>
          <label style={label}>currency</label>
          <input style={input} value={form.currency} onChange={(e) => setField("currency", e.target.value)} />
          {errors.currency && <div style={err}>{errors.currency}</div>}
        </div>

        <div style={{ marginBottom: 12 }}>
          <label style={label}>metadata (JSON, 선택)</label>
          <textarea rows={4} style={{ ...input, fontFamily: "monospace" }} value={form.metadata} onChange={(e) => setField("metadata", e.target.value)} />
          {errors.metadata && <div style={err}>{errors.metadata}</div>}
        </div>

        {/* 미리보기 */}
        <section style={{ marginTop: 16 }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
            <div style={{ fontWeight: 600 }}>START_SUBSCRIPTION 미리보기</div>
            <button
              onClick={async () => { try { await navigator.clipboard.writeText(JSON.stringify(preview, null, 2)); } catch {} }}
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
        <button style={primary} onClick={onStart} disabled={Object.keys(errors).length > 0} title={Object.keys(errors).length ? "입력을 확인하세요" : ""}>결제 시작</button>
      </div>
    </div>
  );
}
