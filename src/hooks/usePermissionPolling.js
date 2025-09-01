/**
 * 파일명: hooks/usePermissionPolling.js
 * 설명: 권한 상태를 웹 주도로 주기 점검하는 폴링 훅.
 *       CHECK_PERMISSION(all|camera|push) 질의 → PERMISSION_STATUS 응답 수신을 관리하며,
 *       포커스/가시성 변화 시 재체크와 무응답 백오프, 권한 요청(REQUEST_PERMISSION) API를 제공한다.
 *
 * 주요 기능:
 * - 최초 진입 시 CHECK_PERMISSION(initialName) 자동 전송
 * - 주기적 폴링(intervalMs, 기본 10분)
 * - 페이지 focus/visibility 변화 시 즉시 재체크(1s 디바운스)
 * - 응답 타임아웃(timeoutMs, 기본 3s) 시 지수 백오프(5s → 15s → 60s)로 한 번 더 재시도
 * - requestPermission(name): 사용자 액션 직전 네이티브 권한 팝업 트리거
 * - 상태 값: status(camera/push의 granted/blocked), lastUpdatedAt, checking, error
 *
 * 사용 맥락:
 * - RN WebView 기반 앱에서 권한 상태를 “웹이 먼저” 주도적으로 확인하고,
 *   필요 시 REQUEST_PERMISSION으로 팝업을 띄우는 UX 구현에 사용
 * - PermissionModal 등 UI와 함께 사용하면 Preview/전송/결과 확인까지 일관된 테스트 가능
 *
 * 연관 메시지 타입:
 * - Web → App: CHECK_PERMISSION { name:"all|camera|push" }, REQUEST_PERMISSION { name:"camera|push" }
 * - App → Web: PERMISSION_STATUS { camera:{granted,blocked}, push:{granted,blocked} }
 *
 * 비고:
 * - DevTools 등 외부 postMessage는 addAppMessageListener 내부 필터로 무시
 * - 무응답/오류(reason)는 error 상태에 기록되며, 다음 트리거에서 다시 정상화 가능
 * - focusIntervalMs 옵션은 별도 훅으로 분리하는 것을 권장(현재는 intervalMs와 동일하게 동작)
 */


import { useCallback, useEffect, useRef, useState } from "react";
import { postToApp, addAppMessageListener } from "../bridges/appBridge";

/**
 * 권한 폴링 훅
 * - 최초 마운트 시 CHECK_PERMISSION {all}
 * - 페이지 visible/focus 시 재체크
 * - 주기적 폴링(기본 10분)
 * - 무응답 시 지수 백오프(5s → 15s → 60s)
 * - REQUEST_PERMISSION API 제공 (사용자 액션 직전 호출)
 */
