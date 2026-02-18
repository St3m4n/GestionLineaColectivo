import path from 'node:path';
import { fileURLToPath } from 'node:url';
import Fastify from 'fastify';
import fastifyStatic from '@fastify/static';
import { JsonFileStore, PersistenceError } from './server/persistence.js';
import { SalesService } from './server/salesService.js';
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const APP_ROOT = path.resolve(__dirname, '..');
const PORT = Number(process.env.PORT ?? 3000);
const HOST = process.env.HOST ?? '127.0.0.1';
const DIST_DIR = path.join(APP_ROOT, 'dist');
const DATA_DIR = path.join(APP_ROOT, 'data');
const app = Fastify({ logger: false });
const store = new JsonFileStore(DATA_DIR);
const sales = new SalesService(store);
app.register(fastifyStatic, {
    root: DIST_DIR,
    wildcard: false,
    index: false,
});
app.get('/api/health', () => ({ ok: true }));
app.get('/api/vehiculos', () => {
    return sales.getVehiculos();
});
app.get('/api/state', (_request, reply) => {
    try {
        return reply.send(sales.getFullState());
    }
    catch (error) {
        if (error instanceof PersistenceError) {
            return reply.code(500).send({ error: error.message });
        }
        return reply.code(500).send({ error: 'Error al cargar estado' });
    }
});
app.put('/api/state', (request, reply) => {
    try {
        const body = request.body;
        if (!body || typeof body !== 'object') {
            return reply.code(400).send({ error: 'Payload inválido' });
        }
        sales.saveFullState(body);
        return reply.send({ ok: true });
    }
    catch (error) {
        if (error instanceof PersistenceError) {
            return reply.code(500).send({ error: error.message });
        }
        return reply.code(500).send({ error: 'Error al guardar estado' });
    }
});
app.get('/api/ventas/:year/:month', (request, reply) => {
    const params = request.params;
    const ventas = sales.getVentasShard(params.year, params.month);
    return reply.send(ventas);
});
app.post('/api/ventas/tarjeta', (request, reply) => {
    try {
        const body = request.body;
        if (!body || typeof body.vehiculoId !== 'number') {
            return reply.code(400).send({ error: 'Payload inválido' });
        }
        const result = sales.venderTarjeta(body);
        if (!result.success) {
            return reply.code(409).send(result);
        }
        return reply.code(201).send(result);
    }
    catch (error) {
        if (error instanceof PersistenceError) {
            return reply.code(500).send({ error: error.message });
        }
        if (error instanceof Error) {
            return reply.code(409).send({ error: error.message });
        }
        return reply.code(500).send({ error: 'Error inesperado' });
    }
});
app.get('/', (_request, reply) => {
    return reply.sendFile('index.html');
});
app.get('/*', (_request, reply) => {
    return reply.sendFile('index.html');
});
app
    .listen({ port: PORT, host: HOST })
    .then(() => {
    // eslint-disable-next-line no-console
    console.log(`Server running on http://${HOST}:${PORT}`);
})
    .catch((err) => {
    // eslint-disable-next-line no-console
    console.error(err);
    process.exit(1);
});
