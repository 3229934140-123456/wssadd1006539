export interface PackageItem {
  id: string
  name: string
}

export interface PackageInfo {
  name: string
  targetAudience: string
  items: PackageItem[]
  retailPrice: number
  activityPrice: number
  validFrom: string
  validTo: string
  allowTransfer: boolean
}

export interface AgeRange {
  enabled: boolean
  min: number
  max: number
}

export interface TimeSlot {
  enabled: boolean
  weekdaysOnly: boolean
  startTime: string
  endTime: string
}

export interface MinimumConsumption {
  enabled: boolean
  amount: number
}

export interface RestrictionRules {
  childrenNotAllowed: boolean
  pregnancyNeedDoctor: boolean
  memberOnly: boolean
  holidayNotAvailable: boolean
  ageRange: AgeRange
  timeSlot: TimeSlot
  minimumConsumption: MinimumConsumption
  stackableDiscount: boolean
  customRules: string[]
}

export interface ExportSettings {
  storeName: string
  paperSize: 'A4' | 'A5' | 'postcard'
  showOriginalPrice: boolean
  outputTypes: ('deskCard' | 'clinicNotice' | 'momentsPoster')[]
}

export interface AppData {
  packageInfo: PackageInfo
  restrictionRules: RestrictionRules
  exportSettings: ExportSettings
  lastSavedAt: string | null
}

export type TabType = 'editor' | 'restriction' | 'export'

export type OutputType = 'deskCard' | 'clinicNotice' | 'momentsPoster'
