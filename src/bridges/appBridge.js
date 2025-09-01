/**
 * 파일명: bridges/appBridge.js
 * 설명: Web ↔ App 메시지 브리지 유틸리티.
 *       iOS (WKWebView) / Android (ReactNative WebView) 환경에서
 *       웹과 네이티브 앱 간 JSON 기반 메시지 교환을 담당한다.
 *
 * 주요 기능:
 * - postToApp: 웹에서 앱으로 JSON 메시지를 전송 (iOS/Android 브리지 자동 감지)
 * - notifyNavState: 현재 네비게이션 상태(NAV_STATE)를 앱에 통보 (뒤로가기 처리용)
 * - addAppMessageListener: 앱 → 웹 메시지 수신 핸들러 등록 (문자열 JSON 파싱 포함)
 *
 * 사용 맥락:
 * - RN WebView 내부에서 실행되는 React 웹앱과 네이티브 앱이
 *   서로 메시지를 주고받을 때 반드시 거치는 공용 브리지 레이어
 * - 각 기능별 섹션(useWebViewBack, useSubscription, useAuth 등)에서 사용
 *
 * 연관 메시지 타입:
 * - Web → App: NAV_STATE, WEB_READY, WEB_ERROR, START_SIGNIN, START_SUBSCRIPTION, ...
 * - App → Web: BACK_REQUEST, PERMISSION_STATUS, SIGNIN_RESULT, SUBSCRIPTION_RESULT, ...
 *
 * 비고:
 * - DevTools/기타 확장에서 발생하는 불필요한 window.postMessage 이벤트는 필터링 처리
 * - 반환되는 언바인드 함수로 반드시 정리(cleanup) 가능
 * - context 필드는 스펙에 영향을 주지 않으며 분석/로그 확장용으로 활용
 */

// 앱으로 메시지 보내기
export function postToApp(message) {
    try {
        const payload = typeof message === "string" ? message : JSON.stringify(message);

        // iOS (WKWebView)
        if (window.webkit?.messageHandlers?.appBridge?.postMessage) {
            window.webkit.messageHandlers.appBridge.postMessage(payload);
        }

        // Android (ReactNative WebView)
        if (window.ReactNativeWebView?.postMessage) {
            window.ReactNativeWebView.postMessage(payload);
        }
    } catch (e) {
        console.warn("postToApp error", e);
    }
}

// NAV_STATE 송신 (context를 포함할 수 있음)
export function notifyNavState({
    isRoot = false,
    canGoBackInWeb = false,
    hasBlockingUI = false,
    needsConfirm = false,
    hint = "",
    context = null, // { title, scenario, count, at, ... }
} = {}) {
    const message = {
        type: "NAV_STATE",
        payload: { isRoot, canGoBackInWeb, hasBlockingUI, needsConfirm, hint },
    };
    if (context) {
        // 스펙에 영향 없이 확장 필드로 동봉 (앱은 그대로 패스스루 가능)
        message.payload.context = context;
    }
    postToApp(message);
}

// 앱 → 웹 메시지 수신 바인딩
export function addAppMessageListener(handler) {
    const onDocMessage = (e) => {
        try {
            const raw = e?.data ?? e;
            const msg = typeof raw === "string" ? JSON.parse(raw) : raw;
            if (msg && typeof msg === "object") handler?.(msg, e);
        } catch { }
    };

    const onWindowMessage = (e) => {
        try {
            const raw = e?.data ?? e;
            const msg = typeof raw === "string" ? JSON.parse(raw) : raw;

            // 🔒 DevTools / 기타 확장 메시지 필터링
            if (raw?.source === "react-devtools-content-script") return;
            if (!msg || typeof msg.type !== "string") return;

            handler?.(msg, e);
        } catch { }
    };

    document.addEventListener("message", onDocMessage); // Android RN WebView
    window.addEventListener("message", onWindowMessage); // iOS / 일반 브라우저

    return () => {
        document.removeEventListener("message", onDocMessage);
        window.removeEventListener("message", onWindowMessage);
    };
}
