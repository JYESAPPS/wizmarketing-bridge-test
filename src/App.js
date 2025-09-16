// App.jsx

/**
 * 파일명: App.js
 * 설명: 브리지 테스트 웹의 루트 컴포넌트. 
 *       RN WebView 안에서 실행되며, 모든 섹션 페이지와 종합 로그를 관리한다.
 *
 * 주요 기능:
 * - CollapseSection으로 각 테스트 섹션(WebViewBack, Push, Permission, Auth, Subscription, BootReady, Share)을 감싼다
 * - addAppMessageListener를 통해 App → Web 메시지를 수신하여 종합 로그 기록
 * - Web → App 초기 신호(WEB_READY) 자동 발송
 *
 * 사용 맥락:
 * - RN WebView에 띄운 테스트 툴의 엔트리 포인트
 * - 앱 개발자/QA가 기능별 동작을 검증할 때 사용
 *
 * 연관 메시지 타입:
 * - WEB_READY, PUSH_EVENT, PUSH_TOKEN, BACK_REQUEST,
 *   SUBSCRIPTION_RESULT, RESTORE_RESULT, PERMISSION_STATUS,
 *   SIGNIN_RESULT, SIGNOUT_RESULT, SPLASH_STATE, OFFLINE_FALLBACK,
 *   RETRY_TRIGGER, WEB_READY_ACK, WEB_ERROR_ACK, SHARE_RESULT
 *
 * 비고:
 * - 종합 로그에는 summarize()를 통해 요약된 내용만 남기고,
 *   상세 payload는 각 섹션 전용 LogBox에서 확인 가능
 */

import React, { useEffect, useRef, useState } from "react";
import { postToApp, addAppMessageListener } from "./bridges/appBridge";

// 섹션 페이지들
import BootReadyPage from "./pages/BootReadyPage";
import WebViewBackPage from "./pages/WebViewBackPage";
import PushPage from "./pages/PushPage";
import PermissionPage from "./pages/PermissionPage";
import AuthPage from "./pages/AuthPage";
import SubscriptionPage from "./pages/SubscriptionPage";
import SharePage from "./pages/SharePage";             // ✅ 추가

// 공용
import CollapseSection from "./components/CollapseSection";
import DownloadPage from "./pages/DownloadPage";

// ✅ 허용 메시지 목록(종합 로그/핸들링용)
const ALLOWED_TYPES = new Set([
  "PUSH_EVENT",
  "PUSH_TOKEN",
  "BACK_REQUEST",
  "SUBSCRIPTION_RESULT",
  "RESTORE_RESULT",
  "PERMISSION_STATUS",
  "SIGNIN_RESULT",
  "SIGNOUT_RESULT",
  "SPLASH_STATE",
  "OFFLINE_FALLBACK",
  "RETRY_TRIGGER",
  "WEB_READY_ACK",
  "WEB_ERROR_ACK",
  "SHARE_RESULT",                      // ✅ 공유 결과 수신
  "DOWNLOAD_RESULT",   // ✅ RN → Web 다운로드 결과 로그 받을 수 있게
]);

