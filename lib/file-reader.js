// lib/file-reader.js — Extract text from uploaded files
// Supports: .txt, .md, .docx, .rtf, .pdf

class FileTextExtractor {

  static SUPPORTED = ['.txt', '.md', '.markdown', '.docx', '.rtf', '.pdf'];

  static canHandle(filename) {
    const ext = '.' + filename.split('.').pop().toLowerCase();
    return this.SUPPORTED.includes(ext);
  }

  static async extract(file) {
    const ext = '.' + file.name.split('.').pop().toLowerCase();
    switch (ext) {
      case '.txt':
      case '.md':
      case '.markdown':
        return await file.text();
      case '.docx':
        return await this._extractDocx(file);
      case '.rtf':
        return await this._extractRtf(file);
      case '.pdf':
        return await this._extractPdf(file);
      default:
        throw new Error(`Unsupported file type: ${ext}`);
    }
  }

  // ── PDF: pdf.js → extract all page text ──────────────────
  static async _extractPdf(file) {
    if (!window.pdfjsLib) throw new Error('PDF.js not loaded');

    // Point worker at the matching CDN build so pdf.js doesn't try to
    // spawn a worker from a blob URL (blocked by extension CSP)
    pdfjsLib.GlobalWorkerOptions.workerSrc =
      chrome.runtime.getURL('lib/pdf.worker.min.js');

    const buffer = await file.arrayBuffer();
    const pdf = await pdfjsLib.getDocument({ data: buffer }).promise;

    const pages = [];
    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const content = await page.getTextContent();
      const pageText = content.items
        .map(item => item.str)
        .join(' ')
        .replace(/ {2,}/g, ' ')
        .trim();
      if (pageText) pages.push(pageText);
    }

