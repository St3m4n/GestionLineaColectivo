import { mkdirSync, readFileSync, renameSync, writeFileSync, existsSync, readdirSync } from 'node:fs';
import path from 'node:path';

export class PersistenceError extends Error {
  constructor(message: string, public readonly causeError?: unknown) {
    super(message);
    this.name = 'PersistenceError';
  }
}

export class JsonFileStore {
  constructor(private readonly baseDir: string) {
    mkdirSync(this.baseDir, { recursive: true });
  }

  resolve(fileName: string): string {
    return path.join(this.baseDir, fileName);
  }

  readArrayFile<T>(fileName: string): T[] {
    const fullPath = this.resolve(fileName);
    if (!existsSync(fullPath)) return [];

    try {
      const raw = readFileSync(fullPath, 'utf8');
      if (!raw.trim()) return [];
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? (parsed as T[]) : [];
    } catch (error) {
      throw new PersistenceError(`No se pudo leer ${fileName}`, error);
    }
  }

  readObjectFile<T extends object>(fileName: string, fallback: T): T {
    const fullPath = this.resolve(fileName);
    if (!existsSync(fullPath)) return fallback;

    try {
      const raw = readFileSync(fullPath, 'utf8');
      if (!raw.trim()) return fallback;
      const parsed = JSON.parse(raw);
      if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return fallback;
      return parsed as T;
    } catch (error) {
      throw new PersistenceError(`No se pudo leer ${fileName}`, error);
    }
  }

  writeArrayFileAtomic<T>(fileName: string, data: T[]): void {
    const fullPath = this.resolve(fileName);
    const tmpPath = `${fullPath}.tmp`;

    try {
      const serialized = JSON.stringify(data, null, 2);
      writeFileSync(tmpPath, serialized, 'utf8');
      renameSync(tmpPath, fullPath);
    } catch (error) {
      throw new PersistenceError(`No se pudo escribir ${fileName}`, error);
    }
  }

  writeObjectFileAtomic<T extends object>(fileName: string, data: T): void {
    const fullPath = this.resolve(fileName);
    const tmpPath = `${fullPath}.tmp`;

    try {
      const serialized = JSON.stringify(data, null, 2);
      writeFileSync(tmpPath, serialized, 'utf8');
      renameSync(tmpPath, fullPath);
    } catch (error) {
      throw new PersistenceError(`No se pudo escribir ${fileName}`, error);
    }
  }

  listFilesByPrefix(prefix: string): string[] {
    try {
      return readdirSync(this.baseDir)
        .filter((name) => name.startsWith(prefix) && name.endsWith('.json'))
        .sort();
    } catch {
      return [];
    }
  }
}