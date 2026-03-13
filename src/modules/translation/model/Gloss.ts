import { GlossSourceRaw, GlossStateRaw } from "../types";

export interface GlossProps {
  gloss: string | null;
  state: GlossStateRaw;
  source: GlossSourceRaw | null;
  updatedAt: Date;
  updatedBy: string | null;
}

export default class Gloss {
  constructor(public props: GlossProps) {}

  get gloss() {
    return this.props.gloss;
  }

  get state() {
    return this.props.state;
  }

  get source() {
    return this.props.source;
  }

  get updatedAt() {
    return this.props.updatedAt;
  }

  get updatedBy() {
    return this.props.updatedBy;
  }
}
