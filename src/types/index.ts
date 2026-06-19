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

export interface RestrictionRules {
  childrenNotAllowed: boolean
  pregnancyNeedDoctor: boolean
  memberOnly: boolean
  holidayNotAvailable: boolean
  customRules: string[]
}

export interface ExportSettings {
  storeName: string
  paperSize: 'A4' | 'A5' | 'postcard'
  showOriginalPrice: boolean
  outputType: 'deskCard' | 'clinicNotice' | 'momentsPoster'
}

export type TabType = 'editor' | 'restriction' | 'export'
