import { ulid } from "@/shared/ulid";
import { TrackingEvent } from "@/modules/reporting/model";
import Phrase from "./Phrase";
import {
  GlossApprovalMethodRaw,
  GlossSourceRaw,
  GlossStateRaw,
} from "../types";

export interface GlossProps {
  phrase: Phrase;
  gloss: string | null;
  state: GlossStateRaw;
  source: GlossSourceRaw | null;
  updatedAt: Date;
  updatedBy: string | null;
}

export default class Gloss {
  private trackingEvents: TrackingEvent[] = [];

  constructor(public props: GlossProps) {}

  static create({
    phrase,
    gloss,
    state,
    userId,
    approvalMethod,
  }: {
    phrase: Phrase;
    gloss: string | null;
    state: GlossStateRaw;
    userId: string;
    approvalMethod?: GlossApprovalMethodRaw;
  }): Gloss {
    const instance = new Gloss({
      phrase,
      gloss: null,
      state: GlossStateRaw.Unapproved,
      source: GlossSourceRaw.User,
      updatedAt: new Date(),
      updatedBy: null,
    });

    instance.update({
      gloss,
      state,
      userId,
      approvalMethod,
    });

    return instance;
  }

  update({
    gloss,
    state,
    userId,
    approvalMethod,
  }: {
    gloss: string | null;
    state: GlossStateRaw;
    userId: string;
    approvalMethod?: GlossApprovalMethodRaw;
  }): void {
    const wasUnapproved = this.props.state === GlossStateRaw.Unapproved;

    this.props.gloss = gloss;
    this.props.state = state;
    this.props.source = GlossSourceRaw.User;
    this.props.updatedAt = new Date();
    this.props.updatedBy = userId;

    if (wasUnapproved && state === GlossStateRaw.Approved && approvalMethod) {
      this.trackingEvents.push({
        id: ulid(),
        type: "approved_gloss",
        createdAt: new Date(),
        languageId: this.props.phrase.languageId,
        userId,
        phraseId: this.props.phrase.id,
        method: approvalMethod,
      });
    }
  }

  get phrase() {
    return this.props.phrase;
  }

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

  get events(): readonly TrackingEvent[] {
    return this.trackingEvents;
  }
}
