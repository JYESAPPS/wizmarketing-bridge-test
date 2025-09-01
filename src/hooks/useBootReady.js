/**
 * 파일명: hooks/useBootReady.js
 * 설명: WebView 초기 부팅/스플래시 단계에서 App과의 핸드셰이크 메시지를
 *       구성·전송하기 위한 상태 관리 훅.
 *       WEB_READY / WEB_ERROR 메시지의 preview를 만들고 postMessage 전송까지 지원한다.
 *
 * 주요 기능:
 * - cmd 상태: "WEB_READY" | "WEB_ERROR" 선택
 * - WEB_READY: { type:"WEB_READY", payload:{ at, ver } }
 * - WEB_ERROR: { type:"WEB_ERROR", payload:{ stage, message, at } }
 * - 입력값 상태 관리 (ver, stage, message, at)
 * - preview: 현재 입력 기반 메시지 JSON을 useMemo로 생성
 * - send(): postToApp(preview)로 App에 실제 전송
 *
 * 사용 맥락:
 * - RN WebView 환경에서 앱 초기 로딩 시 Web → App으로
 *   WEB_READY/WEB_ERROR를 보내는 과정을 시뮬레이션하거나 테스트
 * - BootReadyPage 같은 테스트 UI 컴포넌트에서 사용
 *
 * 연관 메시지 타입:
 * - Web → App: WEB_READY { at, ver }, WEB_ERROR { stage, message, at }
 * - App → Web: (선택적으로) WEB_READY_ACK, WEB_ERROR_ACK, OFFLINE_FALLBACK 등
 *
 * 비고:
 * - 실제 운영에서는 DOMContentLoaded 시 자동으로 WEB_READY를 전송하는 것이 권장되며,
 *   본 훅은 개발/QA 테스트 목적의 수동 제어용
 * - at은 ms 단위 epoch, ver은 문자열 버전
 */

import { useCallback, useMemo, useState } from "react";
import { postToApp } from "../bridges/appBridge";

export default function useBootReady() {
    // command/type 선택
    const [cmd, setCmd] = useState("WEB_READY"); // WEB_READY | WEB_ERROR
    const [ver, setVer] = useState("1.0.0");

    // WEB_ERROR 필드
    const [stage, setStage] = useState("boot"); // boot | runtime
    const [message, setMessage] = useState("bundle load fail");

    // 공통 타임스탬프
    const [at, setAt] = useState(() => Date.now());

    const preview = useMemo(() => {
        if (cmd === "WEB_ERROR") {
            return {
                type: "WEB_ERROR",
                payload: { stage, message, at: Number(at) || Date.now() },
            };
        }
        return {
            type: "WEB_READY",
            payload: { at: Number(at) || Date.now(), ver: String(ver || "1.0.0") },
        };
    }, [cmd, ver, stage, message, at]);

    const send = useCallback(() => {
        postToApp(preview);
    }, [preview]);

    return {
        // state
        cmd, setCmd,
        ver, setVer,
        stage, setStage,
        message, setMessage,
        at, setAt,

        // actions
        preview,
        send,
    };
}
