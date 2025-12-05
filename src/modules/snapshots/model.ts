import { query } from "@/db";
import { Readable, Transform, Writable } from "stream";

export interface Snapshot {
  id: string;
  languageId: string;
  timestamp: Date;
}

export type WriteConfig =
  | {
      type: "restore";
    }
  | {
      type: "import";
      languageCode: string;
      pluginMap: Record<string, SnapshotObjectPlugin>;
    };

export interface SnapshotObjectPlugin<Id = string> {
  resourceName: string;
  dependencies?: string[];
  read?(languageId: string): Promise<Readable>;
  clear?(languageId: string): Promise<void>;
  write?(stream: Readable, config?: WriteConfig): Promise<void>;
  idMapper?: IdMapper<Id>;
}

export class IdMapper<Id = string> {
  #map: Map<Id, Id> = new Map();

  constructor(private generateId: (fromId: Id) => Id) {}

  mapId(fromId: Id): Id {
    let mappedId = this.#map.get(fromId);
    if (!mappedId) {
      mappedId = this.generateId(fromId);
      this.#map.set(fromId, mappedId);
    }
    return mappedId;
  }
}

type FieldMapper = (record: any) => any;

export class PostgresBulkInsertStream extends Writable {
  #rowBuffer: Array<Array<any>> = [];

  constructor(
    private sqlStatement: string,
    private fieldMappers: FieldMapper[],
  ) {
    super({
      objectMode: true,
    });
  }

  override async _write(
    record: any,
    _encoding: string,
    cb: (err?: Error) => void,
  ) {
    const row = [];
    for (let i = 0; i < this.fieldMappers.length; i++) {
      row.push(this.fieldMappers[i](record));
    }

    this.#rowBuffer.push(row);

    if (this.#rowBuffer.length >= 10) {
      await this.flushBuffer();
    }

    cb();
  }

  async flushBuffer() {
    await query(
      `${this.sqlStatement} ${this.#rowBuffer.reduce((params, row, i) => {
        if (params.length > 0) {
          params += ", ";
        }

        params += "(";

        for (let j = 0; j < row.length; j++) {
          params += `$${i + j}`;

          if (j < row.length - 1) {
            params += ", ";
          }
        }

        params += ")";

        return params;
      }, "")}`,
      this.#rowBuffer.reduce((params, row) => params.concat(row), []),
    );
  }
}

export class PostgresTextFormatTransform extends Transform {
  constructor(private fieldMappers: FieldMapper[]) {
    super({
      writableObjectMode: true,
    });
  }

  override _transform(
    record: any,
    _encoding: string,
    cb: (err?: Error) => void,
  ) {
    for (let i = 0; i < this.fieldMappers.length; i++) {
      this.push(this.fieldMappers[i](record) ?? "\\N");

      if (i < this.fieldMappers.length - 1) {
        this.push("\t");
      }
    }

    this.push("\n");

    cb();
  }

  override _flush(cb: (err?: Error) => void) {
    this.push("\\.\n");
    cb();
  }
}
