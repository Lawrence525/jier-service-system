const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const nodemailer = require('nodemailer');

const app = express();
const PORT = process.env.PORT || 3001;

// ===================== Paths =====================
const DATA_DIR = path.join(__dirname, 'data');
const USERS_FILE = path.join(DATA_DIR, 'users.json');
const TICKETS_FILE = path.join(DATA_DIR, 'tickets.json');
const PARTS_FILE = path.join(DATA_DIR, 'parts.json');
const AGENTS_FILE = path.join(DATA_DIR, 'agents.json');

// ===================== Init =====================
function ensureDir(dirPath) {
  if (!fs.existsSync(dirPath)) fs.mkdirSync(dirPath, { recursive: true });
}

function ensureJsonFile(filePath, defaultValue = []) {
  if (!fs.existsSync(filePath)) {
    fs.writeFileSync(filePath, JSON.stringify(defaultValue, null, 2), 'utf8');
  }
}

function initData() {
  ensureDir(DATA_DIR);
  ensureJsonFile(USERS_FILE, []);
  ensureJsonFile(TICKETS_FILE, []);
  ensureJsonFile(PARTS_FILE, []);
  ensureJsonFile(AGENTS_FILE, [
    {
      id: 1,
      name: 'Bin Liu',
      role: 'Controls Engineer',
      email: 'liu_bin1@jiermt.com'
    },
    {
      id: 2,
      name: 'Lawrence Sun',
      role: 'Controls Engineer',
      email: 'sun_xiaoming@jier-na.com'
    },
    {
      id: 3,
      name: 'Matthew Novak',
      role: 'Service Manager',
      email: 'novak_matthew@jier-na.com'
    },
    {
      id: 4,
      name: 'Wenpin Wang',
      role: 'Controls Engineer',
      email: 'wang_wenpin@jiermt.com'
    },
    {
      id: 5,
      name: 'Zhiwei Du',
      role: 'Controls Engineer',
      email: 'du_zhiwei@jiermt.com'
    }
  ]);
  console.log('✅ Data files initialized');
}

function readJson(filePath) {
  const raw = fs.readFileSync(filePath, 'utf8') || '[]';
  return JSON.parse(raw);
}

function writeJson(filePath, data) {
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf8');
}

// ===================== Email =====================
const SMTP_HOST = process.env.SMTP_HOST || '';
const SMTP_PORT = Number(process.env.SMTP_PORT || 587);
const SMTP_SECURE = String(process.env.SMTP_SECURE || 'false') === 'true';
const SMTP_USER = process.env.SMTP_USER || '';
const SMTP_PASS = process.env.SMTP_PASS || '';
const MAIL_FROM = process.env.MAIL_FROM || SMTP_USER || '';

const emailEnabled = Boolean(SMTP_HOST && SMTP_USER && SMTP_PASS && MAIL_FROM);

const transporter = emailEnabled
  ? nodemailer.createTransport({
      host: SMTP_HOST,
      port: SMTP_PORT,
      secure: SMTP_SECURE,
      auth: {
        user: SMTP_USER,
        pass: SMTP_PASS
      }
    })
  : null;

async function sendMailSafe({ to, subject, text, html }) {
  if (!emailEnabled) {
    console.log(`📭 Email skipped (SMTP not configured): ${subject}`);
    return { skipped: true };
  }

  if (!to || !Array.isArray(to) || !to.length) {
    console.log(`📭 Email skipped (no recipients): ${subject}`);
    return { skipped: true };
  }

  const cleanRecipients = [...new Set(
    to.map(v => String(v || '').trim()).filter(Boolean)
  )];

  if (!cleanRecipients.length) {
    console.log(`📭 Email skipped (empty recipients): ${subject}`);
    return { skipped: true };
  }

  const info = await transporter.sendMail({
    from: MAIL_FROM,
    to: cleanRecipients.join(', '),
    subject,
    text,
    html
  });

  console.log(`📧 Email sent: ${subject} -> ${cleanRecipients.join(', ')}`);
  return info;
}

// ===================== Helpers =====================
function normalizeString(value) {
  return String(value || '').trim();
}

function normalizeArray(value) {
  if (Array.isArray(value)) return value.filter(Boolean);
  if (value == null || value === '') return [];
  return [value];
}

function statusText(value, fallback = 'N/A') {
  return normalizeString(value) || fallback;
}

function safeId(value) {
  return String(value ?? '').trim();
}

