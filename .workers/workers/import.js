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
Object.defineProperty(exports, "__esModule", { value: true });
require("./worker-env");
const db_1 = require("../shared/db");
const languageCode = process.argv[2];
if (!languageCode) {
    throw new Error('usage: node ./import.js [languageCode]');
}
function run(languageCode) {
    return __awaiter(this, void 0, void 0, function* () {
        const jobQuery = yield (0, db_1.query)(`
        SELECT j."languageId", 'Spanish' AS "importLanguage", j."userId" FROM "LanguageImportJob" AS j
        JOIN "Language" AS l ON l.id = j."languageId"
        WHERE l.code = $1
        `, [languageCode]);
        const job = jobQuery.rows[0];
        if (!job) {
            throw new Error(`no import job for language ${languageCode}`);
        }
        console.log(`importing ${languageCode}`);
    });
}
run(languageCode)
    .catch(console.error)
    .finally(() => __awaiter(void 0, void 0, void 0, function* () { return yield (0, db_1.close)(); }));
