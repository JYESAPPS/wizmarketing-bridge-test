
/**
 * 파일명: pages/SubscriptionPage.jsx
 * 설명: 구독/결제 테스트 페이지.
 *       모달(SubscriptionModal)에서 상품 정보를 입력/미리보기/전송하고,
 *       App → Web의 SUBSCRIPTION_RESULT/RESTORE_RESULT 이벤트를 LogBox로 수집/표시한다.
 *
 * LogBox 수신 타입(필터):
 * - SUBSCRIPTION_RESULT { success, product_id, transaction_id, expires_at?, error_code?, message? }
 * - RESTORE_RESULT      { active, product_id, transaction_id, expires_at? }
 *
 * 요약 가이드(추천):
 * - SUBSCRIPTION_RESULT:
 *     · 성공: `ok product=<id> tx=…abcd`
 *     · 실패: `fail code=<error_code>`
 * - RESTORE_RESULT:
 *     · `active=<true|false> product=<id>`
 *
 * 사용 맥락:
 * - RN WebView 앱에서 네이티브 인앱결제를 실행 후 결과를 웹으로 postMessage로 통지하는 흐름 검증
 * - SubscriptionModal + useSubscription 훅과 조합해 상태/검증/전송/결과까지 일관된 테스트 제공
 *
 * 비고:
 * - product_type은 subscription(구독형)/consumable(소모성)만 사용
 * - 실제 결제/검증은 스토어/네이티브 SDK에서 수행, 본 페이지는 입력/전송/결과 로그 표시 역할에 집중
 */


import React from "react";
import SubscriptionModal from "../components/SubscriptionModal";
import useSubscription from "../hooks/useSubscription";
import useSectionLog from "../hooks/useSectionLog";
import LogBox from "../components/LogBox";

export default function SubscriptionPage() {
    const { isOpen, open, close, form, setField, errors, start, buildStartPayload, result } = useSubscription();
    
    const { logs, clear } = useSectionLog(["SUBSCRIPTION_RESULT", "RESTORE_RESULT"], 200);

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
        웹에서 상품 정보를 구성해 <b>START_SUBSCRIPTION</b>을 앱으로 전송하고, 앱이 반환하는 <b>SUBSCRIPTION_RESULT</b>를 확인합니다.
    </div>

          
      <button onClick={open} style={{ padding: "10px 14px", borderRadius: 10, border: "1px solid #222", background: "#222", color: "#fff", cursor: "pointer" }}>결제 설정 열기</button>

      <SubscriptionModal
        isOpen={isOpen}
        onClose={close}
        form={form}
        setField={setField}
        errors={errors}
        onStart={start}
        buildStartPayload={buildStartPayload}
        result={result}
          />
     <LogBox title="결제 로그" logs={logs} onClear={clear} />
    </div>
  );
}

