import type {
  AnnouncementDraft as ApiAnnouncementDraft,
  AnnouncementRecord as ApiAnnouncementRecord,
} from './api'

export type { AnnouncementState } from './api'
export type { AnnouncementType } from './api'

export interface AnnouncementUserOption {
  label: string
  value: string
}

export type AnnouncementDraft = ApiAnnouncementDraft

export type AnnouncementRecord = ApiAnnouncementRecord
