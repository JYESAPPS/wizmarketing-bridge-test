/**
 * 파일명: components/PushModal.jsx
 * 설명: 푸시 알림 테스트 모달(UI). 디바이스 토큰을 입력하고
 *       Cloud Functions(sendPush)로 요청 → 서버가 15초 후 실제 푸시 발송.
 */

import React, { useEffect, useMemo, useState } from "react";
import { addAppMessageListener } from "../bridges/appBridge";

// ✅ 프로젝트 함수 URL (프로젝트 ID로 교체)
const FN_BASE = "https://asia-northeast1-wizad-b69ee.cloudfunctions.net";
// (선택) Functions에 webpush.secret 설정했다면 헤더에 같이 전송
// const SECRET = "SOME_SECRET";

const drawer = {
    position: "fixed",
    top: 0,
    left: 0,
    height: "100%",
    width: 360,
    maxWidth: "92vw",
    background: "#fff",
    boxShadow: "8px 0 24px rgba(0,0,0,0.12)",
    overflowY: "auto",
    zIndex: 9999,
};
const header = { padding: "16px 20px 8px", borderBottom: "1px solid #eee", fontWeight: 700, fontSize: 18 };
const body = { padding: 20 };
const footer = { padding: 16, borderTop: "1px solid #eee", display: "flex", gap: 10, justifyContent: "flex-end" };
const input = { width: "100%", padding: "10px 12px", border: "1px solid #ddd", borderRadius: 10, outline: "none" };
const selectInput = { ...input, height: 40 };
const label = { fontSize: 13, color: "#444", marginBottom: 6, display: "block" };
const btn = { padding: "10px 14px", borderRadius: 10, border: "1px solid #ddd", background: "#fff", cursor: "pointer" };
const primary = { ...btn, background: "#222", color: "#fff", borderColor: "#222" };
const subtle = { ...btn, borderStyle: "dashed" };

const LS_TOKEN = "push.manual_token.v1";
const LS_PLATFORM = "push.manual_platform.v1";

