/**
 * 파일명: components/PermissionModal.jsx
 * 설명: 권한 테스트 모달(UI) — supportedTargets로 표시/전송 대상을 제어.
 * 기본: push-only. 필요하면 <PermissionModal supportedTargets={['camera','push']} /> 로 확장.
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
const btn = { padding: "10px 14px", borderRadius: 10, border: "1px solid #ddd", background: "#fff", cursor: "pointer" };
const primary = { ...btn, background: "#222", color: "#fff", borderColor: "#222" };

export default function PermissionModal({
    isOpen,
    onClose,
    status = { push: { granted: null, blocked: null } }, // camera는 없을 수 있음
    checking,        // boolean
    error,           // string | null
    lastUpdatedAt,   // number | null
    supportedTargets = ["push"], // ["push"] or ["camera","push"]
}) {
    const [anim, setAnim] = useState(false);

    const HAS_CAMERA = supportedTargets.includes("camera");
    const HAS_PUSH = supportedTargets.includes("push");

    // 명령/대상 상태
    const [command, setCommand] = useState("CHECK_PERMISSION"); // CHECK_PERMISSION | REQUEST_PERMISSION

    // target 초기값: push 우선, 없으면 camera
    const initialTarget = HAS_PUSH ? "push" : (HAS_CAMERA ? "camera" : "push");
    const [target, setTarget] = useState(initialTarget);

    // target 옵션 생성
    const allOption = { v: "all", t: "all" };
    const baseTargets = [
        ...(HAS_CAMERA ? [{ v: "camera", t: "camera" }] : []),
        ...(HAS_PUSH ? [{ v: "push", t: "push" }] : []),
    ];

    const targetOptions = useMemo(() => {
        if (command === "CHECK_PERMISSION") {
            return baseTargets.length > 1 ? [allOption, ...baseTargets] : baseTargets;
        }
        // REQUEST_PERMISSION에는 all 제외
        return baseTargets;
    }, [command, HAS_CAMERA, HAS_PUSH]); // baseTargets는 HAS_*에 종속

    // command 변경 시 target 보정
    useEffect(() => {
        // REQUEST_PERMISSION인데 all이면 첫 유효 타겟으로 변경
        if (command === "REQUEST_PERMISSION" && target === "all") {
            setTarget(baseTargets[0]?.v || initialTarget);
        }
    }, [command, target]);

    useEffect(() => {
        if (isOpen) {
            const t = setTimeout(() => setAnim(true), 10);
            return () => clearTimeout(t);
        }
        setAnim(false);
    }, [isOpen]);

    if (!isOpen) return null;

    // 전송 미리보기
    const buildPreview = () => {
        const payload = { name: target };
        return command === "CHECK_PERMISSION"
            ? { type: "CHECK_PERMISSION", payload }
            : { type: "REQUEST_PERMISSION", payload };
    };

    const handleSend = () => {
        postToApp(buildPreview());
    };

    const panelStyle = {
        ...drawer,
        transform: anim ? "translateX(0)" : "translateX(-100%)",
        transition: "transform 260ms ease",
    };

    const Badge = ({ ok, label }) => (
        <span
            style={{
                display: "inline-block",
                padding: "2px 8px",
                borderRadius: 999,
                background: ok === true ? "#e8f6ef" : ok === false ? "#fdeaea" : "#f5f5f5",
                color: ok === true ? "#0a7" : ok === false ? "#c20" : "#777",
                fontSize: 12,
                marginRight: 6,
            }}
        >
            {label}: {ok === true ? "true" : ok === false ? "false" : "unknown"}
        </span>
    );

    const Box = ({ title, children }) => (
        <div style={{ border: "1px solid #eee", borderRadius: 12, padding: 12 }}>
            <div style={{ fontWeight: 700, marginBottom: 8 }}>{title}</div>
            <div style={{ fontSize: 13, color: "#333" }}>{children}</div>
        </div>
    );

    const hasResponse = !!lastUpdatedAt;

    return (
        <div style={panelStyle} onClick={(e) => e.stopPropagation()}>
            <div style={header}>권한 상태 / 요청</div>

            <div style={body}>
                {/* 설명 */}
                <section style={{ marginBottom: 16 }}>
                    <p style={{ margin: 0, color: "#333" }}>
                        명령과 대상을 선택하면 <b>미리보기 JSON</b>이 표시됩니다. <b>앱으로 전송</b>을 누르면
                        실제로 메시지가 전달되고, 앱의 응답(<code>PERMISSION_STATUS</code>)이 아래에 표시됩니다.
                    </p>
                </section>

                {/* 1) 콤보 */}
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
                                <option key={o.v} value={o.v}>
                                    {o.t}
                                </option>
                            ))}
                        </select>
                    </div>
                </section>

                {/* 2) 전송 미리보기 */}
                <section style={{ marginBottom: 16 }}>
                    <div style={{ fontWeight: 600, marginBottom: 8 }}>보낼 메시지 (Preview)</div>
                    <pre
                        style={{
                            background: "#0f172a",
                            color: "#e5e7eb",
                            padding: 12,
                            borderRadius: 8,
                            fontSize: 12,
                            overflowX: "auto",
                            margin: 0,
                        }}
                    >
                        {JSON.stringify(buildPreview(), null, 2)}
                    </pre>
                </section>

                {/* 3) 응답 표시 */}
                <section style={{ marginTop: 8 }}>
                    <div style={{ fontWeight: 600, marginBottom: 8 }}>PERMISSION_STATUS (응답)</div>

                    {!hasResponse ? (
                        <div style={{ fontSize: 13, color: "#777" }}>
                            아직 응답이 없어요. 콤보 선택 후 <b>앱으로 전송</b>을 눌러보세요.
                        </div>
                    ) : (
                        <>
                            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 12 }}>
                                {HAS_CAMERA && status?.camera && (
                                    <Box title="Camera">
                                        <Badge ok={status.camera.granted} label="granted" />
                                        <Badge ok={status.camera.blocked} label="blocked" />
                                    </Box>
                                )}
                                {HAS_PUSH && status?.push && (
                                    <Box title="Push">
                                        <Badge ok={status.push.granted} label="granted" />
                                        <Badge ok={status.push.blocked} label="blocked" />
                                    </Box>
                                )}
                            </div>

                            <pre
                                style={{
                                    background: "#0f172a",
                                    color: "#e5e7eb",
                                    padding: 12,
                                    borderRadius: 8,
                                    fontSize: 12,
                                    overflowX: "auto",
                                    margin: 0,
                                }}
                            >
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
                <button style={btn} onClick={onClose}>
                    닫기
                </button>
                <button style={primary} onClick={handleSend}>
                    앱으로 전송
                </button>
            </div>
        </div>
    );
}
