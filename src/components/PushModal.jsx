/**
 * 파일명: components/PushModal.jsx
 * 설명: 푸시 알림 테스트 모달(UI). 디바이스 토큰을 수동 입력하고,
 *       App→Web으로 전달될 PUSH_EVENT(payload)를 개발 환경에서 시뮬레이션한다.
 *
 * 주요 기능:
 * - Manual Token 입력/저장(localStorage) + platform(android/ios) 지정
 * - (읽기전용) App에서 수신한 최신 PUSH_TOKEN 표시
 * - 이벤트 시뮬레이터: event(received|clicked), title, body, deeplink, extra(JSON), messageId, ts 구성
 * - 보낼 JSON(Preview) 확인 후 “웹 핸들러로 주입(시뮬레이트)” 버튼으로 window.postMessage 전송
 *   (실제 OS 푸시 발송은 서버에서 수행하며, 본 모달은 웹 핸들러 동작 검증에 초점)
 *
 * 사용 맥락:
 * - RN WebView 기반 앱에서 푸시 수신 후 App→Web 전달 규격(PUSH_EVENT)을 검증
 * - 앱 없이도 브라우저에서 토스트/딥링크 라우팅 등의 웹 처리 로직을 빠르게 재현
 *
 * 연관 메시지 타입:
 * - App → Web: PUSH_TOKEN { token, platform, app_version, install_id, ts }
 * - (시뮬) App → Web: PUSH_EVENT { event, title, body, deeplink, extra, platform, messageId, ts }
 *
 * 비고:
 * - ‘clicked’ 이벤트 테스트 시 deeplink 입력을 권장(라우팅 검증)
 * - extra는 유효한 JSON이어야 하며, 파싱 실패 시 전송 버튼 비활성화
 * - DevTools 등 외부 메시지는 addAppMessageListener 내부에서 필터링 처리
 */


