const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3001;

// 数据文件路径
const DATA_DIR = path.join(__dirname, 'data');
const USERS_FILE = path.join(DATA_DIR, 'users.json');
const TICKETS_FILE = path.join(DATA_DIR, 'tickets.json');
const PARTS_FILE = path.join(DATA_DIR, 'parts.json');
const AGENTS_FILE = path.join(DATA_DIR, 'agents.json');

// 初始化数据
function initData() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }

  const initFile = (file) => {
    if (!fs.existsSync(file)) {
      fs.writeFileSync(file, '[]', 'utf8');
    }
  };

  initFile(USERS_FILE);
  initFile(TICKETS_FILE);
  initFile(PARTS_FILE);
  initFile(AGENTS_FILE);

  console.log('✅ 数据文件初始化完成');
}

// 读写 JSON
const readJson = (file) =>
  JSON.parse(fs.readFileSync(file, 'utf8') || '[]');

const writeJson = (file, data) =>
  fs.writeFileSync(file, JSON.stringify(data, null, 2));

// 中间件
app.use(cors());
app.use(express.json());
app.use(express.static(__dirname));

// 首页
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

// 健康检查
app.get('/api/health', (req, res) => {
  res.json({ ok: true });
});


// ================= USERS =================
app.get('/api/users', (req, res) => {
  res.json(readJson(USERS_FILE));
});

app.post('/api/users', (req, res) => {
  writeJson(USERS_FILE, req.body);
  res.json({ success: true });
});

app.delete('/api/users/:id', (req, res) => {
  const users = readJson(USERS_FILE);
  const filtered = users.filter(u => u.id != req.params.id);
  writeJson(USERS_FILE, filtered);
  res.json({ success: true });
});


// ================= AGENTS =================
app.get('/api/agents', (req, res) => {
  res.json(readJson(AGENTS_FILE));
});

app.post('/api/agents', (req, res) => {
  writeJson(AGENTS_FILE, req.body);
  res.json({ success: true });
});

app.delete('/api/agents/:id', (req, res) => {
  const agents = readJson(AGENTS_FILE);
  const filtered = agents.filter(a => a.id != req.params.id);
  writeJson(AGENTS_FILE, filtered);
  res.json({ success: true });
});


// ================= TICKETS =================
app.get('/api/tickets', (req, res) => {
  res.json(readJson(TICKETS_FILE));
});

app.post('/api/tickets', (req, res) => {
  writeJson(TICKETS_FILE, req.body);
  res.json({ success: true });
});


// ================= PARTS =================
app.get('/api/parts', (req, res) => {
  res.json(readJson(PARTS_FILE));
});

app.post('/api/parts', (req, res) => {
  writeJson(PARTS_FILE, req.body);
  res.json({ success: true });
});


// 启动
initData();

app.listen(PORT, () => {
  console.log(`✅ 服务启动成功，端口：${PORT}`);
});
