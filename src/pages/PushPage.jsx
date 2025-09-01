/**
 * 파일명: pages/PushPage.jsx
 * 설명: 푸시 알림 테스트 페이지.
 *       모달(PushModal)에서 디바이스 토큰을 수동 입력하고 PUSH_EVENT를 시뮬레이션하며,
 *       이 페이지는 App → Web의 PUSH_EVENT/PUSH_TOKEN 이벤트를 LogBox로 수집/표시한다.
 *
 * LogBox 수신 타입(필터):
 * - PUSH_EVENT { event("received"|"clicked"), title, body, deeplink, extra, platform, messageId, ts }
 * - PUSH_TOKEN { token, platform, app_version, install_id, ts }
 *
 * 요약 가이드(추천):
 * - PUSH_EVENT → `event=<received|clicked> deeplink=<path> id=…abcd`
 * - PUSH_TOKEN → `token=…abcd platform=android|ios`
 *
 * 사용 맥락:
 * - RN WebView 앱에서 네이티브가 수신한 FCM/APNs 푸시 데이터를 웹에 postMessage로 전달하는 흐름 검증
 * - 서버 푸시 발송 없이도 브라우저 환경에서 App→Web 전달 규격(PUSH_EVENT)을 시뮬레이트
 * - 딥링크 이동, 토스트 노출 등 웹 처리 로직을 빠르게 확인할 수 있음
 *
 * 비고:
 * - 실제 푸시 발송은 서버에서 FCM/APNs API로 수행, 본 페이지는 전달/라우팅 검증 목적
 * - 토큰은 끝자리 일부만 로그에 표시해 가독성/보안 유지
 */


import React, { useState } from "react";
import PushModal from "../components/PushModal";
import LogBox from "../components/LogBox";
import useSectionLog from "../hooks/useSectionLog";

export default function PushPage() {
    const [open, setOpen] = useState(false);

    const { logs, clear } = useSectionLog(["PUSH_EVENT", "PUSH_TOKEN"], 200);

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
                수동으로 <b>디바이스 토큰</b>을 입력하고, <b>앱→웹 메시지(PUSH_EVENT)</b>를 시뮬레이트해
                딥링크/토스트/라우팅 흐름을 검증합니다.
            </div>



            <button
                onClick={() => setOpen(true)}
                style={{ padding: "10px 14px", borderRadius: 10, border: "1px solid #222", background: "#222", color: "#fff", cursor: "pointer" }}
            >
                푸시 테스트 열기
            </button>

            <PushModal isOpen={open} onClose={() => setOpen(false)} />
            
            <LogBox title="푸시 로그" logs={logs} onClear={clear} />
        </div>
    );
}