    return pages.join('\n\n').trim();
  }

  // ── DOCX: zip → word/document.xml → strip XML ────────────
  static async _extractDocx(file) {
    const buffer = await file.arrayBuffer();
    const entries = this._readZipEntries(buffer);

    const docEntry = entries.find(e => e.name === 'word/document.xml');
    if (!docEntry) throw new Error('Invalid .docx — no document.xml found');

    const xmlBytes = await this._inflateEntry(docEntry, buffer);
    const xml = new TextDecoder().decode(xmlBytes);

    return this._docxXmlToText(xml);
  }

  // Minimal ZIP reader — parses Central Directory to find entries
  static _readZipEntries(buffer) {
    const view = new DataView(buffer);
    const bytes = new Uint8Array(buffer);

    // Find End of Central Directory (search backward from end)
    let eocdOffset = -1;
    for (let i = bytes.length - 22; i >= 0; i--) {
      if (view.getUint32(i, true) === 0x06054b50) {
        eocdOffset = i;
        break;
      }
    }
    if (eocdOffset === -1) throw new Error('Not a valid zip file');

    const cdOffset = view.getUint32(eocdOffset + 16, true);
    const cdCount = view.getUint16(eocdOffset + 10, true);

    const entries = [];
    let pos = cdOffset;

    for (let i = 0; i < cdCount; i++) {
      if (view.getUint32(pos, true) !== 0x02014b50) break;

      const method = view.getUint16(pos + 10, true);
      const compSize = view.getUint32(pos + 20, true);
      const uncompSize = view.getUint32(pos + 24, true);
      const nameLen = view.getUint16(pos + 28, true);
      const extraLen = view.getUint16(pos + 30, true);
      const commentLen = view.getUint16(pos + 32, true);
      const localOffset = view.getUint32(pos + 42, true);

      const name = new TextDecoder().decode(bytes.slice(pos + 46, pos + 46 + nameLen));

      entries.push({ name, method, compSize, uncompSize, localOffset });
      pos += 46 + nameLen + extraLen + commentLen;
    }

    return entries;
  }

  // Read local file header and inflate/store the data
  static async _inflateEntry(entry, buffer) {
    const view = new DataView(buffer);
    const lo = entry.localOffset;

    // Local file header: skip to data
    const nameLen = view.getUint16(lo + 26, true);
    const extraLen = view.getUint16(lo + 28, true);
    const dataStart = lo + 30 + nameLen + extraLen;
    const compressed = new Uint8Array(buffer, dataStart, entry.compSize);

    if (entry.method === 0) {
      // Stored (no compression)
      return compressed;
    }

    if (entry.method === 8) {
      // Deflate — use DecompressionStream (Chrome 80+)
      return this._decompressDeflateRaw(compressed);
    }

    throw new Error(`Unsupported zip compression method: ${entry.method}`);
  }

  static async _decompressDeflateRaw(compressed) {
    // DecompressionStream expects a proper stream; zip uses raw deflate
    const ds = new DecompressionStream('deflate-raw');
    const writer = ds.writable.getWriter();
    const reader = ds.readable.getReader();

    const writePromise = writer.write(compressed).then(() => writer.close());

    const chunks = [];
    let totalLen = 0;
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      chunks.push(value);
      totalLen += value.length;
    }

    await writePromise;

    const result = new Uint8Array(totalLen);
    let offset = 0;
    for (const chunk of chunks) {
      result.set(chunk, offset);
      offset += chunk.length;
    }
    return result;
  }

  // Parse OOXML document.xml → plain text
  static _docxXmlToText(xml) {
    const lines = [];
    // Split on paragraph boundaries
    const paragraphs = xml.split(/<\/w:p>/);

    for (const para of paragraphs) {
      // Extract all <w:t> text runs
      const texts = [];
      const regex = /<w:t[^>]*>([^<]*)<\/w:t>/g;
      let match;
      while ((match = regex.exec(para)) !== null) {
        texts.push(match[1]);
      }
      if (texts.length > 0) {
        lines.push(texts.join(''));
      }
    }

    // Decode XML entities
    return lines.join('\n')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&apos;/g, "'")
      .replace(/\n{3,}/g, '\n\n')
      .trim();
  }

  // ── RTF: brace-depth parser → plain text ──────────────
  static async _extractRtf(file) {
    const raw = await file.text();
    return this._rtfToText(raw);
  }

  static _rtfToText(rtf) {
    const output = [];
    let i = 0;
    let depth = 0;
    let skipDepth = -1;  // If >= 0, skip all content until back to this depth

    // Groups to skip entirely (destinations that contain no visible text)
    const SKIP_DESTINATIONS = /^\\(fonttbl|colortbl|stylesheet|info|\*|pict|object|datafield|themedata|blipuid|panose|falt|latentstyles|datastore|xmlnstbl|mmathPr)/;

    while (i < rtf.length) {
      const ch = rtf[i];

      if (ch === '{') {
        depth++;
        i++;

        // Check if this group is a destination to skip
        if (skipDepth < 0) {
          // Peek ahead for the control word
          const peek = rtf.substring(i, i + 40);
          if (SKIP_DESTINATIONS.test(peek)) {
            skipDepth = depth;
          }
        }
        continue;
      }

      if (ch === '}') {
        if (depth === skipDepth) {
          skipDepth = -1;  // Done skipping
        }
        depth--;
        i++;
        continue;
      }

      // If inside a skipped group, consume but ignore
      if (skipDepth >= 0) {
        i++;
        continue;
      }

      // Backslash: control word or escape
      if (ch === '\\') {
        i++;
        if (i >= rtf.length) break;

        const next = rtf[i];

        // Escaped literal characters
        if (next === '{' || next === '}' || next === '\\') {
          output.push(next);
          i++;
          continue;
        }

        // Hex escape: \'xx (Windows-1252 code page)
        if (next === "'") {
          const hex = rtf.substring(i + 1, i + 3);
          const code = parseInt(hex, 16);
          if (!isNaN(code)) {
            output.push(this._cp1252ToChar(code));
          }
          i += 3;
          continue;
        }

        // Unicode escape: \uNNNNN followed by one replacement char
        if (next === 'u' && /\d/.test(rtf[i + 1] || '')) {
          const numMatch = rtf.substring(i + 1).match(/^(-?\d+)/);
          if (numMatch) {
            let code = parseInt(numMatch[1], 10);
            if (code < 0) code += 65536;
            output.push(String.fromCharCode(code));
            i += 1 + numMatch[1].length;
            // Skip the replacement character (usually '?')
            if (i < rtf.length && rtf[i] !== '\\' && rtf[i] !== '{' && rtf[i] !== '}') i++;
            continue;
          }
        }

        // Control word: \keyword[-]N? (followed by optional space delimiter)
        const cwMatch = rtf.substring(i).match(/^([a-z]+)(-?\d+)?\s?/i);
        if (cwMatch) {
          const word = cwMatch[1];
          i += cwMatch[0].length;

          // Translate known control words to text
          switch (word) {
            case 'par':  output.push('\n'); break;
            case 'line': output.push('\n'); break;
            case 'tab':  output.push('\t'); break;
            case 'lquote': case 'rquote': output.push("'"); break;
            case 'ldblquote': case 'rdblquote': output.push('"'); break;
            case 'emdash': output.push('\u2014'); break;
            case 'endash': output.push('\u2013'); break;
            case 'bullet': output.push('\u2022'); break;
            case 'nbspace': case 'emspace': case 'enspace': output.push(' '); break;
            // All other control words: silently skip
          }
          continue;
        }

        // Any other non-alpha char after \ is an escaped literal (\%, \~, \-, etc.)
        if (!/[a-z]/i.test(next)) {
          output.push(next);
          i++;
          continue;
        }

        // Unknown escape — skip character
        i++;
        continue;
      }

      // Plain text character
      if (ch === '\r' || ch === '\n') {
        // RTF line breaks are cosmetic, not semantic
        i++;
        continue;
      }

      output.push(ch);
      i++;
    }

    return output.join('')
      .replace(/\n{3,}/g, '\n\n')
      .trim();
  }

  // Windows-1252 bytes 0x80–0x9F map to specific Unicode chars (not C1 controls)
  static _CP1252_MAP = {
    0x80: '\u20AC', 0x82: '\u201A', 0x83: '\u0192', 0x84: '\u201E',
    0x85: '\u2026', 0x86: '\u2020', 0x87: '\u2021', 0x88: '\u02C6',
    0x89: '\u2030', 0x8A: '\u0160', 0x8B: '\u2039', 0x8C: '\u0152',
    0x8E: '\u017D', 0x91: '\u2018', 0x92: '\u2019', 0x93: '\u201C',
    0x94: '\u201D', 0x95: '\u2022', 0x96: '\u2013', 0x97: '\u2014',
    0x98: '\u02DC', 0x99: '\u2122', 0x9A: '\u0161', 0x9B: '\u203A',
    0x9C: '\u0153', 0x9E: '\u017E', 0x9F: '\u0178',
  };

  static _cp1252ToChar(code) {
    return this._CP1252_MAP[code] || String.fromCharCode(code);
  }
}
