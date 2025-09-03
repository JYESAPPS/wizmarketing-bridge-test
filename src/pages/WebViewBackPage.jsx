// pages/WebViewBackPage.jsx (간소)
import React, { useState } from "react";
import WebViewBackModal from "../components/WebViewBackModal";

export default function WebViewBackPage() {
    const [open, setOpen] = useState(false);
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
            
            <button onClick={() => setOpen(true)} style={{ padding: "10px 14px", borderRadius: 10, border: "1px solid #222", background: "#222", color: "#fff" }}>
                테스트 설정 열기
            </button>
            <WebViewBackModal
                isOpen={open}
                onClose={() => setOpen(false)}
                onSubmit={() => {/* 실행 시작 로직 */ }}
                onAbort={() => setOpen(false)}
            />
        </div>
    );
}