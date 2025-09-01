/**
 * 파일명: pages/PermissionPage.jsx
 * 설명: 권한 상태 점검/요청 테스트 페이지. 
 *       모달(PermissionModal)에서 CHECK_PERMISSION/REQUEST_PERMISSION 메시지를 전송하고,
 *       App → Web의 PERMISSION_STATUS 이벤트를 LogBox에 수집/표시한다.
 *
 * LogBox 수신 타입(필터):
 * - PERMISSION_STATUS { camera:{ granted, blocked }, push:{ granted, blocked } }
 *
 * 요약 가이드(추천):
 * - camera → `cam g=<true|false|unknown> b=<true|false|unknown>`
 * - push   → `push g=<…> b=<…>`
 *   예) `cam g=true b=false | push g=false b=false`
 *
 * 사용 맥락:
 * - RN WebView 앱에서 웹이 권한 상태를 주도적으로 질의/표시하는 흐름 검증
 * - usePermissionPolling 훅이 최초 체크/주기 폴링/포커스 재체크/백오프를 담당
 * - 사용자가 모달 버튼으로 권한 팝업(REQUEST_PERMISSION)을 트리거할 수 있음
 *
 * 비고:
 * - 주기 폴링 간격(intervalMs), 타임아웃(timeoutMs), 백오프 플랜(backoffPlan) 등은 훅 옵션으로 조정 가능
 * - 상세 payload는 모달/훅 내부에서 확인 가능, 페이지는 요약된 로그와 설명 역할에 집중
 */


import React, { useState } from "react";
import usePermissionPolling from "../hooks/usePermissionPolling";
import PermissionModal from "../components/PermissionModal";
import useSectionLog from "../hooks/useSectionLog";
import LogBox from "../components/LogBox";

export default function PermissionPage() {

    const { logs, clear } = useSectionLog(["PERMISSION_STATUS"], 200);

    const [open, setOpen] = useState(false);
    const {
        status, checking, error, lastUpdatedAt,
        requestCheck, requestPermission
    } = usePermissionPolling({
        initialName: "all",
        intervalMs: 10 * 60 * 1000,   // 10분
        timeoutMs: 3000,
        backoffPlan: [5000, 15000, 60000],
        attachFocusAndVisibility: true,
    });

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
                웹 주도로 CHECK_PERMISSION / REQUEST_PERMISSION을 사용합니다. 주기 폴링과 포커스 시 재체크 포함.
            </div>

            <button
                onClick={() => setOpen(true)}
                style={{ padding: "10px 14px", borderRadius: 10, border: "1px solid #222", background: "#222", color: "#fff", cursor: "pointer" }}
            >
                권한 설정 열기
            </button>

            <PermissionModal
                isOpen={open}
                onClose={() => setOpen(false)}
                status={status}
                checking={checking}
                error={error}
                lastUpdatedAt={lastUpdatedAt}
                onCheckAll={() => requestCheck("all")}
                onRequestCamera={() => requestPermission("camera")}
                onRequestPush={() => requestPermission("push")}
            />
            <LogBox title="권한 로그" logs={logs} onClear={clear} />
        </div>
    );
}
