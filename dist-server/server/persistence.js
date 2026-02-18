import { mkdirSync, readFileSync, renameSync, writeFileSync, existsSync, readdirSync } from 'node:fs';
import path from 'node:path';
export class PersistenceError extends Error {
    causeError;
    constructor(message, causeError) {
        super(message);
        this.causeError = causeError;
        this.name = 'PersistenceError';
    }
}
export class JsonFileStore {
    baseDir;
    constructor(baseDir) {
        this.baseDir = baseDir;
        mkdirSync(this.baseDir, { recursive: true });
    }
    resolve(fileName) {
        return path.join(this.baseDir, fileName);
    }
    readArrayFile(fileName) {
        const fullPath = this.resolve(fileName);
        if (!existsSync(fullPath))
            return [];
        try {
            const raw = readFileSync(fullPath, 'utf8');
            if (!raw.trim())
                return [];
            const parsed = JSON.parse(raw);
            return Array.isArray(parsed) ? parsed : [];
        }
        catch (error) {
            throw new PersistenceError(`No se pudo leer ${fileName}`, error);
        }
    }
    readObjectFile(fileName, fallback) {
        const fullPath = this.resolve(fileName);
        if (!existsSync(fullPath))
            return fallback;
        try {
            const raw = readFileSync(fullPath, 'utf8');
            if (!raw.trim())
                return fallback;
            const parsed = JSON.parse(raw);
            if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed))
                return fallback;
            return parsed;
        }
        catch (error) {
            throw new PersistenceError(`No se pudo leer ${fileName}`, error);
        }
    }
    writeArrayFileAtomic(fileName, data) {
        const fullPath = this.resolve(fileName);
        const tmpPath = `${fullPath}.tmp`;
        try {
            const serialized = JSON.stringify(data, null, 2);
            writeFileSync(tmpPath, serialized, 'utf8');
            renameSync(tmpPath, fullPath);
        }
        catch (error) {
            throw new PersistenceError(`No se pudo escribir ${fileName}`, error);
        }
    }
    writeObjectFileAtomic(fileName, data) {
        const fullPath = this.resolve(fileName);
        const tmpPath = `${fullPath}.tmp`;
        try {
            const serialized = JSON.stringify(data, null, 2);
            writeFileSync(tmpPath, serialized, 'utf8');
            renameSync(tmpPath, fullPath);
        }
        catch (error) {
            throw new PersistenceError(`No se pudo escribir ${fileName}`, error);
        }
    }
    listFilesByPrefix(prefix) {
        try {
            return readdirSync(this.baseDir)
                .filter((name) => name.startsWith(prefix) && name.endsWith('.json'))
                .sort();
        }
        catch {
            return [];
        }
    }
}
