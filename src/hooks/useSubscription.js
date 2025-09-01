/**
 * 파일명: hooks/useSubscription.js
 * 설명: 구독/결제 테스트 훅.
 *       입력 폼 상태/검증을 관리하고, Web → App으로 START_SUBSCRIPTION을 전송하며,
 *       App → Web의 SUBSCRIPTION_RESULT를 수신해 결과를 노출한다.
 *
 * 주요 기능:
 * - 모달 열림/닫힘 상태 관리: { isOpen, open(), close() }
 * - 폼 상태/검증: product_id, product_type(subscription|consumable), display_name, price, currency, metadata(JSON)
 * - buildStartPayload(): 현재 입력값으로 FCM payload 구성
 * - start(): errors 없을 때 { type:"START_SUBSCRIPTION", payload }를 postToApp
 * - 결과 수신: SUBSCRIPTION_RESULT(payload)를 받아 result 상태에 저장
 *
 * 사용 맥락:
 * - RN WebView 기반 앱에서 네이티브 인앱결제 실행 후 결과를 웹으로 통지하는 흐름 검증
 * - SubscriptionModal과 함께 사용하여 입력/미리보기/전송/결과 확인을 일관되게 제공
 *
 * 연관 메시지 타입:
 * - Web → App: START_SUBSCRIPTION { product_id, product_type, display_name, price, currency, metadata? }
 * - App → Web: SUBSCRIPTION_RESULT
 *   · 성공: { success:true, product_id, transaction_id, expires_at? }
 *   · 실패: { success:false, product_id, error_code, message }
 *
 * 비고:
 * - product_type은 현재 subscription(구독형)/consumable(소모성)만 사용 (non_consumable은 제외)
 * - metadata는 JSON 문자열로 입력받아 전송 직전 파싱(실패 시 errors.metadata로 노출)
 * - start()는 errors가 없을 때만 동작하도록 가드
 */


import { useCallback, useEffect, useRef, useState } from "react";
import { addAppMessageListener, postToApp } from "../bridges/appBridge";

export default function useSubscription() {
    const [isOpen, setIsOpen] = useState(false);
    const [form, setForm] = useState({
    product_id: "sub_3m",
    product_type: "subscription", // subscription | consumable | non_consumable
    display_name: "3개월 구독",
    price: 19900,
    currency: "KRW",
    metadata: "", // JSON string (선택)
    });
    const [errors, setErrors] = useState({});
    const [result, setResult] = useState(null);
    const unbindRef = useRef(null);

    const open = useCallback(() => { setIsOpen(true); setResult(null); }, []);
    const close = useCallback(() => setIsOpen(false), []);
    const setField = useCallback((k, v) => setForm((p) => ({ ...p, [k]: v })), []);

  // 검증
    useEffect(() => {
    const e = {};
    if (!form.product_id?.trim()) e.product_id = "product_id를 입력하세요";
    if (!form.product_type) e.product_type = "상품 타입을 선택하세요";
    if (!form.display_name?.trim()) e.display_name = "표시 이름을 입력하세요";
    if (!Number(form.price) || Number(form.price) < 0) e.price = "가격을 올바르게 입력";
    if (!form.currency?.trim()) e.currency = "통화를 입력하세요 (예: KRW)";

    if (form.metadata) {
        try { JSON.parse(form.metadata); } catch { e.metadata = "metadata는 유효한 JSON이어야 합니다"; }
    }
    setErrors(e);
    }, [form]);

  // 결과 수신
    useEffect(() => {
    const unbind = addAppMessageListener((msg) => {
        if (!msg?.type) return;
        if (msg.type === "SUBSCRIPTION_RESULT") {
        setResult(msg.payload || msg);
        }
    });
    unbindRef.current = unbind;
    return () => unbind?.();
    }, []);

    const buildStartPayload = () => {
    const base = {
        product_id: form.product_id.trim(),
        product_type: form.product_type,
        display_name: form.display_name.trim(),
        price: Number(form.price),
        currency: form.currency.trim(),
    };
    if (form.metadata) {
        try { base.metadata = JSON.parse(form.metadata); } catch {}
    }
    return base;
    };


    const start = useCallback(() => {
    if (Object.keys(errors).length > 0) return;
    const payload = buildStartPayload();
    postToApp({ type: "START_SUBSCRIPTION", payload });
    }, [errors, buildStartPayload]);


  return { isOpen, open, close, form, setField, errors, start, buildStartPayload, result };
}
