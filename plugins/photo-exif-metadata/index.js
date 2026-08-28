function parseExifAndHeader(bytes) {
  if (!bytes || bytes.length < 8) return null;
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const result = { format: '' };

  function readString(offset, length) {
    let str = '';
    for (let i = 0; i < length; i++) {
      const code = bytes[offset + i];
      if (code === 0) break;
      str += String.fromCharCode(code);
    }
    return str.trim();
  }

  function readRational(offset, isLE) {
    if (offset + 8 > bytes.length) return 0;
    const num = view.getUint32(offset, isLE);
    const den = view.getUint32(offset + 4, isLE);
    if (den === 0) return 0;
    return num / den;
  }

  function parseIFD(tiffStart, ifdOffset, isLE) {
    if (tiffStart + ifdOffset + 2 > bytes.length) return 0;
    const numEntries = view.getUint16(tiffStart + ifdOffset, isLE);
    let exifSubIfdOffset = 0;

    for (let i = 0; i < numEntries; i++) {
      const entry = tiffStart + ifdOffset + 2 + i * 12;
      if (entry + 12 > bytes.length) break;

      const tag = view.getUint16(entry, isLE);
      const type = view.getUint16(entry + 2, isLE);
      const count = view.getUint32(entry + 4, isLE);
      const valOffset = count <= 4 && (type === 1 || type === 2 || type === 3 || type === 4)
        ? entry + 8
        : tiffStart + view.getUint32(entry + 8, isLE);

      if (valOffset >= bytes.length) continue;

      switch (tag) {
        case 0x010F: result.make = readString(valOffset, count); break;
        case 0x0110: result.model = readString(valOffset, count); break;
        case 0x0112: result.orientation = view.getUint16(entry + 8, isLE); break;
        case 0x0132: if (!result.dateTimeOriginal) result.dateTimeOriginal = readString(valOffset, count); break;
        case 0x8769: exifSubIfdOffset = view.getUint32(entry + 8, isLE); break;
        case 0x9003: result.dateTimeOriginal = readString(valOffset, count); break;
        case 0x9004: if (!result.dateTimeOriginal) result.dateTimeOriginal = readString(valOffset, count); break;
        case 0x829D: result.fNumber = readRational(valOffset, isLE); break;
        case 0x829A: result.exposureTime = readRational(valOffset, isLE); break;
        case 0x8827: result.iso = view.getUint16(entry + 8, isLE); break;
        case 0x920A: result.focalLength = readRational(valOffset, isLE); break;
        case 0xA434: result.lensModel = readString(valOffset, count); break;
      }
    }
    return exifSubIfdOffset;
  }

  // 1. PNG
  if (bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4E && bytes[3] === 0x47 && bytes.length >= 24) {
    result.width = view.getUint32(16, false);
    result.height = view.getUint32(20, false);
    result.format = 'PNG';
    return result;
  }

  // 2. GIF
  if (bytes[0] === 0x47 && bytes[1] === 0x49 && bytes[2] === 0x46 && bytes.length >= 10) {
    result.width = view.getUint16(6, true);
    result.height = view.getUint16(8, true);
    result.format = 'GIF';
    return result;
  }

  // 3. BMP
  if (bytes[0] === 0x42 && bytes[1] === 0x4D && bytes.length >= 26) {
    result.width = view.getInt32(18, true);
    result.height = Math.abs(view.getInt32(22, true));
    result.format = 'BMP';
    return result;
  }

  // 4. WebP
  if (bytes[0] === 0x52 && bytes[1] === 0x49 && bytes[2] === 0x46 && bytes[3] === 0x46 && bytes.length >= 30) {
    result.format = 'WEBP';
    if (bytes[12] === 0x56 && bytes[13] === 0x50 && bytes[14] === 0x38 && bytes[15] === 0x20) {
      result.width = (view.getUint16(26, true) & 0x3fff);
      result.height = (view.getUint16(28, true) & 0x3fff);
      return result;
    }
    if (bytes[12] === 0x56 && bytes[13] === 0x50 && bytes[14] === 0x38 && bytes[15] === 0x4C) {
      const b0 = bytes[21], b1 = bytes[22], b2 = bytes[23], b3 = bytes[24];
      result.width = 1 + (((b1 & 0x3F) << 8) | b0);
      result.height = 1 + (((b3 & 0x0F) << 10) | (b2 << 2) | ((b1 & 0xC0) >> 6));
      return result;
    }
    if (bytes[12] === 0x56 && bytes[13] === 0x50 && bytes[14] === 0x38 && bytes[15] === 0x58) {
      result.width = 1 + (bytes[24] | (bytes[25] << 8) | (bytes[26] << 16));
      result.height = 1 + (bytes[27] | (bytes[28] << 8) | (bytes[29] << 16));
      return result;
    }
  }

  // 5. JPEG
  if (bytes[0] === 0xFF && bytes[1] === 0xD8) {
    result.format = 'JPEG';
    let offset = 2;

    while (offset < bytes.length - 4) {
      if (bytes[offset] !== 0xFF) { offset++; continue; }
      while (offset < bytes.length && bytes[offset] === 0xFF) offset++;
      if (offset >= bytes.length) break;

      const marker = bytes[offset++];
      if (marker === 0xD8 || marker === 0xD9 || marker === 0x00 || (marker >= 0xD0 && marker <= 0xD7)) continue;
      if (offset + 2 > bytes.length) break;
      const length = view.getUint16(offset, false);

      // APP1: EXIF Metadata
      if (marker === 0xE1 && length >= 14 && offset + length <= bytes.length) {
        try {
          if (bytes[offset + 2] === 0x45 && bytes[offset + 3] === 0x78 && bytes[offset + 4] === 0x69 && bytes[offset + 5] === 0x66) {
            const tiffStart = offset + 8;
            const isLE = bytes[tiffStart] === 0x49 && bytes[tiffStart + 1] === 0x49;
            const ifd0Offset = view.getUint32(tiffStart + 4, isLE);
            const subIfd = parseIFD(tiffStart, ifd0Offset, isLE);
            if (subIfd > 0) {
              parseIFD(tiffStart, subIfd, isLE);
            }
          }
        } catch (e) {}
      }

      // SOF0..SOF15 Frame Header (Width & Height)
      if ((marker >= 0xC0 && marker <= 0xC3) || (marker >= 0xC5 && marker <= 0xC7) ||
          (marker >= 0xC9 && marker <= 0xCB) || (marker >= 0xCD && marker <= 0xCF)) {
        if (offset + 7 <= bytes.length) {
          let height = view.getUint16(offset + 3, false);
          let width = view.getUint16(offset + 5, false);
          if (result.orientation >= 5 && result.orientation <= 8) {
            const tmp = width;
            width = height;
            height = tmp;
          }
          result.width = width;
          result.height = height;
        }
      }

      if (length < 2) break;
      offset += length;
    }
  }

  return result;
}

