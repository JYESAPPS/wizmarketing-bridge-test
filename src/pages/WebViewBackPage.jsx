/**
 * 파일명: pages/WebViewBackPage.jsx
 * 설명: WebView 뒤로가기 테스트 페이지.
 *       모달(WebViewBackModal)에서 NAV_STATE 입력/미리보기/실행을 담당하고,
 *       이 페이지는 App → Web의 BACK_REQUEST 이벤트를 LogBox로 수집/표시한다.
 *
 * LogBox 수신 타입(필터):
 * - BACK_REQUEST { nav:{ isRoot, canGoBackInWeb, hasBlockingUI, needsConfirm, hint } }
 *
 * 요약 가이드(추천):
 * - `back: hint=<detail|modal|home|form> confirm=<true|false> blocking=<true|false>`
 *   (필요에 따라 isRoot/canGoBackInWeb을 추가)
 *
 * 사용 맥락:
 * - RN WebView 앱에서 하드웨어 뒤로가기 플로우 검증
 *   · 웹은 라우트/모달 상태가 바뀔 때 NAV_STATE를 앱에 통보
 *   · 앱은 하드웨어 뒤로가기 시 BACK_REQUEST로 마지막 NAV_STATE를 웹에 전달(패스스루)
 *   · 웹은 모달 닫기/confirm/back 등 자체 처리
 *
 * 비고:
 * - 최초 진입 시 ENTRY 힌트를 NAV_STATE로 통보해 앱이 루트 여부를 인지하도록 함
 * - 모달 닫기/중단/완료 시점마다 훅(useWebViewBack)이 NAV_STATE를 적절히 갱신
 */
 
import React, { useEffect } from "react";
import WebViewBackModal from "../components/WebViewBackModal";
import useWebViewBack, { HINTS } from "../hooks/useWebViewBack";
import { addAppMessageListener, notifyNavState } from "../bridges/appBridge";
import useSectionLog from "../hooks/useSectionLog";
import LogBox from "../components/LogBox";

export default function WebViewBackPage({ isRoot = false }) {

    const { logs, pushLocal, clear } = useSectionLog(["BACK_REQUEST"], 200);

    const {
        isOpen,
        phase,
        form,
        errors,
        open,
        close,
        submit,
        abort,
        setField,
    } = useWebViewBack({ isRoot });

    // 최초 진입 NAV_STATE
    useEffect(() => {
        notifyNavState({
            isRoot,
            canGoBackInWeb: window.history.length > 1,
            hasBlockingUI: false,
            needsConfirm: false,
            hint: HINTS.ENTRY,
        });
    }, [isRoot]);

    // BACK_REQUEST 처리
    useEffect(() => {
        return addAppMessageListener((msg) => {
            if (msg?.type === "BACK_REQUEST") {
                pushLocal("BACK_REQUEST", msg.payload?.nav || {});
                if (isOpen) { if (phase === "running") { const ok = window.confirm("테스트를 중단하고 나갈까요?"); if (ok) abort(); } else { close(); } }
                else if (window.history.length > 1) window.history.back();
            }
        });
     }, [isOpen, phase, abort, close, pushLocal]);
    return (
        <div style={{ padding: "10px 4px" }}>

            <div
                style={{
                    background: "#f7f7f7",
                    padding: "12px 16px",
                    borderRadius: 8,
                    fontSize: 14,
                    color: "#444",
                    marginBottom: 16,
                }}
            >
                <b>왜 필요한가?</b><br />
                이 기능은 <b>앱(WebView)과 웹 간의 뒤로가기 동작</b>,
                <b> NAV_STATE 프로토콜</b>, 그리고 <b>실행 중 Confirm 처리</b>를 실제로 확인하기 위한 테스트 도구입니다.
                모달 상태, 실행 중단, 결과 확인까지 전 과정을 Web ↔ App 브리지로 안전하게 제어하는 목적이 있습니다.
            </div>

            <button
                onClick={open}
                style={{
                    padding: "10px 14px",
                    borderRadius: 10,
                    border: "1px solid #222",
                    background: "#222",
                    color: "#fff",
                    cursor: "pointer",
                }}
            >
                테스트 설정 열기
            </button>

            <WebViewBackModal
                isOpen={isOpen}
                phase={phase}
                form={form}
                errors={errors}
                onClose={() => {
                    if (phase === "running") {
                        const ok = window.confirm("실행 중입니다. 중단하고 닫을까요?");
                        if (!ok) return;
                        abort();
                    } else {
                        close();
                    }
                }}
                onSubmit={submit}
                onAbort={abort}
                onChange={setField}
            />
            <LogBox title="뒤로가기 로그" logs={logs} onClear={clear} />
        </div>
    );
}
