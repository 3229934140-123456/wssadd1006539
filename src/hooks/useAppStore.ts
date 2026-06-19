import { useState, useCallback, useMemo } from 'react'
import {
  AppState,
  DentalPackage,
  PackageInfo,
  RestrictionRules,
  ExportSettings,
  ChangeHistoryEntry,
  ChangeField,
  PackageStatus,
  FrontDeskInput,
  FrontDeskResult,
} from '../types'

const STORAGE_KEY = 'dental-package-configurator-data-v2'
const MAX_HISTORY = 50
const OPERATOR = '诊所老板'

const defaultPackageInfo: PackageInfo = {
  name: '尊享洁牙抛光套餐',
  targetAudience: '成人',
  items: [
    { id: '1', name: '全口超声波洁牙' },
    { id: '2', name: '牙齿抛光' },
    { id: '3', name: '口腔检查' },
    { id: '4', name: '牙周护理指导' },
  ],
  retailPrice: 398,
  activityPrice: 198,
  validFrom: new Date(Date.now() - 86400000 * 30).toISOString().slice(0, 10),
  validTo: new Date(Date.now() + 86400000 * 335).toISOString().slice(0, 10),
  allowTransfer: true,
}

const defaultRestrictionRules: RestrictionRules = {
  childrenNotAllowed: false,
  pregnancyNeedDoctor: true,
  memberOnly: false,
  holidayNotAvailable: false,
  ageRange: { enabled: false, min: 0, max: 0 },
  timeSlot: { enabled: false, weekdaysOnly: false, startTime: '09:00', endTime: '18:00' },
  minimumConsumption: { enabled: false, amount: 0 },
  stackableDiscount: true,
  customRules: [],
}

const defaultExportSettings: ExportSettings = {
  storeName: '康美口腔诊所',
  paperSize: 'A5',
  showOriginalPrice: true,
  outputTypes: ['deskCard'],
}

function createInitialState(): AppState {
  const now = new Date().toISOString()
  const firstPkg: DentalPackage = {
    id: 'pkg-' + Date.now(),
    status: 'active',
    packageInfo: { ...defaultPackageInfo },
    restrictionRules: { ...defaultRestrictionRules },
    exportSettings: { ...defaultExportSettings },
    createdAt: now,
    updatedAt: now,
  }
  return {
    packages: [firstPkg],
    currentPackageId: firstPkg.id,
    history: [],
    lastSavedAt: now,
  }
}

function loadState(): AppState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) {
      const parsed = JSON.parse(raw) as AppState
      if (parsed && parsed.packages && Array.isArray(parsed.packages) && parsed.packages.length > 0) {
        return parsed
      }
    }
  } catch {
    // ignore
  }
  const initial = createInitialState()
  localStorage.setItem(STORAGE_KEY, JSON.stringify(initial))
  return initial
}

function saveState(state: AppState): AppState {
  const next = { ...state, lastSavedAt: new Date().toISOString() }
  localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
  return next
}

function deepClone<T>(x: T): T {
  return JSON.parse(JSON.stringify(x))
}

function detectChangeField(
  oldPkg: DentalPackage,
  newPkg: DentalPackage,
): ChangeField {
  const oi = oldPkg.packageInfo
  const ni = newPkg.packageInfo
  if (oi.name !== ni.name) return 'packageInfo.name'
  if (oi.retailPrice !== ni.retailPrice || oi.activityPrice !== ni.activityPrice) return 'packageInfo.price'
  if (JSON.stringify(oldPkg.restrictionRules) !== JSON.stringify(newPkg.restrictionRules)) return 'restrictionRules'
  if (JSON.stringify(oldPkg.exportSettings) !== JSON.stringify(newPkg.exportSettings)) return 'exportSettings'
  if (oldPkg.status !== newPkg.status) return 'status'
  return 'other'
}