function getAssignedNames(item) {
  const names = new Set();

  if (Array.isArray(item.assignedNames)) {
    item.assignedNames.forEach(v => {
      const s = normalizeString(v);
      if (s) names.add(s);
    });
  }

  if (Array.isArray(item.assigned)) {
    item.assigned.forEach(v => {
      const s = normalizeString(v);
      if (s) names.add(s);
    });
  } else {
    const singleAssigned = normalizeString(item.assigned);
    if (singleAssigned) names.add(singleAssigned);
  }

  if (Array.isArray(item.assignedTo)) {
    item.assignedTo.forEach(v => {
      const s = normalizeString(v);
      if (s) names.add(s);
    });
  }

  return [...names];
}

function getAssignedIds(item) {
  const ids = new Set();

  if (Array.isArray(item.assignedIds)) {
    item.assignedIds.forEach(v => {
      const s = safeId(v);
      if (s) ids.add(s);
    });
  }

  if (Array.isArray(item.handlerIds)) {
    item.handlerIds.forEach(v => {
      const s = safeId(v);
      if (s) ids.add(s);
    });
  }

  return [...ids];
}

function findAgentEmails(item, agents) {
  const byName = new Map();
  const byId = new Map();

  for (const agent of agents) {
    const name = normalizeString(agent.name);
    const email = normalizeString(agent.email);
    const id = safeId(agent.id);
    if (name && email) byName.set(name.toLowerCase(), email);
    if (id && email) byId.set(id, email);
  }

  const recipients = new Set();

  for (const id of getAssignedIds(item)) {
    const email = byId.get(id);
    if (email) recipients.add(email);
  }

  for (const name of getAssignedNames(item)) {
    const email = byName.get(name.toLowerCase());
    if (email) recipients.add(email);
  }

  return [...recipients];
}

function getItemKey(item) {
  return safeId(item.id) || safeId(item.ticketId) || safeId(item.requestId);
}

function mapById(list) {
  const map = new Map();
  for (const item of list) {
    const key = getItemKey(item);
    if (key) map.set(key, item);
  }
  return map;
}

function arrayDiff(newArr, oldArr) {
  const oldSet = new Set(oldArr.map(v => String(v).toLowerCase()));
  return newArr.filter(v => !oldSet.has(String(v).toLowerCase()));
}

