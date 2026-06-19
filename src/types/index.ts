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

export type PackageStatus = 'active' | 'expired' | 'draft'

export interface DentalPackage {
  id: string
  status: PackageStatus
  packageInfo: PackageInfo
  restrictionRules: RestrictionRules
  exportSettings: ExportSettings
  createdAt: string
  updatedAt: string
}

export type ChangeField = 'packageInfo.name' | 'packageInfo.price' | 'restrictionRules' | 'exportSettings' | 'status' | 'other'

export interface ChangeHistoryEntry {
  id: string
  packageId: string
  packageName: string
  timestamp: string
  operator: string
  field: ChangeField
  summary: string
  snapshot: {
    packageInfo: PackageInfo
    restrictionRules: RestrictionRules
    exportSettings: ExportSettings
  }
}

export interface FrontDeskInput {
  age: number | null
  isMember: boolean
  isPregnant: boolean
  appointmentDate: string
  appointmentTime: string
}

export interface FrontDeskResult {
  packageId: string
  packageName: string
  allowed: boolean
  reasons: string[]
  customerMessage: string
}

export type ViewType = 'list' | 'editor' | 'restriction' | 'export' | 'frontdesk' | 'history'

export type OutputType = 'deskCard' | 'clinicNotice' | 'momentsPoster'

/* ===== 新增：前台报价成交单草稿 ===== */
export interface CustomerInfo {
  name: string
  phone: string
  age: number | null
  isMember: boolean
  isPregnant: boolean
  note: string
}

export interface QuoteDraft {
  id: string
  createdAt: string
  packageId: string
  packageName: string
  packageSnapshot: {
    packageInfo: PackageInfo
    restrictionRules: RestrictionRules
  }
  customer: CustomerInfo
  appointmentDate: string
  appointmentTime: string
  finalPrice: number
  restrictionSummary: string[]
  customerMessage: string
  status: 'draft' | 'confirmed' | 'printed'
}

/* ===== 新增：排期上架/下架规则 ===== */
export type ScheduleAction = 'activate' | 'deactivate'

export interface ScheduleRule {
  id: string
  packageId: string
  packageName: string
  action: ScheduleAction
  targetDate: string
  createdAt: string
  executed: boolean
}

/* ===== 新增：差异对比结构（变更记录恢复前展示） ===== */
export interface DiffEntry {
  path: string
  label: string
  oldValue: string
  newValue: string
  type: 'price' | 'rule' | 'export' | 'name' | 'other'
}

export interface DiffComparison {
  entries: DiffEntry[]
  summary: string
}

/* ===== 扩展 AppState ===== */
export interface AppState {
  packages: DentalPackage[]
  currentPackageId: string | null
  history: ChangeHistoryEntry[]
  lastSavedAt: string | null
  quoteDrafts: QuoteDraft[]
  scheduleRules: ScheduleRule[]
}
