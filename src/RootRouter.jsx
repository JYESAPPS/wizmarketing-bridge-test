// src/RootRouter.jsx
import { BrowserRouter, Routes, Route } from "react-router-dom";
import App from "./App";
import NaverBlogBridge from "./pages/NaverBlogBridge";


export default function RootRouter() {
    return (
        <BrowserRouter>
            <Routes>
                {/* 기존 테스트/도구 화면은 홈으로 둡니다 */}
                <Route path="/" element={<App />} />

                {/* ✅ 네이버 로그인/글쓰기 전용 콜백 라우트 */}
                <Route path="/auth/naver/cb2/*" element={<NaverBlogBridge />} />

                {/* 옵션: 404 */}
                <Route path="*" element={<div style={{ padding: 24 }}>404 Not Found</div>} />
            </Routes>
        </BrowserRouter>
    );
}
