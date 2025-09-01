/**
 * 파일명: hooks/useSectionLog.js
 * 설명: 특정 메시지 타입 집합에 대한 섹션 전용 로그 훅.
 *       App → Web 메시지 흐름 중 지정된 타입만 필터링해
 *       해당 섹션 하단(LogBox)에 표시할 로그 배열을 관리한다.
 *
 * 주요 기능:
 * - types 배열로 허용 메시지 타입 지정 (예: ["PUSH_EVENT","PUSH_TOKEN"])
 * - logs: 문자열 배열, 타임스탬프 + 제목 + JSON.stringify(payload)
 * - pushLocal(title,obj): 섹션 내부 동작(전송 이벤트 등)을 직접 로그에 추가
 * - clear(): 로그 비우기
 * - addAppMessageListener를 통해 App → Web 메시지 수신 → types 필터 통과 시 logs에 축적
 *
 * 사용 맥락:
 * - WebViewBackPage, PushPage, PermissionPage, AuthPage, SubscriptionPage 등
 *   각 섹션 하단의 전용 LogBox에 연결
 * - 종합 로그(App.jsx)는 모든 메시지를 수집하지만,
 *   useSectionLog는 특정 섹션 관련 메시지만 분리해 보여줌
 *
 * 연관 메시지 타입:
 * - App → Web: 섹션에 따라 다름 (예: PUSH_EVENT, PERMISSION_STATUS, SIGNIN_RESULT 등)
 * - Web → App: 직접 다루지 않음, 필요 시 pushLocal()로 전송 로그를 남길 수 있음
 *
 * 비고:
 * - maxLen(기본 200): 최대 보관 로그 수, 초과 시 앞부분부터 잘라냄
 * - DevTools/외부 메시지는 addAppMessageListener 내부에서 걸러져 들어오지 않음
 * - pushLocal을 통해 “⇨ Web → App” 전송 로그도 일관된 형식으로 남길 수 있음
 */




import { useEffect, useRef, useState, useCallback } from "react";
import { addAppMessageListener } from "../bridges/appBridge";

export default function useSectionLog(types = [], maxLen = 200) {
    const [logs, setLogs] = useState([]);
    const typesRef = useRef(new Set(types));

    const pushLocal = useCallback((title, obj) => {
        const line = `[${new Date().toLocaleTimeString()}] ${title} ${obj ? (typeof obj === "string" ? obj : JSON.stringify(obj)) : ""}`;
        setLogs(prev => [...prev.slice(-maxLen + 1), line]);
    }, [maxLen]);

    const clear = useCallback(() => setLogs([]), []);

    useEffect(() => { typesRef.current = new Set(types); }, [types]);

    useEffect(() => {
        const unbind = addAppMessageListener((msg) => {
            if (!msg || typeof msg.type !== "string") return;
            if (!typesRef.current.has(msg.type)) return;
            const line = `[${new Date().toLocaleTimeString()}] ⇦ ${msg.type} ${msg.payload ? JSON.stringify(msg.payload) : ""}`;
            setLogs(prev => [...prev.slice(-maxLen + 1), line]);
        });
        return () => unbind?.();
    }, [maxLen]);

    return { logs, pushLocal, clear };
}