export default function App() {
  const [logs, setLogs] = useState([]);
  const logRef = useRef(null);

  const pushLog = (title, obj) => {
    const line = `[${new Date().toLocaleTimeString()}] ${title} ${obj ? (typeof obj === "string" ? obj : JSON.stringify(obj)) : ""
      }`;
    setLogs((prev) => [...prev.slice(-499), line]);
  };

  // 메시지 요약 변환기(종합 로그용)
  const summarize = (msg) => {
    const p = msg?.payload || {};
    switch (msg.type) {
      case "PUSH_EVENT":
        return { event: p.event, deeplink: p.deeplink, id: p.messageId };
      case "PUSH_TOKEN":
        return { tail: p.token ? `…${String(p.token).slice(-8)}` : "", platform: p.platform, ver: p.app_version };
      case "BACK_REQUEST":
        return { nav: p.nav?.hint || p.nav || {} };
      case "SUBSCRIPTION_RESULT":
        return p.success ? { ok: true, product: p.product_id, tx: p.transaction_id } : { ok: false, code: p.error_code };
      case "RESTORE_RESULT":
        return { active: p.active, product: p.product_id, tx: p.transaction_id };
      case "PERMISSION_STATUS":
        return { cam: p.camera, push: p.push };
      case "SIGNIN_RESULT":
        return p.success ? { ok: true, provider: p.provider, user: p.user?.id || p.user?.nickname } : { ok: false, code: p.error_code };
      case "SIGNOUT_RESULT":
        return { ok: p.success };
      case "SPLASH_STATE":
        return { on: !!p.on };
      case "OFFLINE_FALLBACK":
        return { reason: p.reason, at: p.at };
      case "RETRY_TRIGGER":
        return { at: p.at };
      case "WEB_READY_ACK":
      case "WEB_ERROR_ACK":
        return p;
      case "SHARE_RESULT":                                // ✅ 공유 요약
        return p.success ? { ok: true, platform: p.platform, post: p.post_id } : { ok: false, code: p.error_code };
      default:
        return p;
    }
  };

  // 단일 핸들러
  const handleMessage = (msg, rawEvent) => {
    // DevTools/스팸 차단
    if (rawEvent?.data?.source === "react-devtools-content-script") return;
    if (!msg || typeof msg !== "object" || typeof msg.type !== "string") return;
    if (!ALLOWED_TYPES.has(msg.type)) {
      // pushLog("⇦ (ignored)", { type: msg.type });
      return;
    }

    // 종합 로그: 요약으로 남김
    pushLog(`⇦ ${msg.type}`, summarize(msg));

    // 상세 처리는 각 섹션 페이지(useSectionLog)에서 수행
  };

  // 앱 → 웹 메시지 수신 (종합 로그)
  useEffect(() => {
    const unbind = addAppMessageListener((msg, rawEvent) => handleMessage(msg, rawEvent));

    // 웹 로드 완료 신호 (스플래시 해제 트리거)
    const ready = { type: "WEB_READY", payload: { at: Date.now(), ver: "WizMarketing@0.1.0" } };
    setTimeout(() => {
      postToApp(ready);
      pushLog("⇨ Web → App", ready);
    }, 100);

    return () => unbind?.();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // 의도적으로 deps 비움(핸들러 재바인딩 방지)

  // 종합 로그 자동 스크롤
  useEffect(() => {
    if (logRef.current) logRef.current.scrollTop = logRef.current.scrollHeight;
  }, [logs]);

  return (
    <div className="wrap">
      <h1>WizMarketing(CRA)</h1>


      <div className="grid">
        <CollapseSection id="sec-boot" title="부팅 & Splash[검증완료]" defaultOpen={true}>
          <BootReadyPage />
        </CollapseSection>

        <CollapseSection id="sec-perm" title="권한 테스트[검증완료]" defaultOpen={false}>
          <PermissionPage />
        </CollapseSection>

        <CollapseSection id="sec-back" title="뒤로가기 테스트[검증완료]" defaultOpen={true}>
          <WebViewBackPage />
        </CollapseSection>

        <CollapseSection id="sec-subscription" title="구독/결제 테스트[검증완료]" defaultOpen={false}>
          <SubscriptionPage />
        </CollapseSection>



        <CollapseSection id="sec-push" title="푸시 알람 테스트[검증완료]" defaultOpen={false}>
          <PushPage />
        </CollapseSection>

        <CollapseSection id="sec-auth" title="로그인 테스트[검증완료]" defaultOpen={false}>
          <AuthPage />
        </CollapseSection>

  
        <CollapseSection id="sec-share" title="공유(인스타 등) 테스트[검증완료]" defaultOpen={false}>
          <SharePage />
        </CollapseSection>


        <CollapseSection id="sec-download" title="이미지 다운로드 테스트[검증완료]" defaultOpen={false}>
          <DownloadPage />
        </CollapseSection>
        
      </div>

      {/* <h2 style={{ marginTop: 20 }}>종합 로그</h2>
      <div className="log" ref={logRef}>
        {logs.map((l, i) => (
          <div key={i}>{l}</div>
        ))}
      </div> */}
    </div>
  );
}
