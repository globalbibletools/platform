export interface PhraseProps {
  id: number;
  languageId: string;
  wordIds: string[];
  createdAt: Date;
  createdBy: string | null;
  deletedAt: Date | null;
  deletedBy: string | null;
}

export default class Phrase {
  constructor(private props: PhraseProps) {}

  get id() {
    return this.props.id;
  }

  get languageId() {
    return this.props.languageId;
  }

  get wordIds() {
    return this.props.wordIds;
  }

  get createdAt() {
    return this.props.createdAt;
  }

  get createdBy() {
    return this.props.createdBy;
  }

  get deletedAt() {
    return this.props.deletedAt;
  }

  get deletedBy() {
    return this.props.deletedBy;
  }
}
