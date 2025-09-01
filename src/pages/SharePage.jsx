// pages/SharePage.jsx

/**
 * 파일명: pages/SharePage.jsx
 * 설명: 공유(이미지+본문) 테스트 페이지.
 *       모달(ShareModal)에서 START_SHARE 전송을 처리하고,
 *       App → Web의 SHARE_RESULT 이벤트를 LogBox로 수집/표시한다.
 *
 * LogBox 수신 타입(필터):
 * - SHARE_RESULT { success, platform, post_id?, error_code?, message? }
 *
 * 요약 가이드(추천):
 * - 성공: `ok platform=<instagram|facebook|system> post=…abcd`
 * - 실패: `fail code=<error_code>`
 */

import React from "react";
import ShareModal from "../components/ShareModal";
import useShare from "../hooks/useShare";
import useSectionLog from "../hooks/useSectionLog";
import LogBox from "../components/LogBox";

export default function SharePage() {
    // 섹션 전용 로그 (공유 결과만 필터)
    const { logs, clear } = useSectionLog(["SHARE_RESULT"], 200);

    // 공유 훅 (모달 열기/닫기, 폼/검증, 미리보기, 전송, 결과)
    const { isOpen, open, close, form, setField, errors, preview, start, result } = useShare();

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
                <b>왜 필요한가?</b>
                <br />
                이미지 경로와 본문을 입력해 <b>START_SHARE</b>를 앱에 전송합니다. 앱은 인스타그램 등 네이티브 공유 흐름을
                수행한 뒤 <b>SHARE_RESULT</b>를 웹으로 전달합니다.
                <br />
                단, 실제로 공유 기능이 어느 수준까지 동작할지는
                플랫폼/앱 권한/버전에 따라 달라질 수 있으며,
                지속적으로 테스트하고 보완해야 합니다.
            </div>

            <button
                onClick={open}
                style={{
                    padding: "10px 14px",
                    borderRadius: 10,
                    border: "1px solid #222",
                    background: "#222",
                    color: "#fff",
                    cursor: "pointer",
                }}
            >
                공유 모달 열기
            </button>

            <ShareModal
                isOpen={isOpen}
                onClose={close}
                form={form}
                setField={setField}
                errors={errors}
                preview={preview}
                onStart={start}
                result={result}
            />

            <LogBox title="공유 로그" logs={logs} onClear={clear} />
        </div>
    );
}