function summarizeChange(
  field: ChangeField,
  oldPkg: DentalPackage,
  newPkg: DentalPackage,
): string {
  switch (field) {
    case 'packageInfo.name':
      return `套餐名称由"${oldPkg.packageInfo.name}"改为"${newPkg.packageInfo.name}"`
    case 'packageInfo.price':
      return `价格由¥${oldPkg.packageInfo.retailPrice}/¥${oldPkg.packageInfo.activityPrice}改为¥${newPkg.packageInfo.retailPrice}/¥${newPkg.packageInfo.activityPrice}`
    case 'restrictionRules':
      return '修改了收费限制规则'
    case 'exportSettings':
      return '修改了打印导出设置'
    case 'status':
      return `状态由"${statusLabel(oldPkg.status)}"改为"${statusLabel(newPkg.status)}"`
    default:
      return '更新了套餐内容'
  }
}

export function statusLabel(s: PackageStatus): string {
  if (s === 'active') return '上架中'
  if (s === 'expired') return '已过期'
  return '草稿'
}

export function formatSavedTime(isoString: string | null): string {
  if (!isoString) return '尚未保存'
  const date = new Date(isoString)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffMin = Math.floor(diffMs / 60000)

  if (diffMs < 5000) return '刚刚保存'
  if (diffMin < 1) return '刚刚保存'
  if (diffMin < 60) return `${diffMin}分钟前保存`

  const isToday = date.toDateString() === now.toDateString()
  if (isToday) {
    return `今天 ${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')} 保存`
  }

  return `${date.getMonth() + 1}月${date.getDate()}日 ${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')} 保存`
}

function isHoliday(dateStr: string): boolean {
  if (!dateStr) return false
  const d = new Date(dateStr)
  const day = d.getDay()
  return day === 0 || day === 6
}

function isWeekday(dateStr: string): boolean {
  if (!dateStr) return true
  const d = new Date(dateStr)
  const day = d.getDay()
  return day >= 1 && day <= 5
}

function timeInRange(time: string, start: string, end: string): boolean {
  if (!time || !start || !end) return true
  return time >= start && time <= end
}

export function evaluatePackage(
  pkg: DentalPackage,
  input: FrontDeskInput,
): FrontDeskResult {
  const reasons: string[] = []
  const { restrictionRules, packageInfo } = pkg
  const validFrom = packageInfo.validFrom ? new Date(packageInfo.validFrom) : null
  const validTo = packageInfo.validTo ? new Date(packageInfo.validTo) : null
  const appt = input.appointmentDate ? new Date(input.appointmentDate) : null

  if (pkg.status !== 'active') {
    reasons.push('该套餐暂未上架')
  }
  if (validFrom && appt && appt < validFrom) {
    reasons.push('套餐尚未生效')
  }
  if (validTo && appt && appt > new Date(validTo.getTime() + 86400000 - 1)) {
    reasons.push('套餐已过期')
  }
  if (restrictionRules.memberOnly && !input.isMember) {
    reasons.push('仅限会员购买')
  }
  if (restrictionRules.childrenNotAllowed && input.age !== null && input.age < 12) {
    reasons.push('儿童不可使用')
  }
  if (restrictionRules.ageRange.enabled) {
    if (input.age !== null) {
      if (restrictionRules.ageRange.min > 0 && input.age < restrictionRules.ageRange.min) {
        reasons.push(`年龄低于${restrictionRules.ageRange.min}岁`)
      }
      if (restrictionRules.ageRange.max > 0 && restrictionRules.ageRange.max < 150 && input.age > restrictionRules.ageRange.max) {
        reasons.push(`年龄高于${restrictionRules.ageRange.max}岁`)
      }
    }
  }
  if (restrictionRules.pregnancyNeedDoctor && input.isPregnant) {
    reasons.push('孕妇需先经医生确认')
  }
  if (restrictionRules.holidayNotAvailable && isHoliday(input.appointmentDate)) {
    reasons.push('节假日不可使用')
  }
  if (restrictionRules.timeSlot.enabled) {
    if (restrictionRules.timeSlot.weekdaysOnly && !isWeekday(input.appointmentDate)) {
      reasons.push('仅限工作日使用')
    }
    if (!timeInRange(input.appointmentTime, restrictionRules.timeSlot.startTime, restrictionRules.timeSlot.endTime)) {
      reasons.push(`仅限${restrictionRules.timeSlot.startTime}-${restrictionRules.timeSlot.endTime}使用`)
    }
  }

  const allowed = reasons.length === 0

  let customerMessage = ''
  if (allowed) {
    customerMessage = `您好，${packageInfo.name}目前活动价 ¥${packageInfo.activityPrice}，包含${packageInfo.items.map((x) => x.name).join('、')}，今天就可以帮您安排。`
    if (restrictionRules.minimumConsumption.enabled && restrictionRules.minimumConsumption.amount > 0) {
      customerMessage += ` 此套餐最低消费 ¥${restrictionRules.minimumConsumption.amount}。`
    }
    if (!restrictionRules.stackableDiscount) {
      customerMessage += ` 此套餐不与其他优惠同享。`
    }
  } else {
    customerMessage = `不好意思，${packageInfo.name}暂时不适合这位顾客，原因是：${reasons[0]}。我推荐您看看其他套餐。`
  }

  return {
    packageId: pkg.id,
    packageName: packageInfo.name,
    allowed,
    reasons,
    customerMessage,
  }
}