export default function usePermissionPolling(options = {}) {
    const {
        initialName = "all",
        intervalMs = 10 * 60 * 1000,      // 기본 10분
        focusIntervalMs = 3 * 60 * 1000,  // 민감 페이지에서 쓰고 싶으면 페이지 외부에서 훅 2개로 분리 권장
        timeoutMs = 3000,                 // 응답 타임아웃
        backoffPlan = [5000, 15000, 60000],
        attachFocusAndVisibility = true,
    } = options;

    // 권한 스냅샷
    const [status, setStatus] = useState({
        camera: { granted: null, blocked: null },
        push: { granted: null, blocked: null },
    });
    const [lastUpdatedAt, setLastUpdatedAt] = useState(null);
    const [checking, setChecking] = useState(false);
    const [error, setError] = useState(null);

    // 내부 상태
    const inFlightRef = useRef(false);
    const timeoutRef = useRef(null);
    const backoffIdxRef = useRef(0);
    const pollTimerRef = useRef(null);
    const visTimerRef = useRef(null);
    const unbindRef = useRef(null);

    const clearTimers = () => {
        if (timeoutRef.current) { clearTimeout(timeoutRef.current); timeoutRef.current = null; }
        if (pollTimerRef.current) { clearInterval(pollTimerRef.current); pollTimerRef.current = null; }
        if (visTimerRef.current) { clearTimeout(visTimerRef.current); visTimerRef.current = null; }
    };

    const applyStatus = useCallback((payload) => {
        // payload 예: { camera: {granted,blocked}, push: {granted,blocked} }
        setStatus((prev) => ({
            camera: {
                granted: payload?.camera?.granted ?? prev.camera.granted,
                blocked: payload?.camera?.blocked ?? prev.camera.blocked,
            },
            push: {
                granted: payload?.push?.granted ?? prev.push.granted,
                blocked: payload?.push?.blocked ?? prev.push.blocked,
            },
        }));
        setLastUpdatedAt(Date.now());
        setError(null);
    }, []);

    const handleSuccess = useCallback((payload) => {
        inFlightRef.current = false;
        setChecking(false);
        backoffIdxRef.current = 0;      // 성공 시 백오프 초기화
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
        applyStatus(payload);
    }, [applyStatus]);

    const handleTimeoutOrError = useCallback((reason = "timeout") => {
        inFlightRef.current = false;
        setChecking(false);
        setError(reason);

        const idx = Math.min(backoffIdxRef.current, backoffPlan.length - 1);
        const wait = backoffPlan[idx];
        backoffIdxRef.current = Math.min(idx + 1, backoffPlan.length); // 다음 회차 인덱스 증가

        // 다음 폴링까지 기다림 (주기 폴링과 별개, 즉시 재시도용)
        if (visTimerRef.current) clearTimeout(visTimerRef.current);
        visTimerRef.current = setTimeout(() => {
            requestCheck("all"); // 백오프 후 즉시 한 번 추가 체크
        }, wait);
    }, [backoffPlan]);

    const requestCheck = useCallback((name = "all") => {
        if (inFlightRef.current) return; // 중복 방지
        inFlightRef.current = true;
        setChecking(true);

        try {
            postToApp({ type: "CHECK_PERMISSION", payload: { name } });
        } catch (e) {
            handleTimeoutOrError("bridge_post_error");
            return;
        }

        // 응답 타임아웃
        timeoutRef.current = setTimeout(() => {
            timeoutRef.current = null;
            handleTimeoutOrError("timeout");
        }, timeoutMs);
    }, [timeoutMs, handleTimeoutOrError]);

    const requestPermission = useCallback((name /* "camera" | "push" */) => {
        // 사용자 액션 직전에 호출할 것
        try {
            postToApp({ type: "REQUEST_PERMISSION", payload: { name } });
            // 성공/실패 여부는 PERMISSION_STATUS로 회신됨
        } catch (e) {
            setError("bridge_post_error");
        }
    }, []);

    // 앱 → 웹 수신 바인딩
    useEffect(() => {
        const unbind = addAppMessageListener((msg, raw) => {
            if (!msg || typeof msg.type !== "string") return;
            if (raw?.data?.source === "react-devtools-content-script") return;

            if (msg.type === "PERMISSION_STATUS") {
                handleSuccess(msg.payload || {});
            }
        });
        unbindRef.current = unbind;
        return () => unbind?.();
    }, [handleSuccess]);

    // 최초 진입: 즉시 체크
    useEffect(() => {
        requestCheck(initialName);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // 주기 폴링 (기본 10분)
    useEffect(() => {
        if (pollTimerRef.current) clearInterval(pollTimerRef.current);
        pollTimerRef.current = setInterval(() => {
            requestCheck("all");
        }, intervalMs);
        return () => {
            if (pollTimerRef.current) clearInterval(pollTimerRef.current);
            pollTimerRef.current = null;
        };
    }, [intervalMs, requestCheck]);

    // 페이지 가시성/포커스 시 즉시 체크 (디바운스 1s)
    useEffect(() => {
        if (!attachFocusAndVisibility) return;

        let lastRun = 0;
        const trigger = () => {
            const now = Date.now();
            if (now - lastRun < 1000) return; // 1초 디바운스
            lastRun = now;
            requestCheck("all");
        };

        const onVis = () => {
            if (document.visibilityState === "visible") trigger();
        };
        const onFocus = () => trigger();

        document.addEventListener("visibilitychange", onVis);
        window.addEventListener("focus", onFocus);

        return () => {
            document.removeEventListener("visibilitychange", onVis);
            window.removeEventListener("focus", onFocus);
        };
    }, [attachFocusAndVisibility, requestCheck]);

    // 언마운트 정리
    useEffect(() => () => {
        clearTimers();
    }, []);

    return {
        status,            // { camera:{granted,blocked}, push:{granted,blocked} }
        lastUpdatedAt,     // number | null
        checking,          // boolean
        error,             // string | null
        requestCheck,      // (name="all") => void
        requestPermission, // ("camera"|"push") => void (사용자 액션 직전)
    };
}
