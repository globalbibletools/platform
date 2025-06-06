import { google } from "googleapis";
import { Job } from "@/shared/jobs/model";
import { REPORTING_JOB_TYPES } from "./jobTypes";
import { logger } from "@/logging";
import reportingQueryService from "../ReportingQueryService";
import pino from "pino";

interface Key {
  client_email: string;
  private_key: string;
  project_id: string;
}

const key =
  process.env.GOOGLE_TRANSLATE_CREDENTIALS ?
    (JSON.parse(
      Buffer.from(process.env.GOOGLE_TRANSLATE_CREDENTIALS, "base64").toString(
        "utf8",
      ),
    ) as Key)
  : undefined;

const auth = new google.auth.GoogleAuth({
  credentials: key,
  scopes: ["https://www.googleapis.com/auth/spreadsheets"],
});

const CONTRIBUTIONS_SHEET = "'[Raw] Contributions'";
const USERS_SHEET = "'[Raw] Users'";
const LANGUAGES_SHEET = "'[Raw] Languages'";
const BOOKS_SHEET = "'[Raw] Books'";
const PROGRESS_SNAPSHOTS_SHEET = "'[Raw] Progress Snapshots'";

const sheets = google.sheets({
  version: "v4",
  auth,
});

const ANALYTICS_SPREADSHEET_ID = process.env.ANALYTICS_SPREADSHEET_ID;

export async function exportAnalyticsJob(job: Job<void>) {
  const jobLogger = logger.child({
    job: {
      id: job.id,
      type: job.type,
    },
  });

  if (job.type !== REPORTING_JOB_TYPES.EXPORT_ANALYTICS) {
    jobLogger.error(
      `received job type ${job.type}, expected ${REPORTING_JOB_TYPES.EXPORT_ANALYTICS}`,
    );
    throw new Error(
      `Expected job type ${REPORTING_JOB_TYPES.EXPORT_ANALYTICS}, but received ${job.type}`,
    );
  }

  await Promise.all([
    updateContributionsSheet(jobLogger),
    updateUsersSheet(jobLogger),
    updateLanguagesSheet(jobLogger),
    updateBooksSheet(jobLogger),
    updateProgressSnapshots(jobLogger),
  ]);
}

async function updateContributionsSheet(logger: pino.Logger) {
  const contributionRecords = await reportingQueryService.findContributions();
  const data = contributionRecords.map((record) => [
    record.id,
    record.week.toISOString(),
    record.userId,
    record.languageId,
    record.approvedCount,
    record.revokedCount,
    record.editedApprovedCount,
    record.editedUnapprovedCount,
  ]);
  data.unshift([
    "ID",
    "Week",
    "User ID",
    "Language ID",
    "Approved",
    "Revoked",
    "Edited (Approved)",
    "Edited (Unapproved)",
  ]);
  await sheets.spreadsheets.values.update({
    spreadsheetId: ANALYTICS_SPREADSHEET_ID,
    range: `${CONTRIBUTIONS_SHEET}!A1`,
    valueInputOption: "RAW",
    requestBody: {
      values: data,
    },
  });
  logger.info(`Updated ${contributionRecords.length} contribution records`);
}

async function updateUsersSheet(logger: pino.Logger) {
  const users = await reportingQueryService.findUsers();
  const data = users.map((user) => [
    user.id,
    user.name,
    user.email,
    user.status,
  ]);
  data.unshift(["ID", "Name", "Email", "Status"]);
  await sheets.spreadsheets.values.update({
    spreadsheetId: ANALYTICS_SPREADSHEET_ID,
    range: `${USERS_SHEET}!A1`,
    valueInputOption: "RAW",
    requestBody: {
      values: data,
    },
  });
  logger.info(`Updated ${users.length} users`);
}

async function updateLanguagesSheet(logger: pino.Logger) {
  const languages = await reportingQueryService.findLanguages();
  const data = languages.map((lang) => [lang.id, lang.name, lang.code]);
  data.unshift(["ID", "Name", "Code"]);
  await sheets.spreadsheets.values.update({
    spreadsheetId: ANALYTICS_SPREADSHEET_ID,
    range: `${LANGUAGES_SHEET}!A1`,
    valueInputOption: "RAW",
    requestBody: {
      values: data,
    },
  });
  logger.info(`Updated ${languages.length} languages`);
}

async function updateBooksSheet(logger: pino.Logger) {
  const books = await reportingQueryService.findBooks();
  const data = books.map((book) => [book.id, book.name, book.wordCount]);
  data.unshift(["ID", "Name", "Word Count"]);
  await sheets.spreadsheets.values.update({
    spreadsheetId: ANALYTICS_SPREADSHEET_ID,
    range: `${BOOKS_SHEET}!A1`,
    valueInputOption: "RAW",
    requestBody: {
      values: data,
    },
  });
  logger.info(`Updated ${books.length} books`);
}

async function updateProgressSnapshots(logger: pino.Logger) {
  const snapshots = await reportingQueryService.findProgressSnapshots();
  const data = snapshots.map((snapshot) => [
    snapshot.id,
    snapshot.week,
    snapshot.languageId,
    snapshot.bookId,
    snapshot.userId ?? "",
    snapshot.approvedCount,
    snapshot.unapprovedCount,
  ]);
  data.unshift([
    "ID",
    "Week",
    "Language ID",
    "Book ID",
    "User ID",
    "Approved",
    "Unapproved",
  ]);
  await sheets.spreadsheets.values.update({
    spreadsheetId: ANALYTICS_SPREADSHEET_ID,
    range: `${PROGRESS_SNAPSHOTS_SHEET}!A1`,
    valueInputOption: "RAW",
    requestBody: {
      values: data,
    },
  });
  logger.info(`Updated ${snapshots.length} progress snapshots`);
}