function escapeHtml(value) {
  return String(value || '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function ticketSummary(item) {
  return {
    id: item.id || 'N/A',
    company: item.company || 'N/A',
    plant: item.plant || 'N/A',
    product: item.product || item.productType || 'N/A',
    status: item.status || 'N/A',
    issue: item.issue || item.issueDescription || 'N/A',
    assigned: getAssignedNames(item).join(', ') || 'N/A'
  };
}

function partsSummary(item) {
  return {
    id: item.id || 'N/A',
    company: item.company || 'N/A',
    contact: item.contact || 'N/A',
    equipment: item.equipment || item.equipmentModel || 'N/A',
    partnum: item.partnum || item.partNumber || 'N/A',
    qty: item.qty || item.quantity || 'N/A',
    status: item.status || 'N/A',
    urgency: item.urgency || 'N/A',
    assigned: getAssignedNames(item).join(', ') || 'N/A'
  };
}

function buildTicketMail(subject, summary, extraRows = []) {
  const lines = [
    `Ticket #: ${summary.id}`,
    `Company: ${summary.company}`,
    `Plant: ${summary.plant}`,
    `Product: ${summary.product}`,
    `Assigned To: ${summary.assigned}`,
    `Status: ${summary.status}`,
    `Issue: ${summary.issue}`,
    ...extraRows
  ];

  const htmlRows = [
    ['Ticket #', summary.id],
    ['Company', summary.company],
    ['Plant', summary.plant],
    ['Product', summary.product],
    ['Assigned To', summary.assigned],
    ['Status', summary.status],
    ['Issue', summary.issue],
    ...extraRows.map(row => {
      const idx = row.indexOf(':');
      if (idx === -1) return ['Note', row];
      return [row.slice(0, idx), row.slice(idx + 1).trim()];
    })
  ];

  const html = `
    <div style="font-family:Arial,sans-serif;font-size:14px;color:#111">
      <p>${escapeHtml(subject)}</p>
      <table cellpadding="6" cellspacing="0" border="1" style="border-collapse:collapse">
        ${htmlRows.map(([k, v]) => `<tr><td><strong>${escapeHtml(k)}</strong></td><td>${escapeHtml(v)}</td></tr>`).join('')}
      </table>
    </div>
  `;

  return { text: lines.join('\n'), html };
}

function buildPartsMail(subject, summary, extraRows = []) {
  const lines = [
    `Request #: ${summary.id}`,
    `Company: ${summary.company}`,
    `Contact: ${summary.contact}`,
    `Equipment: ${summary.equipment}`,
    `Part Number: ${summary.partnum}`,
    `Quantity: ${summary.qty}`,
    `Assigned To: ${summary.assigned}`,
    `Status: ${summary.status}`,
    `Urgency: ${summary.urgency}`,
    ...extraRows
  ];

  const htmlRows = [
    ['Request #', summary.id],
    ['Company', summary.company],
    ['Contact', summary.contact],
    ['Equipment', summary.equipment],
    ['Part Number', summary.partnum],
    ['Quantity', summary.qty],
    ['Assigned To', summary.assigned],
    ['Status', summary.status],
    ['Urgency', summary.urgency],
    ...extraRows.map(row => {
      const idx = row.indexOf(':');
      if (idx === -1) return ['Note', row];
      return [row.slice(0, idx), row.slice(idx + 1).trim()];
    })
  ];

  const html = `
    <div style="font-family:Arial,sans-serif;font-size:14px;color:#111">
      <p>${escapeHtml(subject)}</p>
      <table cellpadding="6" cellspacing="0" border="1" style="border-collapse:collapse">
        ${htmlRows.map(([k, v]) => `<tr><td><strong>${escapeHtml(k)}</strong></td><td>${escapeHtml(v)}</td></tr>`).join('')}
      </table>
    </div>
  `;

  return { text: lines.join('\n'), html };
}

async function notifyTicketChanges(oldTickets, newTickets, agents) {
  const oldMap = mapById(oldTickets);

  for (const newItem of newTickets) {
    const key = getItemKey(newItem);
    if (!key) continue;

    const oldItem = oldMap.get(key);
    const recipients = findAgentEmails(newItem, agents);
    const summary = ticketSummary(newItem);

    if (!oldItem) {
      const subject = `New Service Ticket Assigned - ${summary.id}`;
      const mail = buildTicketMail(subject, summary);
      await sendMailSafe({ to: recipients, subject, ...mail });
      continue;
    }

    const oldStatus = statusText(oldItem.status);
    const newStatus = statusText(newItem.status);

    if (oldStatus !== newStatus) {
      const subject = `Service Ticket Status Updated - ${summary.id}`;
      const mail = buildTicketMail(subject, summary, [
        `Previous Status: ${oldStatus}`,
        `New Status: ${newStatus}`
      ]);
      await sendMailSafe({ to: recipients, subject, ...mail });
    }

    const oldRecipients = findAgentEmails(oldItem, agents);
    const newRecipientsOnly = arrayDiff(recipients, oldRecipients);

    if (newRecipientsOnly.length) {
      const subject = `Service Ticket Assigned to You - ${summary.id}`;
      const mail = buildTicketMail(subject, summary, [
        'Assignment Update: You were added to this ticket'
      ]);
      await sendMailSafe({ to: newRecipientsOnly, subject, ...mail });
    }

    const oldCancelled = oldStatus.toLowerCase() === 'cancelled';
    const newCancelled = newStatus.toLowerCase() === 'cancelled';

    if (!oldCancelled && newCancelled) {
      const subject = `Service Ticket Cancelled - ${summary.id}`;
      const mail = buildTicketMail(subject, summary);
      await sendMailSafe({ to: recipients, subject, ...mail });
    }
  }
}

async function notifyPartsChanges(oldParts, newParts, agents) {
  const oldMap = mapById(oldParts);

  for (const newItem of newParts) {
    const key = getItemKey(newItem);
    if (!key) continue;

    const oldItem = oldMap.get(key);
    const recipients = findAgentEmails(newItem, agents);
    const summary = partsSummary(newItem);

    if (!oldItem) {
      const subject = `New Parts Request Assigned - ${summary.id}`;
      const mail = buildPartsMail(subject, summary);
      await sendMailSafe({ to: recipients, subject, ...mail });
      continue;
    }

    const oldStatus = statusText(oldItem.status);
    const newStatus = statusText(newItem.status);

    if (oldStatus !== newStatus) {
      const subject = `Parts Request Status Updated - ${summary.id}`;
      const mail = buildPartsMail(subject, summary, [
        `Previous Status: ${oldStatus}`,
        `New Status: ${newStatus}`
      ]);
      await sendMailSafe({ to: recipients, subject, ...mail });
    }

    const oldRecipients = findAgentEmails(oldItem, agents);
    const newRecipientsOnly = arrayDiff(recipients, oldRecipients);

    if (newRecipientsOnly.length) {
      const subject = `Parts Request Assigned to You - ${summary.id}`;
      const mail = buildPartsMail(subject, summary, [
        'Assignment Update: You were added to this request'
      ]);
      await sendMailSafe({ to: newRecipientsOnly, subject, ...mail });
    }

    const oldCancelled = oldStatus.toLowerCase() === 'cancelled';
    const newCancelled = newStatus.toLowerCase() === 'cancelled';

    if (!oldCancelled && newCancelled) {
      const subject = `Parts Request Cancelled - ${summary.id}`;
      const mail = buildPartsMail(subject, summary);
      await sendMailSafe({ to: recipients, subject, ...mail });
    }
  }
}

// ===================== Middleware =====================
app.use(cors());
app.use(express.json({ limit: '5mb' }));
app.use(express.static(__dirname));

// ===================== Basic routes =====================
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

app.get('/api/health', async (req, res) => {
  const health = {
    ok: true,
    emailEnabled,
    smtpHostConfigured: Boolean(SMTP_HOST),
    fromConfigured: Boolean(MAIL_FROM)
  };

  if (emailEnabled && transporter) {
    try {
      await transporter.verify();
      health.smtpVerified = true;
    } catch (err) {
      health.smtpVerified = false;
      health.smtpError = err.message;
    }
  }

  res.json(health);
});

// ===================== Users =====================
app.get('/api/users', (req, res) => {
  res.json(readJson(USERS_FILE));
});

app.post('/api/users', (req, res) => {
  const users = Array.isArray(req.body) ? req.body : [];
  writeJson(USERS_FILE, users);
  res.json({ success: true, count: users.length });
});

app.delete('/api/users/:id', (req, res) => {
  const users = readJson(USERS_FILE);
  const filtered = users.filter(u => safeId(u.id) !== safeId(req.params.id));
  writeJson(USERS_FILE, filtered);
  res.json({ success: true, count: filtered.length });
});

// ===================== Agents =====================
app.get('/api/agents', (req, res) => {
  res.json(readJson(AGENTS_FILE));
});

app.post('/api/agents', (req, res) => {
  const agents = Array.isArray(req.body) ? req.body : [];
  writeJson(AGENTS_FILE, agents);
  res.json({ success: true, count: agents.length });
});

app.delete('/api/agents/:id', (req, res) => {
  const agents = readJson(AGENTS_FILE);
  const filtered = agents.filter(a => safeId(a.id) !== safeId(req.params.id));
  writeJson(AGENTS_FILE, filtered);
  res.json({ success: true, count: filtered.length });
});

// ===================== Tickets =====================
app.get('/api/tickets', (req, res) => {
  res.json(readJson(TICKETS_FILE));
});

app.post('/api/tickets', async (req, res) => {
  try {
    const newTickets = Array.isArray(req.body) ? req.body : [];
    const oldTickets = readJson(TICKETS_FILE);
    const agents = readJson(AGENTS_FILE);

    writeJson(TICKETS_FILE, newTickets);
    await notifyTicketChanges(oldTickets, newTickets, agents);

    res.json({ success: true, count: newTickets.length });
  } catch (err) {
    console.error('❌ Ticket save error:', err);
    res.status(500).json({ error: err.message });
  }
});

// ===================== Parts =====================
app.get('/api/parts', (req, res) => {
  res.json(readJson(PARTS_FILE));
});

app.post('/api/parts', async (req, res) => {
  try {
    const newParts = Array.isArray(req.body) ? req.body : [];
    const oldParts = readJson(PARTS_FILE);
    const agents = readJson(AGENTS_FILE);

    writeJson(PARTS_FILE, newParts);
    await notifyPartsChanges(oldParts, newParts, agents);

    res.json({ success: true, count: newParts.length });
  } catch (err) {
    console.error('❌ Parts save error:', err);
    res.status(500).json({ error: err.message });
  }
});

// ===================== 404 API fallback =====================
app.use('/api/*', (req, res) => {
  res.status(404).json({ error: 'API route not found' });
});

// ===================== Start =====================
initData();

app.listen(PORT, () => {
  console.log(`✅ Server started on port ${PORT}`);
  if (emailEnabled) {
    console.log('📧 Email notifications enabled');
  } else {
    console.log('📭 Email notifications disabled (missing SMTP env vars)');
  }
});
