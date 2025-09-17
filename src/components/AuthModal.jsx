/**
 * 파일명: components/AuthModal.jsx
 * 설명: 로그인/로그아웃 테스트용 모달 컴포넌트.
 *       WebView 환경에서 Web → App으로 START_SIGNIN/START_SIGNOUT 메시지를 보내고,
 *       App → Web으로 SIGNIN_RESULT/SIGNOUT_RESULT 응답을 수신해 세션 상태를 확인한다.
 *
 * 주요 기능:
 * - 콤보박스로 type(START_SIGNIN/START_SIGNOUT)과 provider(kakao/google) 선택
 * - 선택한 명령을 JSON Preview로 표시 후 [앱으로 전송] 버튼으로 postMessage 발송
 * - 현재 로그인 상태/세션 만료 시각/에러 상태를 상단 배지로 표시
 * - 로그인된 경우, 세션 정보를 JSON으로 하단에 출력
 *
 * 사용 맥락:
 * - RN WebView 기반 앱에서 인증 브리지 동작을 검증할 때 사용
 * - useAuth 훅과 함께 동작하며, 세션 저장/로딩은 useAuth가 담당
 *
 * 연관 메시지 타입:
 * - Web → App: START_SIGNIN, START_SIGNOUT
 * - App → Web: SIGNIN_RESULT, SIGNOUT_RESULT
 *
 * 비고:
 * - 모달 오픈/애니메이션 상태(anim)는 내부 useState로 관리
 * - isOpen=false 시 return null로 즉시 언마운트
 * - Preview/전송 버튼 패턴은 다른 섹션 모달들과 일관되게 구성
 */

import React, { useEffect, useMemo, useState } from "react";
import { postToApp } from "../bridges/appBridge";

const drawer = {
    position: "fixed", top: 0, left: 0, height: "100%", width: 360, maxWidth: "92vw",
    background: "#fff", boxShadow: "8px 0 24px rgba(0,0,0,0.12)", overflowY: "auto", zIndex: 9999
};
const header = { padding: "16px 20px 8px", borderBottom: "1px solid #eee", fontWeight: 700, fontSize: 18 };
const body = { padding: 20 };
const footer = { padding: 16, borderTop: "1px solid #eee", display: "flex", gap: 10, justifyContent: "flex-end" };
const input = { width: "100%", padding: "10px 12px", border: "1px solid #ddd", borderRadius: 10, outline: "none" };
const selectInput = { ...input, height: 40 };
const label = { fontSize: 13, color: "#444", marginBottom: 6, display: "block" };
const btn = { padding: "10px 14px", borderRadius: 10, border: "1px solid #ddd", background: "#fff", cursor: "pointer" };
const primary = { ...btn, background: "#222", color: "#fff", borderColor: "#222" };
const badge = (ok) => ({ display: "inline-block", padding: "2px 8px", borderRadius: 999, background: ok ? "#e8f6ef" : "#f5f5f5", color: ok ? "#0a7" : "#777", fontSize: 12 });

const PROVIDERS = [
    { value: "google", label: "google" },
    { value: "kakao", label: "kakao" },
    { value: "naver", label: "naver" },
];

