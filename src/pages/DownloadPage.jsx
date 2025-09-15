// pages/DownloadPage.jsx
import React, { useCallback } from "react";

const SAMPLE_URL = "https://picsum.photos/1200/800.jpg";
const FILE_NAME = "wiz-sample.jpg";

export default function DownloadPage() {
    const handleDownload = useCallback(() => {
        if (window.ReactNativeWebView?.postMessage) {
            window.ReactNativeWebView.postMessage(
                JSON.stringify({
                    type: "DOWNLOAD_IMAGE",
                    payload: { url: SAMPLE_URL, filename: FILE_NAME },
                })
            );
        } else {
            alert("⚠️ 이 기능은 RN 앱(WebView) 안에서만 동작합니다.");
        }
    }, []);

    return (
        <div style={{ padding: "16px" }}>
            <h2>이미지 다운로드 테스트</h2>
            <div style={{ borderRadius: 12, overflow: "hidden", marginBottom: 12, maxWidth: 360 }}>
                <img src={SAMPLE_URL} alt="샘플" style={{ width: "100%", display: "block" }} />
            </div>
            <button
                onClick={handleDownload}
                style={{
                    padding: "10px 14px",
                    borderRadius: 10,
                    border: "1px solid #222",
                    background: "#222",
                    color: "#fff",
                    fontWeight: 600,
                    cursor: "pointer",
                }}
            >
                샘플 이미지 저장
            </button>
            <p style={{ fontSize: 12, color: "#666", marginTop: 8 }}>
                RN 앱(WebView) 환경에서만 갤러리에 저장됩니다.
            </p>
        </div>
    );
}
