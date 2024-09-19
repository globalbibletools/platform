"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.query = query;
exports.transaction = transaction;
exports.close = close;
const pg_1 = __importDefault(require("pg"));
const { Pool } = pg_1.default;
const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
    throw new Error('DATABASE_URL env var missing');
}
const pool = new Pool({ connectionString, max: 20 });
function _query(client, text, params) {
    return __awaiter(this, void 0, void 0, function* () {
        const start = performance.now();
        const result = yield client.query(text, params);
        const duration = performance.now() - start;
        if (process.env.LOG_DB_QUERIES === 'true') {
            console.log(`QUERY ${duration.toFixed(0)}ms ${text.replaceAll(/\s+/g, ' ').slice(0, 100)} params: ${JSON.stringify(params)}`);
        }
        return result;
    });
}
function query(text, params) {
    return __awaiter(this, void 0, void 0, function* () {
        return _query(pool, text, params);
    });
}
function transaction(tx) {
    return __awaiter(this, void 0, void 0, function* () {
        const client = yield pool.connect();
        try {
            yield client.query('BEGIN');
            const result = yield tx((text, params) => _query(client, text, params));
            yield client.query('COMMIT');
            return result;
        }
        catch (error) {
            yield client.query('ROLLBACK');
            throw error;
        }
        finally {
            client.release();
        }
    });
}
function close() {
    return __awaiter(this, void 0, void 0, function* () {
        yield pool.end();
    });
}