export function useAppStore() {
  const [state, setState] = useState<AppState>(() => loadState())

  const currentPackage = useMemo(() => {
    return state.packages.find((p) => p.id === state.currentPackageId) || state.packages[0] || null
  }, [state.packages, state.currentPackageId])

  const persist = useCallback((mutator: (prev: AppState) => AppState) => {
    setState((prev) => {
      const next = mutator(prev)
      return saveState(next)
    })
  }, [])

  const selectPackage = useCallback((id: string) => {
    persist((prev) => ({ ...prev, currentPackageId: id }))
  }, [persist])

  const addHistoryEntry = useCallback((
    prevState: AppState,
    oldPkg: DentalPackage,
    newPkg: DentalPackage,
    field?: ChangeField,
    customSummary?: string,
  ): ChangeHistoryEntry[] => {
    const f = field ?? detectChangeField(oldPkg, newPkg)
    const summary = customSummary ?? summarizeChange(f, oldPkg, newPkg)
    const entry: ChangeHistoryEntry = {
      id: 'h-' + Date.now() + '-' + Math.floor(Math.random() * 1000),
      packageId: oldPkg.id,
      packageName: oldPkg.packageInfo.name,
      timestamp: new Date().toISOString(),
      operator: OPERATOR,
      field: f,
      summary,
      snapshot: {
        packageInfo: deepClone(oldPkg.packageInfo),
        restrictionRules: deepClone(oldPkg.restrictionRules),
        exportSettings: deepClone(oldPkg.exportSettings),
      },
    }
    const history = [entry, ...prevState.history].slice(0, MAX_HISTORY)
    return history
  }, [])

  const updatePackage = useCallback((id: string, updater: (pkg: DentalPackage) => DentalPackage) => {
    persist((prev) => {
      const idx = prev.packages.findIndex((p) => p.id === id)
      if (idx === -1) return prev
      const oldPkg = prev.packages[idx]
      const newPkg = updater({ ...oldPkg, updatedAt: new Date().toISOString() })
      const packages = [...prev.packages]
      packages[idx] = newPkg
      const history = addHistoryEntry(prev, oldPkg, newPkg)
      return { ...prev, packages, history }
    })
  }, [persist, addHistoryEntry])

  const setPackageInfo = useCallback((pkgInfo: PackageInfo) => {
    if (!currentPackage) return
    updatePackage(currentPackage.id, (p) => ({ ...p, packageInfo: pkgInfo }))
  }, [currentPackage, updatePackage])

  const setRestrictionRules = useCallback((rules: RestrictionRules) => {
    if (!currentPackage) return
    updatePackage(currentPackage.id, (p) => ({ ...p, restrictionRules: rules }))
  }, [currentPackage, updatePackage])

  const setExportSettings = useCallback((settings: ExportSettings) => {
    if (!currentPackage) return
    updatePackage(currentPackage.id, (p) => ({ ...p, exportSettings: settings }))
  }, [currentPackage, updatePackage])

  const createPackage = useCallback((base?: DentalPackage) => {
    persist((prev) => {
      const now = new Date().toISOString()
      const newPkg: DentalPackage = base
        ? {
            ...deepClone(base),
            id: 'pkg-' + Date.now(),
            status: 'draft',
            packageInfo: { ...deepClone(base.packageInfo), name: base.packageInfo.name + ' (副本)' },
            createdAt: now,
            updatedAt: now,
          }
        : {
            id: 'pkg-' + Date.now(),
            status: 'draft',
            packageInfo: {
              name: '新洁牙套餐',
              targetAudience: '',
              items: [],
              retailPrice: 0,
              activityPrice: 0,
              validFrom: new Date().toISOString().slice(0, 10),
              validTo: '',
              allowTransfer: false,
            },
            restrictionRules: deepClone(defaultRestrictionRules),
            exportSettings: deepClone(defaultExportSettings),
            createdAt: now,
            updatedAt: now,
          }
      const packages = [newPkg, ...prev.packages]
      return { ...prev, packages, currentPackageId: newPkg.id }
    })
  }, [persist])

  const duplicatePackage = useCallback((id: string) => {
    persist((prev) => {
      const base = prev.packages.find((p) => p.id === id)
      if (!base) return prev
      const now = new Date().toISOString()
      const newPkg: DentalPackage = {
        ...deepClone(base),
        id: 'pkg-' + Date.now(),
        status: 'draft',
        packageInfo: { ...base.packageInfo, name: base.packageInfo.name + ' (副本)' },
        createdAt: now,
        updatedAt: now,
      }
      return { ...prev, packages: [newPkg, ...prev.packages], currentPackageId: newPkg.id }
    })
  }, [persist])

  const setPackageStatus = useCallback((id: string, status: PackageStatus) => {
    updatePackage(id, (p) => ({ ...p, status }))
  }, [updatePackage])

  const restoreFromHistory = useCallback((entryId: string) => {
    persist((prev) => {
      const entry = prev.history.find((h) => h.id === entryId)
      if (!entry) return prev
      const idx = prev.packages.findIndex((p) => p.id === entry.packageId)
      if (idx === -1) return prev
      const oldPkg = prev.packages[idx]
      const newPkg: DentalPackage = {
        ...oldPkg,
        packageInfo: deepClone(entry.snapshot.packageInfo),
        restrictionRules: deepClone(entry.snapshot.restrictionRules),
        exportSettings: deepClone(entry.snapshot.exportSettings),
        updatedAt: new Date().toISOString(),
      }
      const packages = [...prev.packages]
      packages[idx] = newPkg
      const restoreEntry: ChangeHistoryEntry = {
        id: 'h-' + Date.now() + '-' + Math.floor(Math.random() * 1000),
        packageId: entry.packageId,
        packageName: entry.packageName,
        timestamp: new Date().toISOString(),
        operator: OPERATOR,
        field: 'other',
        summary: `恢复至版本：${entry.summary}`,
        snapshot: {
          packageInfo: deepClone(oldPkg.packageInfo),
          restrictionRules: deepClone(oldPkg.restrictionRules),
          exportSettings: deepClone(oldPkg.exportSettings),
        },
      }
      const history = [restoreEntry, ...prev.history].slice(0, MAX_HISTORY)
      return { ...prev, packages, history, currentPackageId: entry.packageId }
    })
  }, [persist])

  return {
    state,
    currentPackage,
    savedTimeDisplay: formatSavedTime(state.lastSavedAt),
    selectPackage,
    setPackageInfo,
    setRestrictionRules,
    setExportSettings,
    createPackage,
    duplicatePackage,
    setPackageStatus,
    restoreFromHistory,
    evaluatePackage,
  }
}
