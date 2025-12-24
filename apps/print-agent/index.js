require('dotenv').config();
const fs = require('fs');
const os = require('os');
const path = require('path');
const { execFile } = require('child_process');

const SERVER_BASE_URL = process.env.SERVER_BASE_URL || 'http://localhost:3000';
const PRINTER_ID = process.env.PRINTER_ID || '';
const AGENT_KEY = process.env.AGENT_KEY || '';
const WINDOWS_PRINTER_NAME = process.env.WINDOWS_PRINTER_NAME || '';
const POLL_INTERVAL_MS = Number(process.env.POLL_INTERVAL_MS || 1000);
const COPIES = Number(process.env.COPIES || 1);

if (!PRINTER_ID || !AGENT_KEY || !WINDOWS_PRINTER_NAME) {
  console.error('Missing PRINTER_ID/AGENT_KEY/WINDOWS_PRINTER_NAME');
  process.exit(1);
}

async function pullJobs() {
  const res = await fetch(`${SERVER_BASE_URL}/admin/print/agent/pull`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-AGENT-KEY': AGENT_KEY
    },
    body: JSON.stringify({ printerId: PRINTER_ID, max: 5 })
  });
  if (!res.ok) throw new Error(`pull failed ${res.status}`);
  const data = await res.json();
  return data.jobs || [];
}

async function reportJob(jobId, ok, errorMessage) {
  const res = await fetch(`${SERVER_BASE_URL}/admin/print/agent/report`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-AGENT-KEY': AGENT_KEY
    },
    body: JSON.stringify({ printerId: PRINTER_ID, jobId, ok, errorMessage })
  });
  if (!res.ok) throw new Error(`report failed ${res.status}`);
}

function printFile(filePath) {
  return new Promise((resolve, reject) => {
    const command = `Get-Content -Raw -Path "${filePath}" | Out-Printer -Name "${WINDOWS_PRINTER_NAME}"`;
    execFile('powershell', ['-NoProfile', '-Command', command], (err) => {
      if (err) reject(err);
      else resolve();
    });
  });
}

async function printContent(content) {
  const filePath = path.join(os.tmpdir(), `bbq_print_${Date.now()}_${Math.random().toString(36).slice(2)}.txt`);
  fs.writeFileSync(filePath, `${content}\n\n`);
  try {
    for (let i = 0; i < COPIES; i += 1) {
      await printFile(filePath);
    }
  } finally {
    fs.unlinkSync(filePath);
  }
}

let running = false;
async function tick() {
  if (running) return;
  running = true;
  try {
    const jobs = await pullJobs();
    for (const job of jobs) {
      try {
        await printContent(job.content || '');
        await reportJob(job.jobId, true);
      } catch (err) {
        await reportJob(job.jobId, false, String(err?.message || err));
      }
    }
  } catch (err) {
    console.error(err);
  } finally {
    running = false;
  }
}

setInterval(tick, POLL_INTERVAL_MS);
tick();
