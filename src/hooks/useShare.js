// hooks/useShare.js
import { useCallback, useEffect, useMemo, useState } from "react";
import { addAppMessageListener, postToApp } from "../bridges/appBridge";

/**
 * 파일명: hooks/useShare.js
 * 설명: 공유(이미지+본문) 전송/결과 수신 훅.
 *       Web → App으로 START_SHARE를 보내고, App → Web의 SHARE_RESULT를 수신한다.
 *
 * 메시지:
 * - Web → App: START_SHARE { image, caption, platform }
 *   · image: string (URL 또는 앱이 해석 가능한 파일 경로)
 *   · platform: "instagram" | "facebook" | "system" (선택 확장)
 * - App → Web: SHARE_RESULT { success, platform, post_id?, error_code?, message? }
 */
export default function useShare() {
    const [isOpen, setIsOpen] = useState(false);
    const [result, setResult] = useState(null);
    const [form, setForm] = useState({
        image: "",
        caption: "",
        platform: "instagram", // instagram | facebook | system
    });
    const [errors, setErrors] = useState({});

    const open = useCallback(() => { setIsOpen(true); setResult(null); }, []);
    const close = useCallback(() => setIsOpen(false), []);

    const setField = useCallback((k, v) => {
        setForm(prev => ({ ...prev, [k]: v }));
    }, []);

    // 검증
    useEffect(() => {
        const e = {};
        if (!form.image?.trim()) e.image = "이미지 경로(또는 URL)를 입력하세요";
        if (!form.platform) e.platform = "플랫폼을 선택하세요";
        setErrors(e);
    }, [form]);

    // App → Web 결과 수신
    useEffect(() => {
        const unbind = addAppMessageListener((msg) => {
            if (!msg?.type) return;
            if (msg.type === "SHARE_RESULT") {
                setResult(msg.payload || msg);
            }
        });
        return () => unbind?.();
    }, []);

    const preview = useMemo(() => ({
        type: "START_SHARE",
        payload: {
            image: form.image?.trim(),
            caption: form.caption || "",
            platform: form.platform,
        },
    }), [form.image, form.caption, form.platform]);

    const start = useCallback(() => {
        if (Object.keys(errors).length > 0) return;
        postToApp(preview);
    }, [errors, preview]);

    return { isOpen, open, close, form, setField, errors, preview, start, result };
}
