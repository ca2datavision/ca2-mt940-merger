import * as mt940 from 'mt940-js';
import { validateFileContent } from '../validation';
import { decodeText } from '../utils/encoding';
import { validateTextFile } from '../utils/safety';

function sanitizeErrorMessage(error: unknown, fallback: string): string {
  if (error instanceof Error) {
    return error.message
      .replace(/[A-Za-z]:\\[^\s:]+/g, '[path]')
      .replace(/\/(?:home|usr|var|tmp|etc|data|opt)[^\s:]+/gi, '[path]')
      .replace(/\/[^\s:]*\/[^\s:]*\.[a-z]{1,4}/gi, '[path]');
  }
  return fallback;
}

export interface ParseRequest {
  type: 'parse';
  buffer: ArrayBuffer;
  fileName: string;
  fileId: string;
}

export interface ParseResponse {
  type: 'result';
  fileId: string;
  statements: unknown[];
  validationIssues: unknown[];
  validationStatements: unknown[];
}

export interface ParseError {
  type: 'error';
  fileId: string;
  message: string;
}

export interface ParseProgress {
  type: 'progress';
  fileId: string;
  stage: 'validating' | 'parsing' | 'complete';
}

export type WorkerMessage = ParseRequest;
export type WorkerResponse = ParseResponse | ParseError | ParseProgress;

self.onmessage = async (event: MessageEvent<WorkerMessage>) => {
  const { type, buffer, fileName, fileId } = event.data;

  if (type !== 'parse') return;

  try {
    self.postMessage({ type: 'progress', fileId, stage: 'validating' } as ParseProgress);

    const data = new Uint8Array(buffer);
    validateTextFile(data);

    self.postMessage({ type: 'progress', fileId, stage: 'parsing' } as ParseProgress);

    const textContent = decodeText(data);
    const validationResult = validateFileContent(textContent, fileId, fileName);
    const statements = await mt940.read(buffer);

    self.postMessage({ type: 'progress', fileId, stage: 'complete' } as ParseProgress);

    self.postMessage({
      type: 'result',
      fileId,
      statements,
      validationIssues: validationResult.issues,
      validationStatements: validationResult.statements,
    } as ParseResponse);
  } catch (error) {
    self.postMessage({
      type: 'error',
      fileId,
      message: sanitizeErrorMessage(error, 'Failed to parse file'),
    } as ParseError);
  }
};
