/**
 * 파일명: pages/BootReadyPage.jsx
 * 설명: 부팅/Splash/타임아웃 폴백 모니터링 페이지(자동 전송 전용).
 *       전역에서 자동 발송된 WEB_READY/WEB_ERROR의 결과로 App→Web 이벤트들을
 *       상태판과 LogBox로 시각화한다. (수동 전송 UI 없음)
 *
 * LogBox 수신 타입(필터):
 * - SPLASH_STATE      { on, at }                       // 스플래시 표시 여부
 * - OFFLINE_FALLBACK  { reason("timeout"|"http_error"|"js_error"), at }
 * - RETRY_TRIGGER     { at }                           // 재시도 버튼/트리거
 * - WEB_READY_ACK     { at }                           // (선택) App이 WEB_READY 수신 확인
 * - WEB_ERROR_ACK     { stage, message, at }           // (선택) App이 WEB_ERROR 수신 확인
 *
 * 요약 가이드(추천):
 * - SPLASH_STATE   → "splash: ON|OFF"
 * - OFFLINE_FALLBACK → `fallback: <reason>`
 * - RETRY_TRIGGER  → "retry"
 * - *_ACK          → ACK의 핵심 필드만 표시(예: "ready ack 08:31:12", "error ack boot · 08:31:12")
 *
 * 사용 맥락:
 * - 흰화면 방지를 위한 초기 핸드셰이크 검증(Web이 DOM 준비 즉시 WEB_READY 자동 전송, 오류 시 WEB_ERROR)
 * - App은 스플래시 유지/해제, 타임아웃(6–8s)·오류 시 오프라인/에러 폴백 + 재시도 제공
 *
 * 비고:
 * - App이 위 이벤트들을 보내주면 본 페이지가 상태/로그로 보여줌
 * - 종합 로그(App.jsx)와 중복되지만, 본 페이지는 부팅 관련 이벤트만 분리해 가독성 강화
 */


import React, { useEffect, useMemo, useState } from "react";
import useSectionLog from "../hooks/useSectionLog";
import LogBox from "../components/LogBox";
import { addAppMessageListener } from "../bridges/appBridge";

const label = { fontSize: 13, color: "#555" };
const value = { fontWeight: 700, color: "#111" };
const Box = ({ title, children }) => (
    <div style={{ border: "1px solid #eee", borderRadius: 12, padding: 12 }}>
        <div style={{ fontWeight: 700, marginBottom: 8 }}>{title}</div>
        <div style={{ fontSize: 13, color: "#333" }}>{children}</div>
    </div>
);

function fmt(ts) {
    if (!ts) return "—";
    try { return new Date(ts).toLocaleString(); } catch { return String(ts); }
}