export default function PushModal({ isOpen, onClose }) {
    const [anim, setAnim] = useState(false);

    // ✅ 수동 토큰만 사용
    const [manualToken, setManualToken] = useState(() => {
        try { return localStorage.getItem(LS_TOKEN) || ""; } catch { return ""; }
    });
    const [platform, setPlatform] = useState(() => {
        try { return localStorage.getItem(LS_PLATFORM) || "android"; } catch { return "android"; }
    });

    // 앱에서 보내준 최신 PUSH_TOKEN(읽기 전용 표시용)
    const [latestFromApp, setLatestFromApp] = useState(null); // { token, platform, app_version, ts, install_id }

    // 서버 발송에 쓰일 필드
    const [title, setTitle] = useState("새 알림");
    const [bodyText, setBodyText] = useState("Wizmarket에서 발송한 테스트 푸시입니다. (15초 지연)");
    const [sending, setSending] = useState(false);

    // 🔁 애니메이션
    useEffect(() => {
        if (isOpen) {
            const t = setTimeout(() => setAnim(true), 10);
            return () => clearTimeout(t);
        } else {
            setAnim(false);
        }
    }, [isOpen]);

    // ✅ 앱에서 PUSH_TOKEN 수신
    useEffect(() => {
        const unbind = addAppMessageListener((msg, raw) => {
            if (!msg || typeof msg.type !== "string") return;
            if (raw?.data?.source === "react-devtools-content-script") return;
            if (msg.type === "PUSH_TOKEN") {
                const p = msg.payload || {};
                setLatestFromApp({
                    token: p.token || "",
                    platform: p.platform || "",
                    app_version: p.app_version || "",
                    install_id: p.install_id || "",
                    ts: p.ts || Date.now(),
                });
            }
        });
        return () => unbind?.();
    }, []);

    // 미리보기(설명용)
    const preview = useMemo(() => ({
        token: manualToken || "(미입력)",
        title: title || "(제목없음)",
        body: bodyText || "(본문없음)",
        platform,
        note: "서버로 전송 후 15초 뒤 실제 푸시 발송",
    }), [manualToken, title, bodyText, platform]);

    if (!isOpen) return null;

    const panelStyle = {
        ...drawer,
        transform: anim ? "translateX(0)" : "translateX(-100%)",
        transition: "transform 260ms ease",
    };

    const handleSaveToken = () => {
        try {
            localStorage.setItem(LS_TOKEN, manualToken);
            localStorage.setItem(LS_PLATFORM, platform);
        } catch { }
    };

    // 📨 서버로 발송(Functions: sendPush) → 15초 후 실제 푸시 도착
    async function callServerPush() {
        if (!manualToken) {
            alert("먼저 Manual Token(디바이스 토큰)을 입력하세요.");
            return;
        }
        setSending(true);
        try {
            const resp = await fetch(`${FN_BASE}/sendPush`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    // "x-webpush-secret": SECRET, // (선택) 보안 헤더
                },
                body: JSON.stringify({
                    token: manualToken.trim(),
                    title: title || "Wizmarket 테스트",
                    body: bodyText || "15초 후 전송됩니다. 창을 닫아도 됩니다.",
                }),
            });
            const json = await resp.json();
            if (!resp.ok) throw new Error(json?.error || "서버 오류");

            alert("서버 접수 완료! 15초 후 실제 푸시가 발송됩니다.\n이제 창을 닫아주세요.");
            // 필요 시 자동 닫기:
            // onClose?.();
        } catch (e) {
            console.error(e);
            alert(`발송 실패: ${e.message}`);
        } finally {
            setSending(false);
        }
    }

    return (
        <div style={panelStyle} onClick={(e) => e.stopPropagation()}>
            <div style={header}>푸시 테스트 (서버 발송 · 15초 지연)</div>

            <div style={body}>
                {/* 1) 수동 토큰 입력 */}
                <section style={{ marginBottom: 16 }}>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
                        <label style={{ ...label, marginBottom: 0 }}>Manual Token</label>
                        <button style={subtle} onClick={handleSaveToken}>저장</button>
                    </div>
                    <input
                        style={input}
                        placeholder="FCM/APNs 디바이스 토큰을 입력하세요"
                        value={manualToken}
                        onChange={(e) => setManualToken(e.target.value)}
                    />
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginTop: 12 }}>
                        <div>
                            <label style={label}>platform</label>
                            <select style={selectInput} value={platform} onChange={(e) => setPlatform(e.target.value)}>
                                <option value="android">android</option>
                                <option value="ios">ios</option>
                            </select>
                        </div>
                        <div>
                            <label style={label}>최근 수신 토큰(from App)</label>
                            <div style={{ fontSize: 12, color: "#555", border: "1px dashed #ddd", borderRadius: 8, padding: "8px 10px", minHeight: 40 }}>
                                {latestFromApp?.token
                                    ? `…${String(latestFromApp.token).slice(-12)} (${latestFromApp.platform || "?"})`
                                    : "없음"}
                            </div>
                        </div>
                    </div>
                </section>

                {/* 2) 발송 내용 입력 */}
                <section style={{ marginBottom: 8 }}>
                    <div style={{ marginTop: 12 }}>
                        <label style={label}>title</label>
                        <input style={input} value={title} onChange={(e) => setTitle(e.target.value)} />
                    </div>
                    <div style={{ marginTop: 12 }}>
                        <label style={label}>body</label>
                        <input style={input} value={bodyText} onChange={(e) => setBodyText(e.target.value)} />
                    </div>
                </section>

                {/* 3) 발송 미리보기 */}
                <section style={{ marginTop: 8 }}>
                    <div style={{ fontWeight: 600, marginBottom: 8 }}>발송 미리보기</div>
                    <pre style={{ background: "#0f172a", color: "#e5e7eb", padding: 12, borderRadius: 8, fontSize: 12, overflowX: "auto", margin: 0 }}>
                        {JSON.stringify(preview, null, 2)}
                    </pre>
                    <div style={{ fontSize: 12, color: "#777", marginTop: 8 }}>
                        * 버튼 클릭 시 서버에 요청되고, <b>15초 뒤</b> 실제 OS 푸시가 도착합니다. 요청 직후 이 창을 닫아도 됩니다.
                    </div>
                </section>
            </div>

            <div style={footer}>
                <button style={btn} onClick={onClose}>닫기</button>
                <button
                    style={primary}
                    onClick={callServerPush}
                    disabled={!manualToken || sending}
                    title={!manualToken ? "토큰 입력 필요" : ""}
                >
                    {sending ? "발송 대기…" : "서버로 발송(FCM, 15초 지연)"}
                </button>
            </div>
        </div>
    );
}
