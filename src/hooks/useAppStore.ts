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
  QuoteDraft,
  CustomerInfo,
  ScheduleRule,
  ScheduleAction,
  DiffComparison,
  DiffEntry,
} from '../types'

const STORAGE_KEY = 'dental-package-configurator-data-v2'
const MAX_HISTORY = 50
const MAX_QUOTE_DRAFTS = 100
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
    quoteDrafts: [],
    scheduleRules: [],
  }
}

function loadState(): AppState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) {
      const parsed = JSON.parse(raw) as AppState
      if (parsed && parsed.packages && Array.isArray(parsed.packages) && parsed.packages.length > 0) {
        return {
          ...parsed,
          quoteDrafts: parsed.quoteDrafts || [],
          scheduleRules: parsed.scheduleRules || [],
        }
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

  /* ========= 差异对比（恢复前展示） ========= */
  const computeDiff = useCallback((entryId: string): DiffComparison | null => {
    const entry = state.history.find((h) => h.id === entryId)
    if (!entry) return null
    const pkg = state.packages.find((p) => p.id === entry.packageId)
    if (!pkg) return null
    const entries: DiffEntry[] = []
    const push = (path: string, label: string, ov: any, nv: any, type: DiffEntry['type']) => {
      const os = ov === undefined || ov === null ? '(空)' : typeof ov === 'boolean' ? (ov ? '是' : '否') : Array.isArray(ov) ? JSON.stringify(ov) : String(ov)
      const ns = nv === undefined || nv === null ? '(空)' : typeof nv === 'boolean' ? (nv ? '是' : '否') : Array.isArray(nv) ? JSON.stringify(nv) : String(nv)
      if (os !== ns) entries.push({ path, label, oldValue: os, newValue: ns, type })
    }
    push('packageInfo.name', '套餐名称', pkg.packageInfo.name, entry.snapshot.packageInfo.name, 'name')
    push('packageInfo.retailPrice', '门市价', pkg.packageInfo.retailPrice, entry.snapshot.packageInfo.retailPrice, 'price')
    push('packageInfo.activityPrice', '活动价', pkg.packageInfo.activityPrice, entry.snapshot.packageInfo.activityPrice, 'price')
    push('packageInfo.validFrom', '有效期开始', pkg.packageInfo.validFrom, entry.snapshot.packageInfo.validFrom, 'price')
    push('packageInfo.validTo', '有效期结束', pkg.packageInfo.validTo, entry.snapshot.packageInfo.validTo, 'price')
    push('packageInfo.allowTransfer', '允许转赠', pkg.packageInfo.allowTransfer, entry.snapshot.packageInfo.allowTransfer, 'other')
    const r = pkg.restrictionRules
    const s = entry.snapshot.restrictionRules
    push('rules.memberOnly', '会员专享', r.memberOnly, s.memberOnly, 'rule')
    push('rules.childrenNotAllowed', '儿童不可选', r.childrenNotAllowed, s.childrenNotAllowed, 'rule')
    push('rules.pregnancyNeedDoctor', '孕期需医生确认', r.pregnancyNeedDoctor, s.pregnancyNeedDoctor, 'rule')
    push('rules.holidayNotAvailable', '节假日不可用', r.holidayNotAvailable, s.holidayNotAvailable, 'rule')
    if (JSON.stringify(r.ageRange) !== JSON.stringify(s.ageRange)) {
      entries.push({ path: 'rules.ageRange', label: '年龄限制', oldValue: JSON.stringify(r.ageRange), newValue: JSON.stringify(s.ageRange), type: 'rule' })
    }
    if (JSON.stringify(r.timeSlot) !== JSON.stringify(s.timeSlot)) {
      entries.push({ path: 'rules.timeSlot', label: '时段限制', oldValue: JSON.stringify(r.timeSlot), newValue: JSON.stringify(s.timeSlot), type: 'rule' })
    }
    if (JSON.stringify(r.minimumConsumption) !== JSON.stringify(s.minimumConsumption)) {
      entries.push({ path: 'rules.minimumConsumption', label: '最低消费', oldValue: JSON.stringify(r.minimumConsumption), newValue: JSON.stringify(s.minimumConsumption), type: 'rule' })
    }
    push('rules.stackableDiscount', '可叠加优惠', r.stackableDiscount, s.stackableDiscount, 'rule')
    if (JSON.stringify(r.customRules) !== JSON.stringify(s.customRules)) {
      entries.push({ path: 'rules.customRules', label: '自定义规则', oldValue: JSON.stringify(r.customRules), newValue: JSON.stringify(s.customRules), type: 'rule' })
    }
    const e = pkg.exportSettings
    const es = entry.snapshot.exportSettings
    push('export.storeName', '门店名称', e.storeName, es.storeName, 'export')
    push('export.paperSize', '纸张大小', e.paperSize, es.paperSize, 'export')
    push('export.showOriginalPrice', '显示原价', e.showOriginalPrice, es.showOriginalPrice, 'export')
    if (JSON.stringify(e.outputTypes) !== JSON.stringify(es.outputTypes)) {
      entries.push({ path: 'export.outputTypes', label: '导出物料', oldValue: JSON.stringify(e.outputTypes), newValue: JSON.stringify(es.outputTypes), type: 'export' })
    }
    return {
      entries,
      summary: entries.length === 0 ? '当前与该版本无差异' : `共 ${entries.length} 处差异`,
    }
  }, [state.history, state.packages])

  /* ========= 报价草稿 CRUD ========= */
  const createQuoteDraft = useCallback((opts: {
    packageId: string
    customer: CustomerInfo
    appointmentDate: string
    appointmentTime: string
    restrictionSummary: string[]
    customerMessage: string
  }) => {
    persist((prev) => {
      const pkg = prev.packages.find((p) => p.id === opts.packageId)
      if (!pkg) return prev
      const draft: QuoteDraft = {
        id: 'q-' + Date.now() + '-' + Math.floor(Math.random() * 1000),
        createdAt: new Date().toISOString(),
        packageId: pkg.id,
        packageName: pkg.packageInfo.name,
        packageSnapshot: {
          packageInfo: deepClone(pkg.packageInfo),
          restrictionRules: deepClone(pkg.restrictionRules),
        },
        customer: { ...opts.customer },
        appointmentDate: opts.appointmentDate,
        appointmentTime: opts.appointmentTime,
        finalPrice: pkg.packageInfo.activityPrice,
        restrictionSummary: [...opts.restrictionSummary],
        customerMessage: opts.customerMessage,
        status: 'draft',
      }
      return { ...prev, quoteDrafts: [draft, ...prev.quoteDrafts].slice(0, MAX_QUOTE_DRAFTS) }
    })
  }, [persist])

  const updateQuoteDraft = useCallback((id: string, updater: (d: QuoteDraft) => QuoteDraft) => {
    persist((prev) => {
      const idx = prev.quoteDrafts.findIndex((d) => d.id === id)
      if (idx === -1) return prev
      const drafts = [...prev.quoteDrafts]
      drafts[idx] = updater(drafts[idx])
      return { ...prev, quoteDrafts: drafts }
    })
  }, [persist])

  const deleteQuoteDraft = useCallback((id: string) => {
    persist((prev) => ({ ...prev, quoteDrafts: prev.quoteDrafts.filter((d) => d.id !== id) }))
  }, [persist])

  /* ========= 批量调价 ========= */
  const batchAdjustPrice = useCallback((opts: {
    packageIds: string[]
    activityPriceDelta?: number
    activityPricePercent?: number
    validToExtensionDays?: number
    setMemberOnly?: boolean
  }) => {
    persist((prev) => {
      let packages = [...prev.packages]
      let history = prev.history
      for (const id of opts.packageIds) {
        const idx = packages.findIndex((p) => p.id === id)
        if (idx === -1) continue
        const oldPkg = packages[idx]
        const np = deepClone(oldPkg) as DentalPackage
        let changed = false
        if (opts.activityPricePercent !== undefined && opts.activityPricePercent !== 0) {
          np.packageInfo.activityPrice = Math.max(0, Math.round(np.packageInfo.activityPrice * (1 + opts.activityPricePercent / 100)))
          changed = true
        }
        if (opts.activityPriceDelta !== undefined && opts.activityPriceDelta !== 0) {
          np.packageInfo.activityPrice = Math.max(0, np.packageInfo.activityPrice + opts.activityPriceDelta)
          changed = true
        }
        if (opts.validToExtensionDays !== undefined && opts.validToExtensionDays > 0 && np.packageInfo.validTo) {
          const base = new Date(np.packageInfo.validTo)
          base.setDate(base.getDate() + opts.validToExtensionDays)
          np.packageInfo.validTo = base.toISOString().slice(0, 10)
          changed = true
        }
        if (opts.setMemberOnly !== undefined) {
          np.restrictionRules.memberOnly = opts.setMemberOnly
          changed = true
        }
        if (!changed) continue
        np.updatedAt = new Date().toISOString()
        packages[idx] = np
        history = addHistoryEntry({ ...prev, history }, oldPkg, np, 'packageInfo.price', `批量调价：${np.packageInfo.name} 活动价调整为 ¥${np.packageInfo.activityPrice}`)
      }
      return { ...prev, packages, history }
    })
  }, [persist, addHistoryEntry])

  /* ========= 排期上架/下架 ========= */
  const addSchedule = useCallback((opts: { packageId: string; action: ScheduleAction; targetDate: string }) => {
    persist((prev) => {
      const pkg = prev.packages.find((p) => p.id === opts.packageId)
      if (!pkg) return prev
      const rule: ScheduleRule = {
        id: 's-' + Date.now() + '-' + Math.floor(Math.random() * 1000),
        packageId: pkg.id,
        packageName: pkg.packageInfo.name,
        action: opts.action,
        targetDate: opts.targetDate,
        createdAt: new Date().toISOString(),
        executed: false,
      }
      return { ...prev, scheduleRules: [rule, ...prev.scheduleRules] }
    })
  }, [persist])

  const deleteSchedule = useCallback((id: string) => {
    persist((prev) => ({ ...prev, scheduleRules: prev.scheduleRules.filter((s) => s.id !== id) }))
  }, [persist])

  const executeDueSchedules = useCallback(() => {
    persist((prev) => {
      const today = new Date().toISOString().slice(0, 10)
      let packages = [...prev.packages]
      let history = prev.history
      const scheduleRules: ScheduleRule[] = []
      for (const s of prev.scheduleRules) {
        if (s.executed || s.targetDate > today) {
          scheduleRules.push(s)
          continue
        }
        const idx = packages.findIndex((p) => p.id === s.packageId)
        if (idx === -1) {
          scheduleRules.push({ ...s, executed: true })
          continue
        }
        const oldPkg = packages[idx]
        const newStatus: PackageStatus = s.action === 'activate' ? 'active' : 'expired'
        const np: DentalPackage = { ...oldPkg, status: newStatus, updatedAt: new Date().toISOString() }
        packages[idx] = np
        history = addHistoryEntry({ ...prev, history }, oldPkg, np, 'status', `排期执行：${s.action === 'activate' ? '自动上架' : '自动下架'}`)
        scheduleRules.push({ ...s, executed: true })
      }
      return { ...prev, packages, scheduleRules, history }
    })
  }, [persist, addHistoryEntry])

  /* ========= 前台报价增强：先校验字段，status!=active 也要说明原因 ========= */
  const evaluatePackageWithReasons = useCallback((
    pkg: DentalPackage,
    input: FrontDeskInput,
  ): FrontDeskResult => {
    const reasons: string[] = []
    const { restrictionRules, packageInfo } = pkg
    const validFrom = packageInfo.validFrom ? new Date(packageInfo.validFrom) : null
    const validTo = packageInfo.validTo ? new Date(packageInfo.validTo) : null
    const appt = input.appointmentDate ? new Date(input.appointmentDate) : null

    if (pkg.status === 'draft') {
      reasons.push('套餐为草稿，暂未上架')
    } else if (pkg.status === 'expired') {
      reasons.push('套餐已过期')
    } else if (pkg.status !== 'active') {
      reasons.push('套餐已停用')
    }
    if (validFrom && appt && appt < validFrom) {
      reasons.push('套餐尚未生效')
    }
    if (validTo && appt && appt > new Date(validTo.getTime() + 86400000 - 1)) {
      reasons.push('套餐已过有效期')
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
  }, [])

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
    computeDiff,
    evaluatePackageWithReasons,
    createQuoteDraft,
    updateQuoteDraft,
    deleteQuoteDraft,
    batchAdjustPrice,
    addSchedule,
    deleteSchedule,
    executeDueSchedules,
  }
}
