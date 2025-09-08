/**
 * 파일명: pages/AuthPage.jsx
 * 설명: 로그인/로그아웃 테스트 페이지. 모달(AuthModal)에서 START_SIGNIN/START_SIGNOUT 전송을 다루고,
 *       이 페이지는 App → Web의 SIGNIN_RESULT/SIGNOUT_RESULT 이벤트를 LogBox로 수집/표시한다.
 *
 * LogBox 수신 타입(필터):
 * - SIGNIN_RESULT  { success, provider, user, error_code, message, expires_at?, ... }
 * - SIGNOUT_RESULT { success }
 *
 * 요약 가이드(추천):
 * - SIGNIN_RESULT:
 *     · 성공:  `ok provider=<kakao|google|apple|email> user=<id|nickname>`
 *     · 실패:  `fail code=<error_code>`
 * - SIGNOUT_RESULT:
 *     · `signout ok|fail`
 *
 * 사용 맥락:
 * - RN WebView 앱에서 네이티브 인증 SDK와 브리지 연동을 검증
 * - useAuth 훅이 세션 저장/만료/에러를 관리하고, 본 페이지는 설명/모달 트리거/로그만 담당
 *
 * 비고:
 * - 세션 상세(JSON)는 모달 내부에서 확인 가능
 * - 종합 로그는 App.jsx 하단에서 별도로 제공되며, 본 페이지는 로그인 관련 이벤트만 분리 표시
 */


import React, { useState } from "react";
import AuthModal from "../components/AuthModal";
import useAuth from "../hooks/useAuth";
import useSectionLog from "../hooks/useSectionLog";
import LogBox from "../components/LogBox";

export default function AuthPage() {

    const { logs, clear } = useSectionLog(
        ["SIGNIN_RESULT", "SIGNOUT_RESULT", "SEND_DEBUG"],
        200
    );

    const [open, setOpen] = useState(false);
    const { session, isAuthed, loading, error } = useAuth(); // 훅만 붙이면 모달 안에서 전송/수신 모두 작동

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
                type / provider를 콤보에서 선택 → 보낼 JSON 미리보기 → <b>앱으로 전송</b> 버튼으로 Web→App 메시지를 보냅니다.
                결과는 <code>SIGNIN_RESULT / SIGNOUT_RESULT</code>로 수신되어 세션이 갱신됩니다.
            </div>

            <button
                onClick={() => setOpen(true)}
                style={{ padding: "10px 14px", borderRadius: 10, border: "1px solid #222", background: "#222", color: "#fff", cursor: "pointer" }}
            >
                로그인 모달 열기
            </button>

            <AuthModal
                isOpen={open}
                onClose={() => setOpen(false)}
                session={session}
                isAuthed={isAuthed}
                loading={loading}
                error={error}
            />
            <LogBox title="로그인 로그" logs={logs} onClear={clear} />
        </div>
    );
}
