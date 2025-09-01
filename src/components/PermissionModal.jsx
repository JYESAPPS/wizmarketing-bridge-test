/**
 * 파일명: components/PermissionModal.jsx
 * 설명: 권한 테스트 모달(UI). Web → App으로 권한 관련 명령을 보내고,
 *       App → Web의 PERMISSION_STATUS 응답을 섹션 내에서 바로 확인한다.
 *
 * 주요 기능:
 * - 명령/대상 콤보 선택 → 보낼 JSON(Preview) 표시 → [앱으로 전송] postMessage
 *   - command: CHECK_PERMISSION | REQUEST_PERMISSION
 *   - target : all | camera | push  (REQUEST_PERMISSION에는 all 제외)
 * - App 응답(PERMISSION_STATUS)을 카메라/푸시 각각 granted/blocked 뱃지로 시각화
 * - 응답 타임스탬프/체크 진행/에러 상태를 하단 상태 라벨로 표시
 *
 * 사용 맥락:
 * - RN WebView 기반 앱에서 권한 흐름을 검증할 때 사용
 *   1) CHECK_PERMISSION(all|camera|push): 현재 권한 스냅샷 요청
 *   2) REQUEST_PERMISSION(camera|push): 사용자 액션 직전 권한 팝업 트리거
 * - usePermissionPolling 훅과 함께 쓰면 폴링/포커스 재체크까지 커버 가능
 *
 * 연관 메시지 타입:
 * - Web → App: CHECK_PERMISSION { name }, REQUEST_PERMISSION { name }
 * - App → Web: PERMISSION_STATUS { camera:{granted,blocked}, push:{granted,blocked} }
 *
 * 비고:
 * - 모달 열림 애니메이션은 내부 상태(anim)로 제어하며 isOpen=false 시 즉시 언마운트
 * - Preview/전송 패턴은 다른 모달(Auth/Push/Subscription)과 UI 일관성 유지
 * - REQUEST_PERMISSION 선택 시 target이 all이 되지 않도록 가드(자동 보정)
 */


import React, { useEffect, useMemo, useState } from "react";
import { postToApp } from "../bridges/appBridge";

const drawer = {
    position: "fixed",
    top: 0,
    left: 0,
    height: "100%",
    width: 360,
    maxWidth: "92vw",
    background: "#fff",
    boxShadow: "8px 0 24px rgba(0,0,0,0.12)",
    overflowY: "auto",
    zIndex: 9999,
};
const header = { padding: "16px 20px 8px", borderBottom: "1px solid #eee", fontWeight: 700, fontSize: 18 };
const body = { padding: 20 };
const footer = { padding: 16, borderTop: "1px solid #eee", display: "flex", gap: 10, justifyContent: "flex-end" };
const input = { width: "100%", padding: "10px 12px", border: "1px solid #ddd", borderRadius: 10, outline: "none" };
const selectInput = { ...input, height: 40 };
const label = { fontSize: 13, color: "#444", marginBottom: 6, display: "block" };
const err = { color: "#c20", fontSize: 12, marginTop: 6 };
const btn = { padding: "10px 14px", borderRadius: 10, border: "1px solid #ddd", background: "#fff", cursor: "pointer" };
const primary = { ...btn, background: "#222", color: "#fff", borderColor: "#222" };

