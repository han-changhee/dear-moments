const express = require('express');
const path = require('path');
const { createProxyMiddleware } = require('http-proxy-middleware');

const app = express();
// Docker compose의 ports 설정과 맞추기 위해 80번 포트를 사용합니다.
const port = 80;

// 서브 경로 및 정적 파일 경로 정의
const BASE_PATH = '/';
const STATIC_DIR = path.join(__dirname, 'dist');

// =========================================================
// 1. API 프록시 설정 (Nginx 역할 대체)
// =========================================================
// 백엔드 서비스의 URL (docker-compose.yml의 서비스 이름: 'backend')
// 이 주소는 Docker 내부 네트워크에서 백엔드 컨테이너를 가리킵니다.
const BACKEND_TARGET = 'http://backend:8080';

// /api 경로로 들어오는 모든 요청을 백엔드로 포워딩
app.use('/api', createProxyMiddleware({
    target: BACKEND_TARGET,
    changeOrigin: true, // 호스트 헤더 변경
    logLevel: 'info'
}));


// =========================================================
// 2. 정적 파일 서빙 및 History Mode Fallback 설정
// =========================================================
// 정적 파일 서빙: /dear-moments/assets/... 와 같은 요청을 처리
// BASE_PATH에 대한 요청을 dist 폴더에 매핑
app.use(BASE_PATH, express.static(STATIC_DIR));

// History Mode Fallback 처리:
// 1. /dear-moments/ 경로로 접근 시 index.html을 반환 (Nginx의 try_files 역할)
app.get(BASE_PATH, (req, res) => {
    res.sendFile(path.join(STATIC_DIR, 'index.html'));
});

// 2. Vue Router에서 정의된 경로로 직접 접근 시 (예: /dear-moments/flight 등)
// 정적 파일로 찾지 못한 모든 요청을 index.html로 폴백
app.get(`${BASE_PATH}/*`, (req, res) => {
    // 요청된 경로에 매칭되는 정적 파일이 없을 경우, index.html을 반환
    res.sendFile(path.join(STATIC_DIR, 'index.html'));
});


// =========================================================
// 3. 루트 경로 처리 (Nginx의 302 리디렉션 역할 대체)
// =========================================================
// 루트 경로 접근 시, /dear-moments/로 리다이렉트
app.get('/', (req, res) => {
    res.redirect(BASE_PATH);
});


// =========================================================
// 4. 서버 리스닝
// =========================================================
app.listen(port, () => {
    console.log(`[PM2/Express] Frontend server listening on port ${port} (BASE_PATH: ${BASE_PATH})`);
    console.log(`[PM2/Express] API Proxying to: ${BACKEND_TARGET}`);
});