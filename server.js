const express = require('express');
const cors = require('cors');
const fs = require('fs-extra');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3001;

// 数据文件路径
const DATA_DIR = path.join(__dirname, 'data');
const USERS_FILE = path.join(DATA_DIR, 'users.json');
const TICKETS_FILE = path.join(DATA_DIR, 'tickets.json');
const PARTS_FILE = path.join(DATA_DIR, 'parts.json');

// 初始化数据文件
async function initData() {
  await fs.ensureDir(DATA_DIR);
  if (!await fs.pathExists(USERS_FILE)) await fs.writeJson(USERS_FILE, []);
  if (!await fs.pathExists(TICKETS_FILE)) await fs.writeJson(TICKETS_FILE, []);
  if (!await fs.pathExists(PARTS_FILE)) await fs.writeJson(PARTS_FILE, []);
  console.log('✅ 数据文件初始化完成');
}

// 中间件
app.use(cors());
app.use(express.json());
app.use(express.static(__dirname));

// ==================== 用户接口 ====================
app.get('/api/users', async (req, res) => {
  try {
    const data = await fs.readJson(USERS_FILE);
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/users', async (req, res) => {
  try {
    await fs.writeJson(USERS_FILE, req.body);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/users/:id', async (req, res) => {
  try {
    const users = await fs.readJson(USERS_FILE);
    const filtered = users.filter(u => u.id !== parseInt(req.params.id));
    await fs.writeJson(USERS_FILE, filtered);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ==================== 工单接口 ====================
app.get('/api/tickets', async (req, res) => {
  try {
    const data = await fs.readJson(TICKETS_FILE);
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/tickets', async (req, res) => {
  try {
    await fs.writeJson(TICKETS_FILE, req.body);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ==================== 零件接口 ====================
app.get('/api/parts', async (req, res) => {
  try {
    const data = await fs.readJson(PARTS_FILE);
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/parts', async (req, res) => {
  try {
    await fs.writeJson(PARTS_FILE, req.body);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 启动服务
initData().then(() => {
  app.listen(PORT, () => {
    console.log(`✅ 服务启动成功，端口：${PORT}`);
    console.log(`🌐 访问地址：https://jier-service-system.onrender.com`);
  });
});
