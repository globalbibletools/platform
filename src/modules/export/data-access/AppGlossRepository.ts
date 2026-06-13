import SQLite, { Database, Statement } from "better-sqlite3";
import { Writable } from "stream";

interface TextTable {
  _id: number;
  text: string;
}

interface VersesTable {
  _id: number;
  text: number;
}

export class AppGlossRepository {
  private db: Database;

  constructor() {
    this.db = new SQLite(":memory:", {
      nativeBinding:
        "node_modules/better-sqlite3/build/Release/better_sqlite3.node",
    });

    this.db.pragma("journal_mode = WAL");

    this.db
      .prepare(
        `create table text (
        _id integer primary key,
        text text not null
      )`,
      )
      .run();
    this.db
      .prepare(
        `create table verses (
        _id integer primary key,
        text integer
      )`,
      )
      .run();
  }

  getVerseWritableStream() {
    return new SqliteWritableStream(
      this.db,
      "insert into verses (_id, text) values (?, ?)",
      (stmt, row: VersesTable) => stmt.run(row._id, row.text),
    );
  }

  getTextWritableStream() {
    return new SqliteWritableStream(
      this.db,
      "insert into text (_id, text) values (?, ?)",
      (stmt, row: TextTable) => stmt.run(row._id, row.text),
    );
  }

  serialize() {
    return this.db.serialize();
  }
}

class SqliteWritableStream<T> extends Writable {
  readonly insertStmt: Statement;

  constructor(
    readonly database: Database,
    readonly statement: string,
    readonly run: (statement: Statement, row: T) => void,
  ) {
    super({ objectMode: true });

    this.insertStmt = database.prepare(statement);

    database.prepare("begin").run();
  }

  override _write(
    row: T,
    _encoding: BufferEncoding,
    callback: (error?: Error | null) => void,
  ) {
    try {
      this.run(this.insertStmt, row);
      callback();
    } catch (error) {
      callback(error instanceof Error ? error : new Error(String(error)));
    }
  }

  override _final(callback: (error?: Error | null) => void) {
    try {
      this.database.prepare("commit").run();
      callback();
    } catch (error) {
      callback(error instanceof Error ? error : new Error(String(error)));
    }
  }
}
