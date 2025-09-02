/**
 * 파일명: components/LogBox.jsx
 * 설명: 공통 로그 출력 UI 컴포넌트.
 *       섹션별(useSectionLog) 또는 종합 로그(App.jsx)에서 발생한 이벤트 기록을
 *       리스트 형태로 보여주고, 필요 시 "지우기" 버튼으로 초기화할 수 있다.
 *
 * 주요 기능:
 * - title: 로그 박스 제목 (기본값 "Logs")
 * - logs: 문자열 배열을 받아 화면에 순서대로 출력
 * - onClear: "지우기" 버튼 클릭 시 호출되는 콜백
 * - 로그가 없을 경우 "아직 로그가 없어요." 안내 문구 표시
 *
 * 스타일:
 * - 높이: 화면 세로의 절반(50vh) 고정
 * - 넘치면 스크롤
 * - 배경색: 짙은 남색(#0f172a), 글씨: 밝은 회색(#e5e7eb) 콘솔 스타일
 */

import React from "react";

export default function LogBox({ title = "Logs", logs = [], onClear }) {
    return (
        <div style={{ marginTop: 12 }}>
            {/* 헤더 */}
            <div
                style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    marginBottom: 8,
                }}
            >
                <div style={{ fontWeight: 700 }}>{title}</div>
                {!!logs.length && (
                    <button
                        onClick={onClear}
                        style={{
                            padding: "6px 10px",
                            border: "1px solid #ddd",
                            borderRadius: 8,
                            background: "#fff",
                            cursor: "pointer",
                            fontSize: 12,
                        }}
                    >
                        지우기
                    </button>
                )}
            </div>

            {/* 로그 박스 */}
            <div
                style={{
                    border: "1px solid #eee",
                    borderRadius: 12,
                    padding: 10,
                    height: "50vh", // ✅ 항상 화면 절반 높이
                    overflowY: "auto",
                    background: "#0f172a",
                    color: "#e5e7eb",
                    fontSize: 12,
                    lineHeight: 1.4,
                }}
            >
                {logs.length ? (
                    logs.map((l, i) => (
                        <div key={i} style={{ whiteSpace: "pre-wrap" }}>
                            {l}
                        </div>
                    ))
                ) : (
                    <div style={{ color: "#9ca3af" }}>아직 로그가 없어요.</div>
                )}
            </div>
        </div>
    );
}
