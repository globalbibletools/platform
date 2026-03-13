import { TrackingEvent } from "@/modules/reporting";
import {
  GlossApprovalMethodRaw,
  GlossSourceRaw,
  GlossStateRaw,
} from "../types";
import Gloss from "./Gloss";

export interface GlossEvent {
  phraseId: number;
  languageId: string;
  userId: string;
  wordIds: string[];
  timestamp: Date;
  prevGloss: string;
  prevState: GlossStateRaw;
  newGloss: string;
  newState: GlossStateRaw;
  approvalMethod?: GlossApprovalMethodRaw;
}

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
  private glossEventsList: GlossEvent[] = [];

  constructor(public props: PhraseProps) {}

  static create({
    wordIds,
    userId,
    languageId,
  }: {
    wordIds: string[];
    userId: string;
    languageId: string;
  }): Phrase {
    const phrase = new Phrase({
      id: 0,
      languageId,
      wordIds,
      createdAt: new Date(),
      createdBy: userId,
      deletedAt: null,
      deletedBy: null,
      gloss: null,
    });

    return phrase;
  }

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
    const prevGloss = this.props.gloss?.props.gloss ?? "";
    const prevState = this.props.gloss?.props.state ?? GlossStateRaw.Unapproved;
    const wasUnapproved = this.props.gloss?.state !== GlossStateRaw.Approved;

    const newGloss = gloss ?? "";
    const newState = state;

    this.props.gloss = new Gloss({
      gloss,
      state,
      source: GlossSourceRaw.User,
      updatedAt: new Date(),
      updatedBy: userId,
    });

    if (newGloss !== prevGloss || newState !== prevState) {
      const glossEvent: GlossEvent = {
        phraseId: this.props.id,
        languageId: this.props.languageId,
        userId,
        wordIds: this.props.wordIds,
        timestamp: this.props.gloss.props.updatedAt,
        prevGloss,
        prevState,
        newGloss,
        newState,
      };

      if (
        wasUnapproved &&
        newState === GlossStateRaw.Approved &&
        approvalMethod
      ) {
        glossEvent.approvalMethod = approvalMethod;
      }

      this.glossEventsList.push(glossEvent);
    }

    if (wasUnapproved && state === GlossStateRaw.Approved && approvalMethod) {
      this.trackingEvents.push({
        type: "approved_gloss",
        languageId: this.props.languageId,
        userId,
        phraseId: this.props.id,
        method: approvalMethod,
      });
    }
  }

  delete(userId: string) {
    if (this.props.gloss?.props.state === GlossStateRaw.Approved) {
      const prevGloss = this.props.gloss.props.gloss ?? "";

      this.glossEventsList.push({
        phraseId: this.props.id,
        languageId: this.props.languageId,
        userId,
        wordIds: this.props.wordIds,
        timestamp: new Date(),
        prevGloss,
        prevState: GlossStateRaw.Approved,
        newGloss: prevGloss,
        newState: GlossStateRaw.Unapproved,
      });
    }

    this.props.deletedAt = new Date();
    this.props.deletedBy = userId;
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

  get glossEvents(): readonly GlossEvent[] {
    return this.glossEventsList;
  }
}
