import { statSync } from 'node:fs';

/**
 * Check if a file exists
 * @param file - The file to check
 * @returns True if the file exists, false otherwise
 */
export function isFile(file: string): boolean {
  try {
    return statSync(file).isFile();
  } catch (error) {
    if (error instanceof Error && 'code' in error && error.code === 'ENOENT') {
      return false;
    }
    throw error;
  }
}
