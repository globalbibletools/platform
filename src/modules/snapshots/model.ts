import { Readable, Transform } from "stream";

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

  constructor(private generateId: () => Id) {}

  mapId(fromId: Id): Id {
    let mappedId = this.#map.get(fromId);
    if (!mappedId) {
      mappedId = this.generateId();
      this.#map.set(fromId, mappedId);
    }
    return mappedId;
  }
}

type FieldMapper = (record: any) => any;

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
