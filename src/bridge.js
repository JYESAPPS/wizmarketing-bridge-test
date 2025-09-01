// App(WebView)로 postMessage 보내는 헬퍼 & App→Web 수신 리스너

export const postToApp = (message) => {
    try {
        if (window.ReactNativeWebView?.postMessage) {
            window.ReactNativeWebView.postMessage(JSON.stringify(message));
        } else if (window.webkit?.messageHandlers?.appBridge) {
            window.webkit.messageHandlers.appBridge.postMessage(message);
        } else if (window.Android?.postMessage) {
            window.Android.postMessage(JSON.stringify(message));
        } else {
            console.warn("No native bridge found. Running in browser.");
        }
    } catch (e) {
        console.error("postToApp error:", e);
    }
};

export const setupBridgeListener = (onMessage) => {
    const handler = (raw) => {
        try {
            const data = typeof raw === "string" ? JSON.parse(raw) : raw;
            onMessage?.(data);
        } catch (_) { }
    };
    // RN WebView
    window.addEventListener?.("message", (e) => handler(e.data));
    document.addEventListener?.("message", (e) => handler(e.data));
    // 브라우저 단독 테스트용: 콘솔에서 window.__app({type:"PUSH_EVENT", ...})
    window.__app = handler;
};
