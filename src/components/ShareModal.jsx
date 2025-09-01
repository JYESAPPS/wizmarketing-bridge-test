/**
 * 파일명: components/ShareModal.jsx
 * 설명: 공유(이미지+본문) 테스트 모달.
 *       Web → App으로 START_SHARE 메시지를 구성/전송하고,
 *       App → Web의 SHARE_RESULT 응답을 표시한다.
 *
 * 주요 기능:
 * - 입력 폼:
 *   · image: 공유할 이미지 경로(URL 또는 앱 내부 파일 경로)
 *   · caption: 공유 본문 텍스트
 *   · platform: 공유 대상 (instagram | facebook | system 공유 시트)
 * - START_SHARE 미리보기:
 *   현재 입력값을 기반으로 JSON payload를 구성해 표시/클립보드 복사
 * - 공유 시작 버튼:
 *   errors가 없을 때 onStart() 호출하여 postMessage 전송
 * - 결과 표시:
 *   App → Web SHARE_RESULT(payload)를 JSON 형태로 출력
 *
 * 사용 맥락:
 * - RN WebView 기반 앱에서 네이티브 공유 기능(인스타그램, 시스템 공유 시트 등)과
 *   Web ↔ App 브리지를 통해 데이터 전달을 검증
 *
 * 연관 메시지 타입:
 * - Web → App: START_SHARE { image, caption, platform }
 * - App → Web: SHARE_RESULT { success, platform, post_id?, error_code?, message? }
 *
 * 비고:
 * - image는 실제 경로/URL이어야 하며, 네이티브가 해석 가능한 형태여야 함
 * - platform 선택지는 필요에 따라 확장 가능
 * - caption은 선택 필드 (없어도 전송 가능)
 */


import React, { useEffect, useState } from "react";


const drawer = { position: "fixed", top: 0, left: 0, height: "100%", width: 360, maxWidth: "92vw", background: "#fff", boxShadow: "8px 0 24px rgba(0,0,0,0.12)", overflowY: "auto", zIndex: 9999 };
const header = { padding: "16px 20px 8px", borderBottom: "1px solid #eee", fontWeight: 700, fontSize: 18 };
const body = { padding: 20 };
const footer = { padding: 16, borderTop: "1px solid #eee", display: "flex", gap: 10, justifyContent: "flex-end" };
const input = { width: "100%", padding: "10px 12px", border: "1px solid #ddd", borderRadius: 10, outline: "none" };
const selectInput = { ...input, height: 40 };
const label = { fontSize: 13, color: "#444", marginBottom: 6, display: "block" };
const err = { color: "#d00", fontSize: 12, marginTop: 6 };
const btn = { padding: "10px 14px", borderRadius: 10, border: "1px solid #ddd", background: "#fff", cursor: "pointer" };
const primary = { ...btn, background: "#222", color: "#fff", borderColor: "#222" };

export default function ShareModal({ isOpen, onClose, form, setField, errors, preview, onStart, result }) {
    const [anim, setAnim] = useState(false);
    useEffect(() => { if (isOpen) { const t = setTimeout(() => setAnim(true), 10); return () => clearTimeout(t); } else setAnim(false); }, [isOpen]);
    if (!isOpen) return null;

    const panelStyle = { ...drawer, transform: anim ? "translateX(0)" : "translateX(-100%)", transition: "transform 260ms ease" };

    return (
        <div style={panelStyle} onClick={(e) => e.stopPropagation()}>
            <div style={header}>공유(인스타 등) 테스트</div>
            <div style={body}>
                {/* 입력 폼 */}
                <div style={{ marginBottom: 12 }}>
                    <label style={label}>image (URL or 앱 경로)</label>
                    <input style={input} value={form.image} onChange={(e) => setField("image", e.target.value)} placeholder="https://... 또는 앱 파일 경로" />
                    {errors.image && <div style={err}>{errors.image}</div>}
                </div>

                <div style={{ marginBottom: 12 }}>
                    <label style={label}>caption (본문)</label>
                    <textarea rows={4} style={{ ...input, fontFamily: "monospace" }} value={form.caption} onChange={(e) => setField("caption", e.target.value)} placeholder="본문(선택)" />
                </div>

                <div style={{ marginBottom: 12 }}>
                    <label style={label}>platform</label>
                    <select style={selectInput} value={form.platform} onChange={(e) => setField("platform", e.target.value)}>
                        <option value="instagram">instagram</option>
                        <option value="facebook">facebook</option>
                        <option value="system">system (공유 시트)</option>
                    </select>
                    {errors.platform && <div style={err}>{errors.platform}</div>}
                </div>

                {/* 미리보기 */}
                <section style={{ marginTop: 16 }}>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
                        <div style={{ fontWeight: 600 }}>START_SHARE 미리보기</div>
                        <button
                            onClick={async () => { try { await navigator.clipboard.writeText(JSON.stringify(preview, null, 2)); } catch { } }}
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
                        <div style={{ fontWeight: 600, marginBottom: 8 }}>SHARE_RESULT 수신</div>
                        <pre style={{ background: "#111827", color: "#e5e7eb", padding: 12, borderRadius: 8, fontSize: 12, overflowX: "auto", margin: 0 }}>
                            {JSON.stringify(result, null, 2)}
                        </pre>
                    </section>
                )}
            </div>

            <div style={footer}>
                <button style={btn} onClick={onClose}>닫기</button>
                <button style={primary} onClick={onStart} disabled={Object.keys(errors).length > 0} title={Object.keys(errors).length ? "입력을 확인하세요" : ""}>
                    공유 시작
                </button>
            </div>
        </div>
    );
}
