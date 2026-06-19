import { useState, useEffect } from 'react'
import { PackageInfo, RestrictionRules, ExportSettings, TabType } from './types'
import { usePersistentState, getLastSavedTime, formatSavedTime } from './hooks/usePersistentState'
import PackageEditor from './components/PackageEditor'
import RestrictionPanel from './components/RestrictionPanel'
import ExportPanel from './components/ExportPanel'
import './styles/App.css'

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
  validFrom: '2025-01-01',
  validTo: '2025-12-31',
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

function App() {
  const [activeTab, setActiveTab] = useState<TabType>('editor')
  const [packageInfo, setPackageInfo] = usePersistentState<PackageInfo>('packageInfo', defaultPackageInfo)
  const [restrictionRules, setRestrictionRules] = usePersistentState<RestrictionRules>('restrictionRules', defaultRestrictionRules)
  const [exportSettings, setExportSettings] = usePersistentState<ExportSettings>('exportSettings', defaultExportSettings)
  const [savedTimeDisplay, setSavedTimeDisplay] = useState(formatSavedTime(getLastSavedTime()))

  useEffect(() => {
    const timer = setInterval(() => {
      setSavedTimeDisplay(formatSavedTime(getLastSavedTime()))
    }, 30000)
    return () => clearInterval(timer)
  }, [packageInfo, restrictionRules, exportSettings])

  const tabs = [
    { key: 'editor' as TabType, label: '套餐编辑', icon: '✏️' },
    { key: 'restriction' as TabType, label: '收费限制', icon: '🚫' },
    { key: 'export' as TabType, label: '打印导出', icon: '🖨️' },
  ]

  return (
    <div className="app">
      <header className="app-header">
        <div className="header-content">
          <div className="app-logo">🦷</div>
          <div className="app-title-group">
            <h1 className="app-title">口腔诊所套餐配置器</h1>
            <p className="app-subtitle">洁牙抛光收费规则管理系统</p>
          </div>
        </div>
        <div className="header-tip">
          <span className="tip-icon">�</span>
          <span>修改即保存 · 已落盘</span>
        </div>
      </header>

      <nav className="app-nav">
        <div className="nav-tabs">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              className={`nav-tab ${activeTab === tab.key ? 'active' : ''}`}
              onClick={() => setActiveTab(tab.key)}
            >
              <span className="nav-tab-icon">{tab.icon}</span>
              <span className="nav-tab-label">{tab.label}</span>
            </button>
          ))}
        </div>
        <div className="nav-progress">
          <div
            className="progress-bar"
            style={{
              width: `${((tabs.findIndex((t) => t.key === activeTab) + 1) / tabs.length) * 100}%`,
            }}
          />
        </div>
      </nav>

      <main className="app-main">
        {activeTab === 'editor' && (
          <PackageEditor packageInfo={packageInfo} onChange={setPackageInfo} />
        )}
        {activeTab === 'restriction' && (
          <RestrictionPanel rules={restrictionRules} onChange={setRestrictionRules} />
        )}
        {activeTab === 'export' && (
          <ExportPanel
            packageInfo={packageInfo}
            rules={restrictionRules}
            settings={exportSettings}
            onChange={setExportSettings}
          />
        )}
      </main>

      <footer className="app-footer">
        <span>© 2025 口腔诊所套餐配置器</span>
        <span className="footer-status">
          <span className="status-dot"></span>
          {savedTimeDisplay}
        </span>
      </footer>
    </div>
  )
}

export default App