function parseDateComponents(dateTimeStr, fallbackMs) {
  if (dateTimeStr && /^\d{4}[:\-\/]\d{2}[:\-\/]\d{2}/.test(dateTimeStr)) {
    const parts = dateTimeStr.split(/[\sT]+/);
    const dateParts = parts[0].split(/[:\-\/]/);
    const timeParts = (parts[1] || '00:00:00').split(/[:\-\/]/);
    const year = dateParts[0] || '';
    const month = (dateParts[1] || '').padStart(2, '0');
    const day = (dateParts[2] || '').padStart(2, '0');
    const hour = (timeParts[0] || '').padStart(2, '0');
    const min = (timeParts[1] || '').padStart(2, '0');
    const sec = (timeParts[2] || '').slice(0, 2).padStart(2, '0');
    return {
      year, month, day, hour, min, sec,
      date: year + '-' + month + '-' + day,
      time: hour + min + sec,
      datetime: year + month + day + '_' + hour + min + sec
    };
  }
  if (fallbackMs) {
    const d = new Date(fallbackMs);
    const year = String(d.getFullYear());
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    const hour = String(d.getHours()).padStart(2, '0');
    const min = String(d.getMinutes()).padStart(2, '0');
    const sec = String(d.getSeconds()).padStart(2, '0');
    return {
      year, month, day, hour, min, sec,
      date: year + '-' + month + '-' + day,
      time: hour + min + sec,
      datetime: year + month + day + '_' + hour + min + sec
    };
  }
  return { year: '', month: '', day: '', hour: '', min: '', sec: '', date: '', time: '', datetime: '' };
}

