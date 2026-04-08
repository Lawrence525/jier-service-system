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

// 初始化数据文件（原生fs实现，无需第三方依赖）
function initData() {
  return new Promise((resolve, reject) => {
    // 确保data文件夹存在
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    // 初始化空JSON文件
    const initFile = (filePath) => {
      if (!fs.existsSync(filePath)) {
        fs.writeFileSync(filePath, '[]', 'utf8');
      }
    };
    initFile(USERS_FILE);
    initFile(TICKETS_FILE);
    initFile(PARTS_FILE);
    console.log('✅ 数据文件初始化完成');
    resolve();
  });
}

// 通用JSON读写工具（原生fs）
const readJson = (filePath) => {
  return new Promise((resolve, reject) => {
    fs.readFile(filePath, 'utf8', (err, data) => {
      if (err) return reject(err);
      try {
        resolve(JSON.parse(data));
      } catch (e) {
        reject(e);
      }
    });
  });
};

const writeJson = (filePath, data) => {
  return new Promise((resolve, reject) => {
    fs.writeFile(filePath, JSON.stringify(data, null, 2), 'utf8', (err) => {
      if (err) return reject(err);
      resolve();
    });
  });
};

// 中间件
app.use(cors());
app.use(express.json());
app.use(express.static(__dirname));

// ==================== 用户接口 ====================
app.get('/api/users', async (req, res) => {
  try {
    const data = await readJson(USERS_FILE);
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/users', async (req, res) => {
  try {
    await writeJson(USERS_FILE, req.body);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/users/:id', async (req, res) => {
  try {
    const users = await readJson(USERS_FILE);
    const filtered = users.filter(u => u.id !== parseInt(req.params.id));
    await writeJson(USERS_FILE, filtered);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ==================== 工单接口 ====================
app.get('/api/tickets', async (req, res) => {
  try {
    const data = await readJson(TICKETS_FILE);
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/tickets', async (req, res) => {
  try {
    await writeJson(TICKETS_FILE, req.body);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ==================== 零件接口 ====================
app.get('/api/parts', async (req, res) => {
  try {
    const data = await readJson(PARTS_FILE);
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/parts', async (req, res) => {
  try {
    await writeJson(PARTS_FILE, req.body);
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
}).catch(err => {
  console.error('❌ 初始化失败:', err);
});