export default function BootReadyPage() {
    // 섹션 전용 로그 (App→Web 이벤트만)
    const { logs, clear, pushLocal } = useSectionLog(
        ["SPLASH_STATE", "OFFLINE_FALLBACK", "RETRY_TRIGGER", "WEB_READY_ACK", "WEB_ERROR_ACK"],
        200
    );

    // 상태판 (읽기 전용)
    const [pageLoadedAt] = useState(() => Date.now());         // 이 페이지가 렌더된 시각 (참고용)
    const [readyAckAt, setReadyAckAt] = useState(null);          // App이 WEB_READY_ACK를 준 시각
    const [errorAck, setErrorAck] = useState(null);          // App이 WEB_ERROR_ACK로 보낸 최근 정보
    const [splashOn, setSplashOn] = useState(null);          // true/false/unknown
    const [fallback, setFallback] = useState(null);          // { reason, at }
    const [retryAt, setRetryAt] = useState(null);          // 재시도 트리거 시각

    // App → Web 이벤트 수신
    useEffect(() => {
        const unbind = addAppMessageListener((msg) => {
            if (!msg?.type) return;

            // 스플래시 상태
            if (msg.type === "SPLASH_STATE") {
                const on = !!(msg.payload?.on);
                setSplashOn(on);
                pushLocal("SPLASH_STATE", { on, at: msg.payload?.at });
            }

            // 오프라인/에러 폴백 진입
            if (msg.type === "OFFLINE_FALLBACK") {
                const reason = msg.payload?.reason || "unknown";
                const at = msg.payload?.at || Date.now();
                setFallback({ reason, at });
                pushLocal("OFFLINE_FALLBACK", { reason, at });
            }

            // 재시도 버튼/트리거
            if (msg.type === "RETRY_TRIGGER") {
                const at = msg.payload?.at || Date.now();
                setRetryAt(at);
                pushLocal("RETRY_TRIGGER", { at });
            }

            // (선택) ACK 들
            if (msg.type === "WEB_READY_ACK") {
                const at = msg.payload?.at || Date.now();
                setReadyAckAt(at);
                pushLocal("WEB_READY_ACK", { at });
            }
            if (msg.type === "WEB_ERROR_ACK") {
                const info = {
                    stage: msg.payload?.stage || "unknown",
                    message: msg.payload?.message || "",
                    at: msg.payload?.at || Date.now(),
                };
                setErrorAck(info);
                pushLocal("WEB_ERROR_ACK", info);
            }
        });
        return () => unbind?.();
    }, [pushLocal]);

    const statusBadges = useMemo(() => {
        const badge = (text, ok) => ({
            text,
            style: {
                display: "inline-block",
                padding: "2px 8px",
                borderRadius: 999,
                background: ok === true ? "#e8f6ef" : ok === false ? "#fdeaea" : "#f5f5f5",
                color: ok === true ? "#0a7" : ok === false ? "#c20" : "#777",
                fontSize: 12,
                marginRight: 6
            }
        });
        return [
            badge(`Splash: ${splashOn === null ? "unknown" : splashOn ? "ON" : "OFF"}`, splashOn === false ? true : splashOn === true ? false : null),
            badge(`Fallback: ${fallback ? fallback.reason : "none"}`, fallback ? false : true),
        ];
    }, [splashOn, fallback]);

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
                이 섹션은 수동 전송 UI가 없습니다. <b>웹이 로드되면 자동으로 WEB_READY</b>가 App으로 전송되고,
                오류 발생 시 <b>WEB_ERROR</b>가 자동 전송됩니다. App은 Splash를 유지/해제하고,
                타임아웃(6–8초) 또는 오류 시 <b>오프라인/에러 폴백</b>으로 전환합니다.
                아래 상태판과 로그에서 App→Web 이벤트를 확인하세요.
                <div style={{ marginTop: 8 }}>
                    <ul style={{ margin: 0, paddingLeft: 18 }}>
                        <li>정상: WEB_READY → Splash 해제 (선택적으로 WEB_READY_ACK 수신)</li>
                        <li>타임아웃: WEB_READY 미수신 → OFFLINE_FALLBACK 통지 → 재시도</li>
                        <li>오류: WEB_ERROR 전송 → 에러 폴백 (선택적으로 WEB_ERROR_ACK 수신)</li>
                    </ul>
                </div>
            </div>


            {/* 상태판 */}
            <div style={{ display: "grid", gap: 12, marginBottom: 12 }}>
                <Box title="현재 상태">
                    <div style={{ marginBottom: 8 }}>
                        {statusBadges.map((b, i) => (
                            <span key={i} style={b.style}>{b.text}</span>
                        ))}
                    </div>
                    <div><span style={label}>이 페이지 로드:</span> <span style={value}>{fmt(pageLoadedAt)}</span></div>
                    <div><span style={label}>WEB_READY_ACK:</span> <span style={value}>{fmt(readyAckAt)}</span></div>
                    <div><span style={label}>WEB_ERROR_ACK:</span> <span style={value}>{errorAck ? `${errorAck.stage} · ${fmt(errorAck.at)}` : "—"}</span></div>
                    <div><span style={label}>Fallback:</span> <span style={value}>{fallback ? `${fallback.reason} · ${fmt(fallback.at)}` : "—"}</span></div>
                    <div><span style={label}>Retry Trigger:</span> <span style={value}>{fmt(retryAt)}</span></div>
                </Box>

                <Box title="가이드">
                    <div style={{ marginBottom: 6 }}>• App이 Splash를 **유지/해제**합니다.</div>
                    <div style={{ marginBottom: 6 }}>• Web은 <b>DOM 준비 즉시 WEB_READY 자동 전송</b> (전역 효과에서 처리).</div>
                    <div style={{ marginBottom: 6 }}>• 오류/예외는 <b>WEB_ERROR</b>로 전송하여 App 폴백 유도.</div>
                    <div>• 아래 로그에서 ACK/폴백/재시도 이벤트를 확인하세요.</div>
                </Box>
            </div>

            {/* 섹션 전용 로그 */}
            <LogBox title="부팅/스플래시 로그" logs={logs} onClear={clear} />
        </div>
    );
}