function getAspectRatio(w, h) {
  if (!w || !h) return '';
  const gcd = (a, b) => b === 0 ? a : gcd(b, a % b);
  const g = gcd(w, h);
  const rw = Math.round(w / g);
  const rh = Math.round(h / g);
  const ratio = w / h;
  if (Math.abs(ratio - 16/9) < 0.03) return '16-9';
  if (Math.abs(ratio - 9/16) < 0.03) return '9-16';
  if (Math.abs(ratio - 4/3) < 0.03) return '4-3';
  if (Math.abs(ratio - 3/4) < 0.03) return '3-4';
  if (Math.abs(ratio - 1) < 0.01) return '1-1';
  if (Math.abs(ratio - 21/9) < 0.05) return '21-9';
  return (rw <= 20 && rh <= 20) ? rw + '-' + rh : (w >= h ? 'landscape' : 'portrait');
}

function getResolutionLabel(w, h) {
  const maxDim = Math.max(w, h);
  const minDim = Math.min(w, h);
  if (maxDim >= 3800 || minDim >= 2100) return '4K';
  if (maxDim >= 2500 || minDim >= 1400) return '2K';
  if (maxDim >= 1900 || minDim >= 1000) return '1080p';
  if (maxDim >= 1200 || minDim >= 700) return '720p';
  return w + 'x' + h;
}

function formatShutter(sec) {
  if (!sec || sec <= 0) return '';
  if (sec >= 1) return Math.round(sec * 10) / 10 + 's';
  const den = Math.round(1 / sec);
  return '1-' + den + 's';
}

function sanitizeName(str) {
  if (!str) return '';
  return str.replace(/[\\/:*?"<>|]/g, '').trim();
}

export default {
  async transform(input, params, context, fileInfo) {
    if (!fileInfo || !fileInfo.path) {
      return input;
    }

    try {
      const bytes = await context.readBinaryFile(fileInfo.path, 524288);
      let info = parseExifAndHeader(bytes) || {};

      let meta = null;
      if (!info.dateTimeOriginal) {
        try {
          meta = await context.getFileMetadata(fileInfo.path);
        } catch (e) {}
      }

      const dateObj = parseDateComponents(info.dateTimeOriginal, meta?.modifiedAtMs || meta?.createdAtMs);

      const width = info.width || 0;
      const height = info.height || 0;
      const aspect = getAspectRatio(width, height);
      const resolutionLabel = (width && height)
        ? (params.simplifyResolution !== false ? getResolutionLabel(width, height) : (width + 'x' + height))
        : '';

      let camera = sanitizeName(info.model || info.make || '');
      let brand = sanitizeName(info.make || '');
      if (params.cleanSpaces !== false) {
        camera = camera.replace(/\s+/g, '_');
        brand = brand.replace(/\s+/g, '_');
      }

      const aperture = info.fNumber ? ('f' + (Math.round(info.fNumber * 10) / 10)) : '';
      const iso = info.iso ? ('ISO' + info.iso) : '';
      const shutter = formatShutter(info.exposureTime);
      const focal = info.focalLength ? (Math.round(info.focalLength) + 'mm') : '';
      const lens = sanitizeName(info.lensModel || '');

      const template = (params.customPattern && params.customPattern.trim()) || params.format || '{date}_{name}';
      const output = template
        .replace(/{name}/g, input)
        .replace(/{date}/g, dateObj.date)
        .replace(/{datetime}/g, dateObj.datetime)
        .replace(/{time}/g, dateObj.time)
        .replace(/{year}/g, dateObj.year)
        .replace(/{month}/g, dateObj.month)
        .replace(/{day}/g, dateObj.day)
        .replace(/{hour}/g, dateObj.hour)
        .replace(/{min}/g, dateObj.min)
        .replace(/{sec}/g, dateObj.sec)
        .replace(/{camera}/g, camera)
        .replace(/{brand}/g, brand)
        .replace(/{width}/g, width ? String(width) : '')
        .replace(/{height}/g, height ? String(height) : '')
        .replace(/{resolution}/g, resolutionLabel)
        .replace(/{aspect}/g, aspect)
        .replace(/{orientation}/g, width >= height ? 'landscape' : 'portrait')
        .replace(/{aperture}/g, aperture)
        .replace(/{iso}/g, iso)
        .replace(/{shutter}/g, shutter)
        .replace(/{focal}/g, focal)
        .replace(/{lens}/g, lens)
        .replace(/{format}/g, info.format || '');

      return output.replace(/_{2,}/g, '_').replace(/^_|_$/g, '') || input;
    } catch (err) {
      return input;
    }
  }
};
