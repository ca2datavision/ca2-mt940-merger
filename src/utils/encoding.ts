export type SupportedEncoding = 'utf-8' | 'windows-1250' | 'iso-8859-1';

export interface DecodedText {
  text: string;
  encoding: SupportedEncoding;
  hasBOM: boolean;
}

const UTF8_BOM = [0xEF, 0xBB, 0xBF];

function hasUtf8BOM(data: Uint8Array): boolean {
  return data.length >= 3 &&
    data[0] === UTF8_BOM[0] &&
    data[1] === UTF8_BOM[1] &&
    data[2] === UTF8_BOM[2];
}

function tryDecode(data: Uint8Array, encoding: string): string | null {
  try {
    const decoder = new TextDecoder(encoding, { fatal: true });
    return decoder.decode(data);
  } catch {
    return null;
  }
}

export function detectAndDecode(data: Uint8Array): DecodedText {
  const hasBOM = hasUtf8BOM(data);
  const contentStart = hasBOM ? 3 : 0;
  const content = contentStart > 0 ? data.slice(contentStart) : data;

  // Try UTF-8 first (with or without BOM)
  const utf8Text = tryDecode(content, 'utf-8');
  if (utf8Text !== null) {
    return { text: utf8Text, encoding: 'utf-8', hasBOM };
  }

  // Try Windows-1250 (Central/Eastern European)
  const win1250Text = tryDecode(content, 'windows-1250');
  if (win1250Text !== null) {
    return { text: win1250Text, encoding: 'windows-1250', hasBOM: false };
  }

  // Fallback to ISO-8859-1 (always succeeds for any byte sequence)
  const decoder = new TextDecoder('iso-8859-1');
  return { text: decoder.decode(content), encoding: 'iso-8859-1', hasBOM: false };
}

export function decodeText(data: Uint8Array): string {
  return detectAndDecode(data).text;
}
