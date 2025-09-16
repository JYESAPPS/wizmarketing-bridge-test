// components/ShareModal.jsx — FIX: hook order (useMemo before any return)

import React, { useEffect, useMemo, useState } from "react";

const drawer = { position: "fixed", top: 0, left: 0, height: "100%", width: 360, maxWidth: "92vw", background: "#fff", boxShadow: "8px 0 24px rgba(0,0,0,0.12)", overflowY: "auto", zIndex: 9999 };
const header = { padding: "16px 20px 8px", borderBottom: "1px solid #eee", fontWeight: 700, fontSize: 18 };
const body = { padding: 20 };
const footer = { padding: 16, borderTop: "1px solid #eee", display: "flex", gap: 10, justifyContent: "flex-end" };
const input = { width: "100%", padding: "10px 12px", border: "1px solid #ddd", borderRadius: 10, outline: "none" };
const selectInput = { ...input, height: 40 };
const label = { fontSize: 13, color: "#444", marginBottom: 6, display: "block" };
const help = { fontSize: 12, color: "#666", marginTop: 4 };
const err = { color: "#d00", fontSize: 12, marginTop: 6 };
const btn = { padding: "10px 14px", borderRadius: 10, border: "1px solid #ddd", background: "#fff", cursor: "pointer" };
const primary = { ...btn, background: "#222", color: "#fff", borderColor: "#222" };
const ghost = { ...btn, padding: "6px 10px", fontSize: 12 };

const SOCIAL_MAP_WEB2RN = {
    instagram: "INSTAGRAM",
    instagram_stories: "INSTAGRAM_STORIES",
    facebook: "FACEBOOK",
    twitter: "TWITTER",
    sms: "SMS",
    kakao: "KAKAO",
    band: "BAND",
    system: "SYSTEM",
};

const DEFAULTS = {
    image: "https://picsum.photos/1024/1024?random=12",
    caption: "오늘의 추천 콘텐츠 ✨\nAI가 생성한 문구로 손쉽게 홍보해보세요!",
    platform: "instagram",
    hashtags: ["#WizMarketing", "#AI홍보", "#소셜공유", "#오늘의추천"],
    link: "https://www.wizmarket.ai",
    couponEnabled: false,
};

