// pages/DownloadPage.jsx
import React, { useCallback } from "react";

const SAMPLE_URL = "https://picsum.photos/1200/800.jpg";
const FILE_NAME = "wiz-sample.jpg";

// 샘플 dataURL (작은 PNG, base64)
const SAMPLE_DATAURL =
    "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAUA" +
    "AAAFCAYAAACNbyblAAAAHElEQVQI12P4" +
    "//8/w38GIAXDIBKE0DHxgljNBAAO9TXL0Y4OHwAAAABJRU5ErkJggg==";

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

    const handleDownloadDataUrl = useCallback(() => {
        if (window.ReactNativeWebView?.postMessage) {
            window.ReactNativeWebView.postMessage(
                JSON.stringify({
                    type: "DOWNLOAD_IMAGE",
                    payload: { dataUrl: SAMPLE_DATAURL, filename: "wiz-sample-dataurl.png" },
                })
            );
        } else {
            alert("⚠️ 이 기능은 RN 앱(WebView) 안에서만 동작합니다.");
        }
    }, []);

    return (
        <div style={{ padding: "16px" }}>
            <h2>이미지 다운로드 테스트</h2>

            <div
                style={{
                    borderRadius: 12,
                    overflow: "hidden",
                    marginBottom: 12,
                    maxWidth: 360,
                }}
            >
                <img
                    src={SAMPLE_URL}
                    alt="샘플"
                    style={{ width: "100%", display: "block" }}
                />
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
                    marginRight: 8,
                }}
            >
                샘플 이미지 저장 (URL)
            </button>

            <button
                onClick={handleDownloadDataUrl}
                style={{
                    padding: "10px 14px",
                    borderRadius: 10,
                    border: "1px solid #2b6fff",
                    background: "#2b6fff",
                    color: "#fff",
                    fontWeight: 600,
                    cursor: "pointer",
                }}
            >
                샘플 이미지 저장 (dataURL)
            </button>

            <p style={{ fontSize: 12, color: "#666", marginTop: 8 }}>
                RN 앱(WebView) 환경에서만 갤러리에 저장됩니다.
            </p>
        </div>
    );
}