export default function PermissionModal({
    isOpen,
    onClose,
    status,          // { camera:{granted,blocked}, push:{granted,blocked} }
    checking,        // boolean
    error,           // string | null
    lastUpdatedAt,   // number | null
}) {
    const [anim, setAnim] = useState(false);

    // 👇 콤보박스 상태: 어떤 명령/대상으로 보낼지
    const [command, setCommand] = useState("CHECK_PERMISSION");       // "CHECK_PERMISSION" | "REQUEST_PERMISSION"
    const [target, setTarget] = useState("all");                    // "all" | "camera" | "push"

    // command에 따라 target 허용값 제한
    const targetOptions = useMemo(() => {
        return command === "CHECK_PERMISSION"
            ? [{ v: "all", t: "all" }, { v: "camera", t: "camera" }, { v: "push", t: "push" }]
            : [{ v: "camera", t: "camera" }, { v: "push", t: "push" }];  // REQUEST_PERMISSION에는 all 없음
    }, [command]);

    // command 바뀌면 target을 유효한 값으로 보정
    useEffect(() => {
        if (command === "REQUEST_PERMISSION" && target === "all") setTarget("camera");
    }, [command, target]);

    useEffect(() => {
        if (isOpen) { const t = setTimeout(() => setAnim(true), 10); return () => clearTimeout(t); }
        else setAnim(false);
    }, [isOpen]);
    if (!isOpen) return null;

    const panelStyle = { ...drawer, transform: anim ? "translateX(0)" : "translateX(-100%)", transition: "transform 260ms ease" };

    // 내가 보낼 메시지 미리보기
    const buildPreview = () => {
        if (command === "CHECK_PERMISSION") {
            return { type: "CHECK_PERMISSION", payload: { name: target } };
        }
        // REQUEST_PERMISSION
        return { type: "REQUEST_PERMISSION", payload: { name: target } };
    };

    const handleSend = () => {
        const msg = buildPreview();
        postToApp(msg);
    };

    const Badge = ({ ok, label }) => (
        <span style={{
            display: "inline-block", padding: "2px 8px", borderRadius: 999,
            background: ok === true ? "#e8f6ef" : ok === false ? "#fdeaea" : "#f5f5f5",
            color: ok === true ? "#0a7" : ok === false ? "#c20" : "#777",
            fontSize: 12, marginRight: 6
        }}>
            {label}: {ok === true ? "true" : ok === false ? "false" : "unknown"}
        </span>
    );

    const Box = ({ title, children }) => (
        <div style={{ border: "1px solid #eee", borderRadius: 12, padding: 12 }}>
            <div style={{ fontWeight: 700, marginBottom: 8 }}>{title}</div>
            <div style={{ fontSize: 13, color: "#333" }}>{children}</div>
        </div>
    );

    // PERMISSION_STATUS 미리보기 표시용: 아직 수신 전이면 안내 문구
    const hasResponse = !!lastUpdatedAt;

    return (
        <div style={panelStyle} onClick={(e) => e.stopPropagation()}>
            <div style={header}>권한 상태 / 요청 (콤보 선택 → 전송)</div>

            <div style={body}>
                {/* 설명 */}
                <section style={{ marginBottom: 16 }}>
                    <p style={{ margin: 0, color: "#333" }}>
                        위에서 보낼 명령을 선택하면 <b>미리보기 JSON</b>이 표시됩니다. 아래 <b>앱으로 전송</b> 버튼을 누르면 실제로 메시지가 전달되고,
                        앱의 응답(<code>PERMISSION_STATUS</code>)은 하단에 표시됩니다.
                    </p>
                </section>

                {/* 1) 콤보 박스: 보낼 명령 선택 */}
                <section style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 12 }}>
                    <div>
                        <label style={label}>명령(command)</label>
                        <select style={selectInput} value={command} onChange={(e) => setCommand(e.target.value)}>
                            <option value="CHECK_PERMISSION">CHECK_PERMISSION</option>
                            <option value="REQUEST_PERMISSION">REQUEST_PERMISSION</option>
                        </select>
                    </div>

                    <div>
                        <label style={label}>대상(target)</label>
                        <select style={selectInput} value={target} onChange={(e) => setTarget(e.target.value)}>
                            {targetOptions.map((o) => (
                                <option key={o.v} value={o.v}>{o.t}</option>
                            ))}
                        </select>
                    </div>
                </section>

                {/* 2) 내가 보낼 메시지 미리보기 */}
                <section style={{ marginBottom: 16 }}>
                    <div style={{ fontWeight: 600, marginBottom: 8 }}>보낼 메시지 (Preview)</div>
                    <pre style={{ background: "#0f172a", color: "#e5e7eb", padding: 12, borderRadius: 8, fontSize: 12, overflowX: "auto", margin: 0 }}>
                        {JSON.stringify(buildPreview(), null, 2)}
                    </pre>
                </section>

                {/* 3) 응답 상태 표시 (PERMISSION_STATUS) */}
                <section style={{ marginTop: 8 }}>
                    <div style={{ fontWeight: 600, marginBottom: 8 }}>PERMISSION_STATUS (응답)</div>
                    {!hasResponse ? (
                        <div style={{ fontSize: 13, color: "#777" }}>
                            아직 응답이 없어요. 콤보를 선택하고 <b>앱으로 전송</b>을 눌러보세요.
                        </div>
                    ) : (
                        <>
                            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 12 }}>
                                <Box title="Camera">
                                    <Badge ok={status.camera.granted} label="granted" />
                                    <Badge ok={status.camera.blocked} label="blocked" />
                                </Box>
                                <Box title="Push">
                                    <Badge ok={status.push.granted} label="granted" />
                                    <Badge ok={status.push.blocked} label="blocked" />
                                </Box>
                            </div>
                            <pre style={{ background: "#0f172a", color: "#e5e7eb", padding: 12, borderRadius: 8, fontSize: 12, overflowX: "auto", margin: 0 }}>
                                {JSON.stringify({ type: "PERMISSION_STATUS", payload: status }, null, 2)}
                            </pre>
                        </>
                    )}
                    <div style={{ marginTop: 8, fontSize: 12, color: checking ? "#555" : error ? "#c20" : "#777" }}>
                        {checking && "checking... "}
                        {error && `error: ${String(error)} `}
                        {lastUpdatedAt && `updated: ${new Date(lastUpdatedAt).toLocaleTimeString()}`}
                    </div>
                </section>
            </div>

            <div style={footer}>
                <button style={btn} onClick={onClose}>닫기</button>
                <button style={primary} onClick={handleSend}>앱으로 전송</button>
            </div>
        </div>
    );
}