export default function ShareModal({
    isOpen,
    onClose,
    form,
    setField,
    errors = {},
    onResult,
}) {
    // 1) 모든 훅은 최상단에서 호출
    const [anim, setAnim] = useState(false);
    const [result, setResult] = useState(null);

    useEffect(() => {
        if (!isOpen) return;
        const t = setTimeout(() => setAnim(true), 10);
        if (!form?.image) setField("image", DEFAULTS.image);
        if (!form?.caption) setField("caption", DEFAULTS.caption);
        if (!form?.platform) setField("platform", DEFAULTS.platform);
        return () => {
            clearTimeout(t);
            setAnim(false);
            setResult(null);
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isOpen]);

    useEffect(() => {
        function handleMessage(e) {
            try {
                const data = typeof e.data === "string" ? JSON.parse(e.data) : e.data;
                if (data?.type === "SHARE_RESULT") {
                    setResult(data);
                    onResult?.(data);
                }
            } catch { }
        }
        window.addEventListener("message", handleMessage);
        document.addEventListener("message", handleMessage);
        return () => {
            window.removeEventListener("message", handleMessage);
            document.removeEventListener("message", handleMessage);
        };
    }, [onResult]);

    const preview = useMemo(() => {
        const social = SOCIAL_MAP_WEB2RN[form.platform] || "SYSTEM";
        return {
            type: "share.toChannel",
            social,
            data: {
                imageUrl: (form.image || "").trim(),
                caption: form.caption || "",
                hashtags: DEFAULTS.hashtags,
                couponEnabled: DEFAULTS.couponEnabled,
                link: DEFAULTS.link,
            },
        };
    }, [form.image, form.caption, form.platform]);

    // 2) 훅 호출 이후에 early return
    if (!isOpen) return null;

    // 3) 렌더링 로직
    const panelStyle = {
        ...drawer,
        transform: anim ? "translateX(0)" : "translateX(-100%)",
        transition: "transform 260ms ease",
    };

    const handleStart = async () => {
        if (Object.keys(errors).length > 0) return;
        try {
            window.ReactNativeWebView?.postMessage(JSON.stringify(preview));
            if (!window.ReactNativeWebView) {
                console.log("[DEV] postMessage:", preview);
                alert("DEV 환경: 콘솔에 preview 출력됨.");
            }
        } catch (e) {
            console.error("postMessage failed:", e);
        }
    };

    const canSubmit = Object.keys(errors).length === 0;

    return (
        <div style={panelStyle} onClick={(e) => e.stopPropagation()}>
            <div style={header}>공유(인스타 등) 테스트</div>
            <div style={body}>
                {/* 입력 폼 */}
                <div style={{ marginBottom: 12 }}>
                    <label style={label}>image (URL or 앱 경로)</label>
                    <input
                        style={input}
                        value={form.image}
                        onChange={(e) => setField("image", e.target.value)}
                        placeholder="https://... 또는 앱 파일 경로"
                    />
                    <div style={help}>기본값: <code>{DEFAULTS.image}</code></div>
                    {errors.image && <div style={err}>{errors.image}</div>}
                </div>

                <div style={{ marginBottom: 12 }}>
                    <label style={label}>caption (본문)</label>
                    <textarea
                        rows={5}
                        style={{ ...input, fontFamily: "monospace" }}
                        value={form.caption}
                        onChange={(e) => setField("caption", e.target.value)}
                        placeholder="본문(선택)"
                    />
                    <div style={help}>
                        기본값 예시:
                        <pre style={{ margin: "6px 0 0", whiteSpace: "pre-wrap", fontSize: 12, color: "#555" }}>
                            {DEFAULTS.caption}
                        </pre>
                    </div>
                </div>

                <div style={{ marginBottom: 8, display: "flex", gap: 8 }}>
                    <button
                        type="button"
                        style={ghost}
                        onClick={() => {
                            setField("image", DEFAULTS.image);
                            setField("caption", DEFAULTS.caption);
                            setField("platform", DEFAULTS.platform);
                        }}
                    >
                        기본값 넣기
                    </button>
                    <button
                        type="button"
                        style={ghost}
                        onClick={() => {
                            setField("image", "");
                            setField("caption", "");
                        }}
                    >
                        지우기
                    </button>
                </div>

                <div style={{ marginBottom: 12 }}>
                    <label style={label}>platform</label>
                    <select
                        style={selectInput}
                        value={form.platform}
                        onChange={(e) => setField("platform", e.target.value)}
                    >
                        <option value="instagram">instagram (feed)</option>
                        <option value="instagram_stories">instagram_stories</option>
                        <option value="facebook">facebook</option>
                        <option value="twitter">twitter (X)</option>
                        <option value="x">x (alias)</option>
                        <option value="band">band</option>
                        <option value="sms">sms</option>
                        <option value="kakao">kakao</option>
                        <option value="system">system (OS 공유 시트)</option>
                    </select>
                    {errors.platform && <div style={err}>{errors.platform}</div>}
                    <div style={help}>
                        ※ 함께 전송: {DEFAULTS.hashtags.join(" ")} {DEFAULTS.link ? `· ${DEFAULTS.link}` : ""}
                    </div>
                </div>

                {/* 미리보기 */}
                <section style={{ marginTop: 16 }}>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
                        <div style={{ fontWeight: 600 }}>START_SHARE 미리보기</div>
                        <button
                            onClick={async () => {
                                try { await navigator.clipboard.writeText(JSON.stringify(preview, null, 2)); } catch { }
                            }}
                            style={{ fontSize: 12, padding: "6px 10px", borderRadius: 8, border: "1px solid #ddd", background: "#fff", cursor: "pointer" }}
                        >
                            복사
                        </button>
                    </div>
                    <pre style={{ background: "#0f172a", color: "#e5e7eb", padding: 12, borderRadius: 8, fontSize: 12, overflowX: "auto", margin: 0 }}>
                        {JSON.stringify(preview, null, 2)}
                    </pre>
                </section>

                {/* 결과 표시 */}
                {result && (
                    <section style={{ marginTop: 16 }}>
                        <div style={{ fontWeight: 600, marginBottom: 8 }}>SHARE_RESULT 수신</div>
                        <pre style={{ background: "#111827", color: "#e5e7eb", padding: 12, borderRadius: 8, fontSize: 12, overflowX: "auto", margin: 0 }}>
                            {JSON.stringify(result, null, 2)}
                        </pre>
                    </section>
                )}
            </div>

            <div style={footer}>
                <button style={btn} onClick={onClose}>닫기</button>
                <button
                    style={primary}
                    onClick={handleStart}
                    disabled={!canSubmit}
                    title={!canSubmit ? "입력을 확인하세요" : ""}
                >
                    공유 시작
                </button>
            </div>
        </div>
    );
}
