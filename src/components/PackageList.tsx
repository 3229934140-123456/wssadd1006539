import { useState, useMemo } from 'react'
import { DentalPackage, PackageStatus, ViewType, ScheduleAction } from '../types'
import { statusLabel, useAppStore } from '../hooks/useAppStore'

interface Props {
  packages: DentalPackage[]
  currentPackageId: string | null
  onSelect: (id: string) => void
  onNavigate: (view: ViewType) => void
  onCreate: () => void
  onDuplicate: (id: string) => void
  onSetStatus: (id: string, status: PackageStatus) => void
}

type FilterKey = 'all' | PackageStatus

function formatDate(iso: string) {
  if (!iso) return '-'
  const d = new Date(iso)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function statusColor(s: PackageStatus) {
  if (s === 'active') return 'status-active'
  if (s === 'expired') return 'status-expired'
  return 'status-draft'
}

function daysUntil(dateStr: string): number {
  const a = new Date(dateStr)
  const b = new Date()
  a.setHours(0, 0, 0, 0)
  b.setHours(0, 0, 0, 0)
  return Math.ceil((a.getTime() - b.getTime()) / 86400000)
}

function PackageList({
  packages,
  currentPackageId,
  onSelect,
  onNavigate,
  onCreate,
  onDuplicate,
  onSetStatus,
}: Props) {
  const store = useAppStore()
  const [filter, setFilter] = useState<FilterKey>('all')
  const [search, setSearch] = useState('')
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [batchMode, setBatchMode] = useState(false)
  const [batchModal, setBatchModal] = useState(false)
  const [scheduleModal, setScheduleModal] = useState<{ open: boolean; packageId: string | null }>({ open: false, packageId: null })

  const [batchOpts, setBatchOpts] = useState({
    activityPriceDelta: 0,
    activityPricePercent: 0,
    validToExtensionDays: 0,
    setMemberOnly: false,
    applyMemberOnly: false,
  })

  const [scheduleOpts, setScheduleOpts] = useState<{
    action: ScheduleAction
    targetDate: string
  }>({ action: 'activate', targetDate: new Date(Date.now() + 86400000).toISOString().slice(0, 10) })

  const filteredPackages = packages.filter((p) => {
    if (filter !== 'all' && p.status !== filter) return false
    if (search.trim()) {
      const q = search.trim().toLowerCase()
      if (!p.packageInfo.name.toLowerCase().includes(q)) return false
    }
    return true
  })

  const filters: { key: FilterKey; label: string; count: number }[] = [
    { key: 'all', label: '全部', count: packages.length },
    { key: 'active', label: '上架中', count: packages.filter((p) => p.status === 'active').length },
    { key: 'expired', label: '已过期', count: packages.filter((p) => p.status === 'expired').length },
    { key: 'draft', label: '草稿', count: packages.filter((p) => p.status === 'draft').length },
  ]

  const pendingSchedules = useMemo(
    () => store.state.scheduleRules.filter((s) => !s.executed).sort((a, b) => a.targetDate.localeCompare(b.targetDate)),
    [store.state.scheduleRules],
  )

  const pkgPendingSchedules = (pkgId: string) =>
    pendingSchedules.filter((s) => s.packageId === pkgId)

  const toggleSelect = (id: string) => {
    setSelected((prev) => {
      const n = new Set(prev)
      if (n.has(id)) n.delete(id)
      else n.add(id)
      return n
    })
  }

  const selectAll = () => {
    if (selected.size === filteredPackages.length) {
      setSelected(new Set())
    } else {
      setSelected(new Set(filteredPackages.map((p) => p.id)))
    }
  }

  const applyBatch = () => {
    if (selected.size === 0) return
    store.batchAdjustPrice({
      packageIds: Array.from(selected),
      activityPriceDelta: batchOpts.activityPriceDelta || undefined,
      activityPricePercent: batchOpts.activityPricePercent || undefined,
      validToExtensionDays: batchOpts.validToExtensionDays || undefined,
      setMemberOnly: batchOpts.applyMemberOnly ? batchOpts.setMemberOnly : undefined,
    })
    setBatchModal(false)
    setSelected(new Set())
    setBatchMode(false)
    setBatchOpts({ activityPriceDelta: 0, activityPricePercent: 0, validToExtensionDays: 0, setMemberOnly: false, applyMemberOnly: false })
  }

  const openSchedule = (pkgId: string) => {
    setScheduleModal({ open: true, packageId: pkgId })
  }
  const closeSchedule = () => setScheduleModal({ open: false, packageId: null })

  const saveSchedule = () => {
    if (!scheduleModal.packageId) return
    store.addSchedule({
      packageId: scheduleModal.packageId,
      action: scheduleOpts.action,
      targetDate: scheduleOpts.targetDate,
    })
    closeSchedule()
  }

  return (
    <div className="package-list-page">
      {/* ===== 即将生效的排期区 ===== */}
      {pendingSchedules.length > 0 && (
        <div className="schedule-banner">
          <div className="schedule-banner-title">
            ⏰ 即将生效的排期安排（{pendingSchedules.length}）
          </div>
          <div className="schedule-banner-list">
            {pendingSchedules.slice(0, 6).map((s) => (
              <div key={s.id} className="schedule-banner-item">
                <span className={`schedule-tag schedule-${s.action}`}>
                  {s.action === 'activate' ? '🔼 上架' : '🔽 下架'}
                </span>
                <span className="schedule-pkg">{s.packageName}</span>
                <span className="schedule-date">
                  {formatDate(s.targetDate)}（{daysUntil(s.targetDate) === 0 ? '今天' : daysUntil(s.targetDate) > 0 ? `${daysUntil(s.targetDate)}天后` : `${-daysUntil(s.targetDate)}天前`}）
                </span>
                <button className="btn btn-link danger" onClick={() => store.deleteSchedule(s.id)}>取消</button>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="list-toolbar">
        <div className="toolbar-left">
          <div className="search-box">
            <span className="search-icon">🔍</span>
            <input
              type="text"
              placeholder="搜索套餐名称..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="form-input"
            />
          </div>
          <div className="filter-tabs">
            {filters.map((f) => (
              <button
                key={f.key}
                className={`filter-tab ${filter === f.key ? 'active' : ''}`}
                onClick={() => setFilter(f.key)}
              >
                {f.label}
                <span className="filter-count">{f.count}</span>
              </button>
            ))}
          </div>
        </div>
        <div className="toolbar-right">
          {batchMode ? (
            <>
              <button className="btn" onClick={() => { setBatchMode(false); setSelected(new Set()) }}>取消批量</button>
              <button
                className="btn"
                onClick={selectAll}
              >
                {selected.size === filteredPackages.length ? '取消全选' : `全选 (${filteredPackages.length})`}
              </button>
              <button
                className="btn btn-primary"
                disabled={selected.size === 0}
                onClick={() => setBatchModal(true)}
              >
                📊 批量操作（{selected.size}）
              </button>
            </>
          ) : (
            <>
              <button className="btn btn-secondary" onClick={() => setBatchMode(true)}>🔘 批量模式</button>
              <button className="btn btn-primary" onClick={onCreate}>
                <span>＋</span> 新增套餐
              </button>
            </>
          )}
        </div>
      </div>

      <div className="package-grid">
        {filteredPackages.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">📋</div>
            <p>暂无符合条件的套餐</p>
            <button className="btn btn-secondary" onClick={onCreate}>新建第一个套餐</button>
          </div>
        ) : (
          filteredPackages.map((pkg) => {
            const pending = pkgPendingSchedules(pkg.id)
            return (
              <div
                key={pkg.id}
                className={`package-card ${currentPackageId === pkg.id ? 'selected' : ''}`}
              >
                {batchMode && (
                  <div className="pkg-card-checkbox">
                    <input
                      type="checkbox"
                      checked={selected.has(pkg.id)}
                      onChange={() => toggleSelect(pkg.id)}
                      className="form-checkbox"
                    />
                  </div>
                )}
                <div className="pkg-card-header">
                  <span className={`status-badge ${statusColor(pkg.status)}`}>
                    {statusLabel(pkg.status)}
                  </span>
                  {pending.length > 0 && (
                    <div className="pkg-card-schedules">
                      {pending.map((s) => (
                        <span
                          key={s.id}
                          className={`schedule-chip schedule-${s.action}`}
                          title={`${s.action === 'activate' ? '将于' : '将于'} ${formatDate(s.targetDate)} ${s.action === 'activate' ? '自动上架' : '自动下架'}`}
                        >
                          {s.action === 'activate' ? '🔼' : '🔽'} {formatDate(s.targetDate)}
                        </span>
                      ))}
                    </div>
                  )}
                  <h3 className="pkg-title">{pkg.packageInfo.name || '未命名套餐'}</h3>
                  <p className="pkg-audience">{pkg.packageInfo.targetAudience || '适用人群未设置'}</p>
                </div>

                <div className="pkg-card-body">
                  <div className="pkg-price-row">
                    <span className="pkg-retail">
                      {pkg.packageInfo.retailPrice > 0 ? `¥${pkg.packageInfo.retailPrice}` : '—'}
                    </span>
                    <span className="pkg-activity">
                      活动价 ¥{pkg.packageInfo.activityPrice}
                    </span>
                  </div>
                  <div className="pkg-items">
                    {pkg.packageInfo.items.slice(0, 3).map((it) => (
                      <span key={it.id} className="pkg-item-chip">
                        ✓ {it.name}
                      </span>
                    ))}
                    {pkg.packageInfo.items.length > 3 && (
                      <span className="pkg-item-chip more">
                        +{pkg.packageInfo.items.length - 3} 项
                      </span>
                    )}
                    {pkg.packageInfo.items.length === 0 && (
                      <span className="pkg-empty">未添加项目</span>
                    )}
                  </div>
                  <div className="pkg-meta">
                    <div>有效期：{formatDate(pkg.packageInfo.validFrom)} ~ {formatDate(pkg.packageInfo.validTo)}</div>
                    <div>更新于：{formatDate(pkg.updatedAt)}</div>
                  </div>
                </div>

                <div className="pkg-card-actions">
                  <button
                    className="btn btn-primary btn-sm"
                    onClick={() => {
                      onSelect(pkg.id)
                      onNavigate('editor')
                    }}
                  >
                    编辑
                  </button>
                  <button className="btn btn-secondary btn-sm" onClick={() => onDuplicate(pkg.id)}>
                    复制
                  </button>
                  <button
                    className="btn btn-secondary btn-sm"
                    onClick={() => openSchedule(pkg.id)}
                    title="设置定时上架/下架"
                  >
                    ⏰ 排期
                  </button>
                  {pkg.status === 'active' ? (
                    <button
                      className="btn btn-secondary btn-sm"
                      onClick={() => onSetStatus(pkg.id, 'expired')}
                      title="设为已过期（停用）"
                    >
                      停用
                    </button>
                  ) : pkg.status === 'expired' ? (
                    <button
                      className="btn btn-secondary btn-sm"
                      onClick={() => onSetStatus(pkg.id, 'active')}
                    >
                      重新上架
                    </button>
                  ) : (
                    <button
                      className="btn btn-secondary btn-sm"
                      onClick={() => onSetStatus(pkg.id, 'active')}
                    >
                      上架
                    </button>
                  )}
                </div>
              </div>
            )
          })
        )}
      </div>

      {/* ===== 批量调价弹窗 ===== */}
      {batchModal && (
        <div className="modal-mask" onClick={() => setBatchModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>📊 批量操作（{selected.size} 个套餐）</h3>
              <button className="modal-close" onClick={() => setBatchModal(false)}>×</button>
            </div>
            <div className="modal-body">
              <div className="form-row">
                <div className="form-group flex-1">
                  <label>活动价 · 固定加减（元）</label>
                  <input
                    type="number"
                    className="form-input"
                    value={batchOpts.activityPriceDelta || ''}
                    onChange={(e) => setBatchOpts({ ...batchOpts, activityPriceDelta: Number(e.target.value) || 0 })}
                    placeholder="负数为降价，如 -10 表示减 10 元"
                  />
                </div>
                <div className="form-group flex-1">
                  <label>活动价 · 百分比调整（%）</label>
                  <input
                    type="number"
                    className="form-input"
                    value={batchOpts.activityPricePercent || ''}
                    onChange={(e) => setBatchOpts({ ...batchOpts, activityPricePercent: Number(e.target.value) || 0 })}
                    placeholder="负数为降价，如 -15 表示打 85 折"
                  />
                </div>
              </div>
              <div className="form-row">
                <div className="form-group flex-1">
                  <label>延长有效期（天）</label>
                  <input
                    type="number"
                    min={0}
                    className="form-input"
                    value={batchOpts.validToExtensionDays || ''}
                    onChange={(e) => setBatchOpts({ ...batchOpts, validToExtensionDays: Number(e.target.value) || 0 })}
                    placeholder="如 30 表示在现有基础上延长 30 天"
                  />
                </div>
                <div className="form-group flex-1">
                  <label>&nbsp;</label>
                  <label className="checkbox-label">
                    <input
                      type="checkbox"
                      className="form-checkbox"
                      checked={batchOpts.applyMemberOnly}
                      onChange={(e) => setBatchOpts({ ...batchOpts, applyMemberOnly: e.target.checked })}
                    />
                    <div className="option-content">
                      <span className="option-title">批量修改会员专享设置</span>
                    </div>
                  </label>
                  {batchOpts.applyMemberOnly && (
                    <label className="checkbox-label" style={{ marginTop: 6 }}>
                      <input
                        type="checkbox"
                        className="form-checkbox"
                        checked={batchOpts.setMemberOnly}
                        onChange={(e) => setBatchOpts({ ...batchOpts, setMemberOnly: e.target.checked })}
                      />
                      <div className="option-content">
                        <span className="option-title">设为会员专享（未勾选则取消会员专享）</span>
                      </div>
                    </label>
                  )}
                </div>
              </div>
              <div className="fd-warning small" style={{ marginTop: 12 }}>
                <strong>⚠️ 操作不可撤销提示：</strong>
                <p style={{ margin: '4px 0 0 0', fontSize: 13 }}>以上操作将应用于选中的所有套餐，并在变更记录中留下记录。建议先对单个套餐尝试后再批量。</p>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn" onClick={() => setBatchModal(false)}>取消</button>
              <button className="btn btn-primary" onClick={applyBatch}>确认批量修改</button>
            </div>
          </div>
        </div>
      )}

      {/* ===== 排期设置弹窗 ===== */}
      {scheduleModal.open && scheduleModal.packageId && (() => {
        const pkg = packages.find((p) => p.id === scheduleModal.packageId)
        if (!pkg) return null
        return (
          <div className="modal-mask" onClick={closeSchedule}>
            <div className="modal-content" onClick={(e) => e.stopPropagation()}>
              <div className="modal-header">
                <h3>⏰ 设置排期 · {pkg.packageInfo.name}</h3>
                <button className="modal-close" onClick={closeSchedule}>×</button>
              </div>
              <div className="modal-body">
                <div className="form-group">
                  <label>操作类型</label>
                  <select
                    className="form-input"
                    value={scheduleOpts.action}
                    onChange={(e) => setScheduleOpts({ ...scheduleOpts, action: e.target.value as ScheduleAction })}
                  >
                    <option value="activate">🔼 定时上架（到日期自动设为上架中）</option>
                    <option value="deactivate">🔽 定时下架（到日期自动设为已过期）</option>
                  </select>
                </div>
                <div className="form-group">
                  <label>生效日期</label>
                  <input
                    type="date"
                    className="form-input"
                    value={scheduleOpts.targetDate}
                    onChange={(e) => setScheduleOpts({ ...scheduleOpts, targetDate: e.target.value })}
                  />
                </div>
                <div className="fd-warning small" style={{ marginTop: 12 }}>
                  <p style={{ margin: 0 }}>
                    💡 系统每次进入套餐管理页会自动执行已到期的排期，无需手动触发。
                  </p>
                </div>
              </div>
              <div className="modal-footer">
                <button className="btn" onClick={closeSchedule}>取消</button>
                <button className="btn btn-primary" onClick={saveSchedule}>确认添加排期</button>
              </div>
            </div>
          </div>
        )
      })()}
    </div>
  )
}

export default PackageList