import React, { useEffect, useMemo, useState } from "react";
import { addAppMessageListener } from "../bridges/appBridge";

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

    // 이벤트 시뮬레이터(앱→웹 메시지를 모의 주입)
    const [eventType, setEventType] = useState("received"); // received | clicked
    const [title, setTitle] = useState("새 알림");
    const [bodyText, setBodyText] = useState(" Wizmarket 에서 푸시알람을 보냈습니다.");
    const [deeplink, setDeeplink] = useState("/jobs/12345");
    const [extra, setExtra] = useState('{ "jobId": "12345" }');
    const [messageId, setMessageId] = useState("");
    const [ts, setTs] = useState(() => Date.now());

    // 🔁 애니메이션 트리거 (훅은 항상 호출, 내부에서 isOpen 분기)
    useEffect(() => {
        if (isOpen) {
            const t = setTimeout(() => setAnim(true), 10);
            return () => clearTimeout(t);
        } else {
            setAnim(false);
        }
    }, [isOpen]);

    // ✅ 앱에서 PUSH_TOKEN 수신 (항상 훅을 동일 순서로 호출)
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

    // 🧠 보낼 메시지(시뮬레이트) 미리보기 (훅은 return 위에서 호출)
    const preview = useMemo(() => {
        let parsedExtra = null;
        try { parsedExtra = extra ? JSON.parse(extra) : null; } catch { parsedExtra = "__INVALID_JSON__"; }
        return {
            type: "PUSH_EVENT",
            payload: {
                event: eventType,
                title: title || undefined,
                body: bodyText || undefined,
                deeplink: deeplink || undefined,
                extra: parsedExtra || undefined,
                platform: platform || undefined,
                messageId: messageId || undefined,
                ts: ts || Date.now(),
            },
        };
    }, [eventType, title, bodyText, deeplink, extra, platform, messageId, ts]);

    // ⛔️ 여기서부터는 훅이 없으니 초기 return null 해도 안전
    if (!isOpen) return null;

    const panelStyle = {
        ...drawer,
        transform: anim ? "translateX(0)" : "translateX(-100%)",
        transition: "transform 260ms ease",
    };

    const invalidExtra = preview.payload.extra === "__INVALID_JSON__";
    const canSend = !invalidExtra && (eventType !== "clicked" || !!deeplink);

    const handleSendToWebHandler = async () => {
        try {
            window.postMessage(JSON.stringify(preview), "*");
        } catch { }
    };

    const handleSaveToken = () => {
        try {
            localStorage.setItem(LS_TOKEN, manualToken);
            localStorage.setItem(LS_PLATFORM, platform);
        } catch { }
    };

    return (
        <div style={panelStyle} onClick={(e) => e.stopPropagation()}>
            <div style={header}>푸시 테스트 (토큰 수동 입력)</div>

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

                {/* 2) 이벤트 시뮬레이터 입력 */}
                <section style={{ marginBottom: 8 }}>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                        <div>
                            <label style={label}>event</label>
                            <select style={selectInput} value={eventType} onChange={(e) => setEventType(e.target.value)}>
                                <option value="received">received</option>
                                <option value="clicked">clicked</option>
                            </select>
                        </div>
                        <div>
                            <label style={label}>messageId (선택)</label>
                            <input style={input} value={messageId} onChange={(e) => setMessageId(e.target.value)} placeholder="중복 방지 식별자" />
                        </div>
                    </div>

                    <div style={{ marginTop: 12 }}>
                        <label style={label}>title</label>
                        <input style={input} value={title} onChange={(e) => setTitle(e.target.value)} />
                    </div>
                    <div style={{ marginTop: 12 }}>
                        <label style={label}>body</label>
                        <input style={input} value={bodyText} onChange={(e) => setBodyText(e.target.value)} />
                    </div>
                    <div style={{ marginTop: 12 }}>
                        <label style={label}>deeplink (clicked에는 권장/사실상 필수)</label>
                        <input style={input} value={deeplink} onChange={(e) => setDeeplink(e.target.value)} placeholder="/jobs/12345" />
                    </div>
                    <div style={{ marginTop: 12 }}>
                        <label style={label}>extra (JSON)</label>
                        <textarea rows={4} style={{ ...input, fontFamily: "monospace" }} value={extra} onChange={(e) => setExtra(e.target.value)} />
                        {invalidExtra && <div style={{ color: "#c20", fontSize: 12, marginTop: 6 }}>유효한 JSON이 아닙니다.</div>}
                    </div>
                    <div style={{ marginTop: 12 }}>
                        <label style={label}>ts (epoch ms)</label>
                        <input type="number" style={input} value={ts} onChange={(e) => setTs(Number(e.target.value) || 0)} />
                    </div>
                </section>

                {/* 3) 보낼 메시지 미리보기 */}
                <section style={{ marginTop: 8 }}>
                    <div style={{ fontWeight: 600, marginBottom: 8 }}>보낼 메시지 (App→Web을 시뮬레이트)</div>
                    <pre style={{ background: "#0f172a", color: "#e5e7eb", padding: 12, borderRadius: 8, fontSize: 12, overflowX: "auto", margin: 0 }}>
                        {JSON.stringify(preview, null, 2)}
                    </pre>
                    <div style={{ fontSize: 12, color: "#777", marginTop: 8 }}>
                        * 실제 OS 푸시는 서버에서 발송합니다. 이 버튼은 <b>앱이 보냈다고 가정</b>하고 웹 핸들러에 주입하는 개발용 시뮬레이터입니다.
                    </div>
                </section>
            </div>

            <div style={footer}>
                <button style={btn} onClick={onClose}>닫기</button>
                <button
                    style={primary}
                    onClick={handleSendToWebHandler}
                    disabled={!canSend}
                    title={!canSend ? "extra JSON 오류 또는 clicked에는 deeplink 권장" : ""}
                >
                    웹 핸들러로 주입(시뮬레이트)
                </button>
            </div>
        </div>
    );
}
