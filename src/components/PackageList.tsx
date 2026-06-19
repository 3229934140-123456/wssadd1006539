import { useState } from 'react'
import { DentalPackage, PackageStatus, ViewType } from '../types'
import { statusLabel } from '../hooks/useAppStore'

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

function PackageList({
  packages,
  currentPackageId,
  onSelect,
  onNavigate,
  onCreate,
  onDuplicate,
  onSetStatus,
}: Props) {
  const [filter, setFilter] = useState<FilterKey>('all')
  const [search, setSearch] = useState('')

  const filteredPackages = packages.filter((p) => {
    if (filter !== 'all' && p.status !== filter) return false
    if (search.trim()) {
      const q = search.trim().toLowerCase()
      if (!p.packageInfo.name.toLowerCase().includes(q)) return false
    }
    return true
  })

  const formatDate = (iso: string) => {
    if (!iso) return '-'
    const d = new Date(iso)
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
  }

  const statusColor = (s: PackageStatus) => {
    if (s === 'active') return 'status-active'
    if (s === 'expired') return 'status-expired'
    return 'status-draft'
  }

  const filters: { key: FilterKey; label: string; count: number }[] = [
    { key: 'all', label: '全部', count: packages.length },
    { key: 'active', label: '上架中', count: packages.filter((p) => p.status === 'active').length },
    { key: 'expired', label: '已过期', count: packages.filter((p) => p.status === 'expired').length },
    { key: 'draft', label: '草稿', count: packages.filter((p) => p.status === 'draft').length },
  ]

  return (
    <div className="package-list-page">
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
          <button className="btn btn-primary" onClick={onCreate}>
            <span>＋</span> 新增套餐
          </button>
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
          filteredPackages.map((pkg) => (
            <div
              key={pkg.id}
              className={`package-card ${currentPackageId === pkg.id ? 'selected' : ''}`}
            >
              <div className="pkg-card-header">
                <span className={`status-badge ${statusColor(pkg.status)}`}>
                  {statusLabel(pkg.status)}
                </span>
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
          ))
        )}
      </div>
    </div>
  )
}

export default PackageList
