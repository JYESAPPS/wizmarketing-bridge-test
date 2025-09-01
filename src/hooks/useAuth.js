/**
 * 파일명: hooks/useAuth.js
 * 설명: WebView 인증 상태 관리 훅.
 *       Web → App으로 START_SIGNIN/START_SIGNOUT를 보내고,
 *       App → Web의 SIGNIN_RESULT/SIGNOUT_RESULT를 수신해
 *       로컬 세션(localStorage)과 UI 상태를 관리한다.
 *
 * 주요 기능:
 * - session 로딩/저장/삭제 (localStorage 키: "auth.session.v1")
 * - 만료 타이머: session.expires_at 기준으로 자동 로그아웃
 * - App → Web 수신:
 *   · SIGNIN_RESULT: 성공 시 세션 저장, 실패 시 error 설정
 *   · SIGNOUT_RESULT: 세션 클리어
 * - Web → App 전송:
 *   · startSignin(provider): { type:"START_SIGNIN", payload:{ provider } }
 *   · startSignout():       { type:"START_SIGNOUT" }
 * - 상태 값: { session, isAuthed, loading, error } 및 액션 { startSignin, startSignout, saveSession, clearSession }
 *
 * 사용 맥락:
 * - RN WebView 기반 앱의 네이티브 인증 SDK(카카오/구글/애플 등)와 브리지로 연동
 * - AuthModal 등 UI 컴포넌트가 이 훅을 사용해 로그인/로그아웃 흐름을 구동
 *
 * 연관 메시지 타입:
 * - Web → App: START_SIGNIN, START_SIGNOUT
 * - App → Web: SIGNIN_RESULT, SIGNOUT_RESULT
 *
 * 비고:
 * - DevTools 등 외부 postMessage는 addAppMessageListener 내부 필터로 차단
 * - expires_at이 없으면 만료 타이머는 동작하지 않음
 * - 보안: 데모용으로 토큰을 localStorage에 저장하지만, 프로덕션에선 안전 저장소(앱 측 Secure Storage/서버 세션) 사용 권장
 */


import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { addAppMessageListener, postToApp } from "../bridges/appBridge";

const LS_AUTH = "auth.session.v1";

export default function useAuth() {
    const [session, setSession] = useState(() => {
        try { return JSON.parse(localStorage.getItem(LS_AUTH) || "null"); } catch { return null; }
    });
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const expireTimerRef = useRef(null);

    const isAuthed = !!session?.user;

    const saveSession = useCallback((s) => {
        setSession(s);
        try { localStorage.setItem(LS_AUTH, JSON.stringify(s)); } catch { }
    }, []);

    const clearSession = useCallback(() => {
        setSession(null);
        try { localStorage.removeItem(LS_AUTH); } catch { }
        if (expireTimerRef.current) clearTimeout(expireTimerRef.current);
    }, []);

    // 토큰 만료 타이머 (있을 때만)
    useEffect(() => {
        if (expireTimerRef.current) clearTimeout(expireTimerRef.current);
        if (!session?.expires_at) return;
        const ms = session.expires_at - Date.now();
        if (ms > 0) {
            expireTimerRef.current = setTimeout(() => clearSession(), ms);
        } else {
            clearSession();
        }
    }, [session?.expires_at, clearSession]);

    // App → Web 결과 수신
    useEffect(() => {
        const unbind = addAppMessageListener((msg, raw) => {
            if (!msg || typeof msg.type !== "string") return;
            if (raw?.data?.source === "react-devtools-content-script") return;

            if (msg.type === "SIGNIN_RESULT") {
                const p = msg.payload || {};
                setLoading(false);
                if (p.success) {
                    // 서버 없는 로컬 세션 모델 (필요 필드만 저장)
                    saveSession({
                        provider: p.provider,
                        user: p.user, // { id, nickname, avatar ... }
                        access_token: p.access_token,
                        id_token: p.id_token,
                        refresh_token: p.refresh_token,
                        expires_at: p.expires_at || null,
                        scopes: p.scopes || [],
                        at: Date.now(),
                    });
                    setError(null);
                } else {
                    setError(p.message || p.error_code || "signin_failed");
                }
            }

            if (msg.type === "SIGNOUT_RESULT") {
                setLoading(false);
                clearSession();
            }
        });
        return () => unbind?.();
    }, [saveSession, clearSession]);

    // Web → App 전송
    const startSignin = useCallback((provider) => {
        setLoading(true);
        setError(null);
        postToApp({ type: "START_SIGNIN", payload: { provider } });
    }, []);

    const startSignout = useCallback(() => {
        setLoading(true);
        setError(null);
        postToApp({ type: "START_SIGNOUT" });
    }, []);

    const value = useMemo(() => ({
        session, isAuthed, loading, error,
        startSignin, startSignout,
        saveSession, clearSession,
    }), [session, isAuthed, loading, error, startSignin, startSignout, saveSession, clearSession]);

    return value;
}
