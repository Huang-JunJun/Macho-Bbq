function toast(msg: string) {
  uni.showToast({ title: msg, icon: 'none' });
}

function getPlatform() {
  try {
    const info: any = uni.getSystemInfoSync();
    return String(info?.uniPlatform ?? info?.platform ?? '').toLowerCase();
  } catch {
    return '';
  }
}

function normalizeToUrl(p: string) {
  const s = p.trim();
  if (!s) return '';
  if (s.startsWith('/')) return s;
  return `/${s}`;
}

function extractScanPath(raw: string) {
  const s = raw.trim();
  if (!s) return '';

  const key = 'pages/scan/index';
  const i = s.indexOf(key);
  if (i >= 0) return normalizeToUrl(s.slice(i));

  if (s.includes('storeId=') && s.includes('tableId=') && s.includes('sign=')) {
    const j = s.indexOf('storeId=');
    if (j >= 0) return normalizeToUrl(`pages/scan/index?${s.slice(j)}`);
  }

  if (s.startsWith('/pages/scan/index')) return s;
  if (s.startsWith('pages/scan/index')) return normalizeToUrl(s);
  return '';
}

export async function scanToOrder() {
  const p = getPlatform();
  if (p === 'web' || p === 'h5') {
    toast('请在微信小程序内使用扫码点单');
    return;
  }

  try {
    const res: any = await new Promise((resolve, reject) => {
      uni.scanCode({
        scanType: ['qrCode'],
        success: resolve,
        fail: reject
      } as any);
    });

    const path = String(res?.path ?? '');
    if (path) {
      uni.navigateTo({ url: normalizeToUrl(path) });
      return;
    }

    const result = String(res?.result ?? '');
    const scanPath = extractScanPath(result);
    if (scanPath) {
      uni.navigateTo({ url: scanPath });
      return;
    }

    toast('无法识别二维码');
  } catch (e: any) {
    const msg = String(e?.errMsg ?? e?.message ?? '');
    if (msg.includes('cancel')) toast('已取消扫码');
    else toast('扫码失败');
  }
}
