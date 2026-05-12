import * as mt940 from 'mt940-js';
import { validateFileContent } from '../validation';
import { decodeText } from '../utils/encoding';
import { validateTextFile } from '../utils/safety';
import type { ParseResponse, ParseError, ParseProgress } from './parseWorker';

export interface ParseResult {
  statements: unknown[];
  validationIssues: unknown[];
  validationStatements: unknown[];
}

type ProgressCallback = (stage: 'validating' | 'parsing' | 'complete') => void;

let worker: Worker | null = null;
let workerSupported: boolean | null = null;

function getWorker(): Worker | null {
  if (workerSupported === false) return null;

  if (worker) return worker;

  try {
    worker = new Worker(new URL('./parseWorker.ts', import.meta.url), { type: 'module' });
    workerSupported = true;
    return worker;
  } catch {
    workerSupported = false;
    return null;
  }
}

async function parseInMainThread(
  buffer: ArrayBuffer,
  fileName: string,
  fileId: string,
  onProgress?: ProgressCallback
): Promise<ParseResult> {
  onProgress?.('validating');

  const data = new Uint8Array(buffer);
  validateTextFile(data);

  onProgress?.('parsing');

  const textContent = decodeText(data);
  const validationResult = validateFileContent(textContent, fileId, fileName);
  const statements = await mt940.read(buffer);

  onProgress?.('complete');

  return {
    statements,
    validationIssues: validationResult.issues,
    validationStatements: validationResult.statements,
  };
}

function parseInWorker(
  buffer: ArrayBuffer,
  fileName: string,
  fileId: string,
  onProgress?: ProgressCallback
): Promise<ParseResult> {
  return new Promise((resolve, reject) => {
    const w = getWorker();
    if (!w) {
      reject(new Error('Worker not available'));
      return;
    }

    const handler = (event: MessageEvent<ParseResponse | ParseError | ParseProgress>) => {
      const msg = event.data;
      if (msg.fileId !== fileId) return;

      if (msg.type === 'progress') {
        onProgress?.(msg.stage);
      } else if (msg.type === 'result') {
        w.removeEventListener('message', handler);
        resolve({
          statements: msg.statements,
          validationIssues: msg.validationIssues,
          validationStatements: msg.validationStatements,
        });
      } else if (msg.type === 'error') {
        w.removeEventListener('message', handler);
        reject(new Error(msg.message));
      }
    };

    w.addEventListener('message', handler);
    w.postMessage({ type: 'parse', buffer, fileName, fileId }, [buffer]);
  });
}

export async function parseFile(
  buffer: ArrayBuffer,
  fileName: string,
  fileId: string,
  onProgress?: ProgressCallback
): Promise<ParseResult> {
  const bufferCopy = buffer.slice(0);

  const w = getWorker();
  if (w) {
    try {
      return await parseInWorker(bufferCopy, fileName, fileId, onProgress);
    } catch {
      return parseInMainThread(buffer, fileName, fileId, onProgress);
    }
  }

  return parseInMainThread(buffer, fileName, fileId, onProgress);
}

export function isWorkerSupported(): boolean {
  if (workerSupported !== null) return workerSupported;
  getWorker();
  return workerSupported === true;
}

export function terminateWorker(): void {
  if (worker) {
    worker.terminate();
    worker = null;
  }
}
