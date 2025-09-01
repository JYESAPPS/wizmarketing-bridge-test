/**
 * 파일명: components/CollapseSection.jsx
 * 설명: 공통 섹션 접기/펼치기 UI 컴포넌트.
 *       각 테스트 섹션(WebViewBack, Push, Auth 등)을 접었다 펼칠 수 있도록 감싼다.
 *
 * 주요 기능:
 * - 섹션 헤더 클릭 시 open 상태 토글 (접기/펼치기)
 * - 높이(max-height) 애니메이션을 이용해 부드러운 전환 효과
 * - 섹션 열림/닫힘 상태를 localStorage에 저장하여 새로고침 후에도 상태 유지
 * - 제목 우측에 `right` prop으로 추가 컨트롤/배지 배치 가능
 *
 * 사용 맥락:
 * - App.jsx에서 각 테스트 페이지를 감쌀 때 사용
 * - 모바일에서 긴 페이지를 효율적으로 다룰 수 있게 각 섹션을 개별적으로 열고 닫을 수 있음
 *
 * 연관 메시지 타입:
 * - 직접 메시지를 다루지 않음 (Pure UI 컴포넌트)
 *
 * 비고:
 * - id를 반드시 고유하게 부여해야 localStorage 키가 충돌하지 않음
 * - 애니메이션 지속시간은 260ms로 고정 (필요 시 수정 가능)
 */

import React, { useEffect, useRef, useState } from "react";

export default function CollapseSection({
    id,                 // 고유키 (예: "sec-back", "sec-push")
    title,              // 섹션 제목
    defaultOpen = true, // 기본 열림 여부
    children,
    right = null,       // 제목 우측 컨트롤(옵션)
}) {
    const LS_KEY = `collapse.${id}.open`;
    const [open, setOpen] = useState(() => {
        try {
            const saved = localStorage.getItem(LS_KEY);
            return saved === null ? defaultOpen : saved === "1";
        } catch { return defaultOpen; }
    });

    const wrapRef = useRef(null);
    const [maxH, setMaxH] = useState(open ? "auto" : 0);
    const [anim, setAnim] = useState(false);

    // 높이 애니메이션
    useEffect(() => {
        const el = wrapRef.current;
        if (!el) return;

        if (open) {
            const h = el.scrollHeight;
            setMaxH(h);
            requestAnimationFrame(() => {
                setAnim(true);
                setMaxH(h);
                const t = setTimeout(() => { setMaxH("auto"); setAnim(false); }, 260);
                return () => clearTimeout(t);
            });
        } else {
            const h = el.scrollHeight;
            setMaxH(h);
            requestAnimationFrame(() => {
                setAnim(true);
                setMaxH(0);
                const t = setTimeout(() => { setAnim(false); }, 260);
                return () => clearTimeout(t);
            });
        }
    }, [open]);

    // 상태 저장
    useEffect(() => {
        try { localStorage.setItem(LS_KEY, open ? "1" : "0"); } catch { }
    }, [open]);

    const headerStyle = {
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 8,
        cursor: "pointer",
        padding: "12px 14px",
        border: "1px solid #eee",
        borderRadius: 12,
        background: "#fff",
    };
    const caretStyle = {
        display: "inline-block",
        width: 10, height: 10, marginLeft: 8,
        borderRight: "2px solid #111",
        borderBottom: "2px solid #111",
        transform: open ? "rotate(45deg)" : "rotate(-45deg)",
        transition: "transform 180ms ease",
    };
    const containerStyle = {
        overflow: "hidden",
        maxHeight: maxH,
        transition: anim ? "max-height 260ms ease" : "none",
    };

    return (
        <section>
            <div
                style={headerStyle}
                onClick={() => setOpen(v => !v)}
                role="button"
                aria-expanded={open}
            >
                <div style={{ fontWeight: 800 }}>
                    {title}
                    <span style={caretStyle} />
                </div>
                {right}
            </div>

            <div ref={wrapRef} style={containerStyle}>
                <div style={{ padding: "12px 4px" }}>
                    {children}
                </div>
            </div>
        </section>
    );
}
