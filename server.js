import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { createProxyMiddleware } from 'http-proxy-middleware';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const port = 5173;

// 서브 경로 및 정적 파일 경로 정의
const BASE_PATH = '/';
const STATIC_DIR = path.join(__dirname, 'dist');

// =========================================================
// 1. API 프록시 설정 (Nginx 역할 대체)
// =========================================================
const BACKEND_TARGET = 'http://localhost:8080';

// /api 경로로 들어오는 모든 요청을 백엔드로 포워딩
app.use('/api', createProxyMiddleware({
    target: BACKEND_TARGET,
    changeOrigin: true,
    logLevel: 'info'
}));


// =========================================================
// 2. 정적 파일 서빙 및 History Mode Fallback 설정
// =========================================================
app.use(BASE_PATH, express.static(STATIC_DIR));

app.get(BASE_PATH, (req, res) => {
    res.sendFile(path.join(STATIC_DIR, 'index.html'));
});

app.get(`${BASE_PATH}/*`, (req, res) => {
    res.sendFile(path.join(STATIC_DIR, 'index.html'));
});


// =========================================================
// 3. 루트 경로 처리
// =========================================================
app.get('/', (req, res) => {
    res.redirect(BASE_PATH);
});


// =========================================================
// 4. 서버 리스닝
// =========================================================
app.listen(port, () => {
    console.log(`[PM2/Express] Frontend server listening on http://localhost:${port}`);
    console.log(`[PM2/Express] API Proxying to: ${BACKEND_TARGET}`);
});