export default function AuthModal({ isOpen, onClose, session, isAuthed, loading, error }) {
    const [anim, setAnim] = useState(false);
    const [cmd, setCmd] = useState("START_SIGNIN");     // START_SIGNIN | START_SIGNOUT
    const [provider, setProvider] = useState("google"); // google | apple | kakao

    useEffect(() => {
        if (isOpen) {
            const t = setTimeout(() => setAnim(true), 10);
            return () => clearTimeout(t);
        } else {
            setAnim(false);
        }
    }, [isOpen]);

    const preview = useMemo(() => {
        if (cmd === "START_SIGNOUT") return { type: "START_SIGNOUT" };
        if (provider === "naver") {
            const state = crypto.randomUUID();                 // CSRF 방지
            sessionStorage.setItem("naver_oauth_state", state);
            const redirectUri = new URL('/', window.location.origin).toString(); 

            return {
                type: "START_SIGNIN",
                payload: {
                    provider: "naver",
                    redirectUri: redirectUri,           // ✅ 라우팅 없이 “현재 페이지”로 콜백
                    state,
                },
            };
        }
        return { type: "START_SIGNIN", payload: { provider } };
    }, [cmd, provider]);

    const handleSend = () => {

        // 👉 보낸 메시지를 로그에도 남기기
        window.dispatchEvent(
            new MessageEvent("message", {
                data: JSON.stringify({
                    type: "SEND_DEBUG",
                    payload: preview,
                }),
            })
        );

        // 실제 앱으로 전송
        postToApp(preview);
    };

    if (!isOpen) return null;

    const panelStyle = {
        ...drawer,
        transform: anim ? "translateX(0)" : "translateX(-100%)",
        transition: "transform 260ms ease",
    };

    return (
        <div style={panelStyle} onClick={(e) => e.stopPropagation()}>
            <div style={header}>로그인/로그아웃 테스트</div>
            <div style={body}>
                {/* 상태 배지 */}
                <section style={{ marginBottom: 12 }}>
                    <span style={badge(isAuthed)}>
                        {isAuthed ? `로그인됨: ${session?.user?.nickname || session?.user?.id || "user"}` : "로그아웃"}
                    </span>
                    {session?.expires_at && (
                        <span style={{ ...badge(true), marginLeft: 8 }}>
                            만료: {new Date(session.expires_at).toLocaleTimeString()}
                        </span>
                    )}
                    {loading && <span style={{ marginLeft: 8, fontSize: 12, color: "#555" }}>진행 중...</span>}
                    {error && <span style={{ marginLeft: 8, fontSize: 12, color: "#c20" }}>{String(error)}</span>}
                </section>

                {/* 콤보: type / provider */}
                <section style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 16 }}>
                    <div>
                        <label style={label}>type</label>
                        <select style={selectInput} value={cmd} onChange={(e) => setCmd(e.target.value)}>
                            <option value="START_SIGNIN">START_SIGNIN</option>
                            <option value="START_SIGNOUT">START_SIGNOUT</option>
                        </select>
                    </div>
                    <div>
                        <label style={label}>provider</label>
                        <select
                            style={selectInput}
                            value={provider}
                            onChange={(e) => setProvider(e.target.value)}
                            disabled={cmd === "START_SIGNOUT"}
                        >
                            {PROVIDERS.map(p => (
                                <option key={p.value} value={p.value}>{p.label}</option>
                            ))}
                        </select>
                    </div>
                </section>

                {/* 미리보기 */}
                <section style={{ marginBottom: 16 }}>
                    <div style={{ fontWeight: 600, marginBottom: 8 }}>보낼 메시지 (Preview)</div>
                    <pre style={{ background: "#0f172a", color: "#e5e7eb", padding: 12, borderRadius: 8, fontSize: 12, overflowX: "auto", margin: 0 }}>
                        {JSON.stringify(preview, null, 2)}
                    </pre>
                    <div style={{ fontSize: 12, color: "#777", marginTop: 8 }}>
                        * 이 버튼은 Web→App으로 위 JSON을 보냅니다. 결과는 App→Web의 <code>SIGNIN_RESULT / SIGNOUT_RESULT</code>로 수신됩니다.
                    </div>
                </section>

                {/* 현재 세션 JSON (있을 때) */}
                {isAuthed && (
                    <section>
                        <div style={{ fontWeight: 600, marginBottom: 8 }}>현재 세션</div>
                        <pre style={{ background: "#111827", color: "#e5e7eb", padding: 12, borderRadius: 8, fontSize: 12, overflowX: "auto", margin: 0 }}>
                            {JSON.stringify(session, null, 2)}
                        </pre>
                    </section>
                )}
            </div>

            <div style={footer}>
                <button style={btn} onClick={onClose}>닫기</button>
                <button style={primary} onClick={handleSend}>앱으로 전송</button>
            </div>
        </div>
    );
}
