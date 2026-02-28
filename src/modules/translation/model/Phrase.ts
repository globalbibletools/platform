import { ulid } from "@/shared/ulid";
import { TrackingEvent } from "@/modules/reporting/model";
import {
  GlossApprovalMethodRaw,
  GlossSourceRaw,
  GlossStateRaw,
} from "../types";
import Gloss from "./Gloss";

export interface PhraseProps {
  id: number;
  languageId: string;
  wordIds: string[];
  createdAt: Date;
  createdBy: string | null;
  deletedAt: Date | null;
  deletedBy: string | null;
  gloss: Gloss | null;
}

export default class Phrase {
  private trackingEvents: TrackingEvent[] = [];

  constructor(private props: PhraseProps) {}

  updateGloss({
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
    const wasUnapproved = this.props.gloss?.state !== GlossStateRaw.Approved;

    this.props.gloss = new Gloss({
      gloss,
      state,
      source: GlossSourceRaw.User,
      updatedAt: new Date(),
      updatedBy: userId,
    });

    if (wasUnapproved && state === GlossStateRaw.Approved && approvalMethod) {
      this.trackingEvents.push({
        id: ulid(),
        type: "approved_gloss",
        createdAt: new Date(),
        languageId: this.props.languageId,
        userId,
        phraseId: this.props.id,
        method: approvalMethod,
      });
    }
  }

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

  get gloss() {
    return this.props.gloss;
  }

  get events(): readonly TrackingEvent[] {
    return this.trackingEvents;
  }
}
