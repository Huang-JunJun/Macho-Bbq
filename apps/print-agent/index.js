require('dotenv').config();
const fs = require('fs');
const os = require('os');
const path = require('path');
const { execFile } = require('child_process');
const iconv = require('iconv-lite');

const SERVER_BASE_URL = process.env.SERVER_BASE_URL || 'http://localhost:3000';
const PRINTER_ID = process.env.PRINTER_ID || '';
const AGENT_KEY = process.env.AGENT_KEY || '';
const WINDOWS_PRINTER_NAME = process.env.WINDOWS_PRINTER_NAME || '';
const POLL_INTERVAL_MS = Number(process.env.POLL_INTERVAL_MS || 1000);
const COPIES = Number(process.env.COPIES || 1);
const PRINT_MODE = String(process.env.PRINT_MODE || 'RAW').toUpperCase();
const PRINT_ENCODING = String(process.env.PRINT_ENCODING || 'gb18030');
const ESC_POS_CHINESE = String(process.env.ESC_POS_CHINESE || '1') !== '0';
const ESC_POS_CODEPAGE = process.env.ESC_POS_CODEPAGE || '';
const ESC_POS_CUT = String(process.env.ESC_POS_CUT || '1') !== '0';

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

function escapePowerShellString(value) {
  return String(value).replace(/'/g, "''");
}

function printFileText(filePath) {
  return new Promise((resolve, reject) => {
    const command = `Get-Content -Raw -Path "${filePath}" | Out-Printer -Name "${WINDOWS_PRINTER_NAME}"`;
    execFile('powershell', ['-NoProfile', '-Command', command], (err) => {
      if (err) reject(err);
      else resolve();
    });
  });
}

function printFileRaw(filePath) {
  return new Promise((resolve, reject) => {
    if (process.platform !== 'win32') {
      reject(new Error('RAW 打印仅支持 Windows'));
      return;
    }
    const printerName = escapePowerShellString(WINDOWS_PRINTER_NAME);
    const absPath = escapePowerShellString(filePath);
    const psScript = `
$printer = '${printerName}'
$file = '${absPath}'
$bytes = [System.IO.File]::ReadAllBytes($file)
Add-Type -TypeDefinition @'
using System;
using System.Runtime.InteropServices;
public class RawPrinterHelper {
  [StructLayout(LayoutKind.Sequential, CharSet=CharSet.Unicode)]
  public class DOCINFOA {
    [MarshalAs(UnmanagedType.LPWStr)] public string pDocName;
    [MarshalAs(UnmanagedType.LPWStr)] public string pOutputFile;
    [MarshalAs(UnmanagedType.LPWStr)] public string pDataType;
  }
  [DllImport("winspool.drv", SetLastError=true, CharSet=CharSet.Unicode)]
  public static extern bool OpenPrinter(string pPrinterName, out IntPtr phPrinter, IntPtr pDefault);
  [DllImport("winspool.drv", SetLastError=true)]
  public static extern bool ClosePrinter(IntPtr hPrinter);
  [DllImport("winspool.drv", SetLastError=true, CharSet=CharSet.Unicode)]
  public static extern bool StartDocPrinter(IntPtr hPrinter, int Level, DOCINFOA pDocInfo);
  [DllImport("winspool.drv", SetLastError=true)]
  public static extern bool EndDocPrinter(IntPtr hPrinter);
  [DllImport("winspool.drv", SetLastError=true)]
  public static extern bool StartPagePrinter(IntPtr hPrinter);
  [DllImport("winspool.drv", SetLastError=true)]
  public static extern bool EndPagePrinter(IntPtr hPrinter);
  [DllImport("winspool.drv", SetLastError=true)]
  public static extern bool WritePrinter(IntPtr hPrinter, byte[] pBytes, int dwCount, out int dwWritten);
  public static void SendBytesToPrinter(string printerName, byte[] bytes) {
    IntPtr hPrinter;
    if (!OpenPrinter(printerName, out hPrinter, IntPtr.Zero)) {
      throw new System.ComponentModel.Win32Exception(Marshal.GetLastWin32Error());
    }
    try {
      DOCINFOA di = new DOCINFOA();
      di.pDocName = "bbq-escpos";
      di.pDataType = "RAW";
      if (!StartDocPrinter(hPrinter, 1, di)) {
        throw new System.ComponentModel.Win32Exception(Marshal.GetLastWin32Error());
      }
      try {
        if (!StartPagePrinter(hPrinter)) {
          throw new System.ComponentModel.Win32Exception(Marshal.GetLastWin32Error());
        }
        try {
          int written;
          if (!WritePrinter(hPrinter, bytes, bytes.Length, out written)) {
            throw new System.ComponentModel.Win32Exception(Marshal.GetLastWin32Error());
          }
        } finally {
          EndPagePrinter(hPrinter);
        }
      } finally {
        EndDocPrinter(hPrinter);
      }
    } finally {
      ClosePrinter(hPrinter);
    }
  }
}
'@
[RawPrinterHelper]::SendBytesToPrinter($printer, $bytes)
`;
    const psFile = path.join(os.tmpdir(), `bbq_print_${Date.now()}_${Math.random().toString(36).slice(2)}.ps1`);
    fs.writeFileSync(psFile, psScript, 'utf8');
    execFile('powershell', ['-NoProfile', '-ExecutionPolicy', 'Bypass', '-File', psFile], (err) => {
      fs.unlinkSync(psFile);
      if (err) reject(err);
      else resolve();
    });
  });
}

function buildEscPosBuffer(content) {
  const buffers = [];
  buffers.push(Buffer.from([0x1b, 0x40]));
  if (ESC_POS_CODEPAGE !== '') {
    const codepage = Math.max(0, Math.min(255, Number(ESC_POS_CODEPAGE)));
    if (!Number.isNaN(codepage)) buffers.push(Buffer.from([0x1b, 0x74, codepage]));
  }
  if (ESC_POS_CHINESE) buffers.push(Buffer.from([0x1c, 0x26]));
  const text = content.endsWith('\n') ? content : `${content}\n`;
  buffers.push(iconv.encode(text, PRINT_ENCODING));
  if (ESC_POS_CHINESE) buffers.push(Buffer.from([0x1c, 0x2e]));
  if (ESC_POS_CUT) buffers.push(Buffer.from([0x1d, 0x56, 0x00]));
  return Buffer.concat(buffers);
}

async function printContent(content) {
  if (PRINT_MODE !== 'RAW') {
    const filePath = path.join(os.tmpdir(), `bbq_print_${Date.now()}_${Math.random().toString(36).slice(2)}.txt`);
    fs.writeFileSync(filePath, `${content}\n\n`, 'utf8');
    try {
      for (let i = 0; i < COPIES; i += 1) {
        await printFileText(filePath);
      }
    } finally {
      fs.unlinkSync(filePath);
    }
    return;
  }
  const filePath = path.join(os.tmpdir(), `bbq_print_${Date.now()}_${Math.random().toString(36).slice(2)}.bin`);
  const payload = buildEscPosBuffer(content || '');
  fs.writeFileSync(filePath, payload);
  try {
    for (let i = 0; i < COPIES; i += 1) {
      await printFileRaw(filePath);
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
