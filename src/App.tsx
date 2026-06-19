import { useState } from 'react'
import { PackageInfo, RestrictionRules, ExportSettings, TabType } from './types'
import PackageEditor from './components/PackageEditor'
import RestrictionPanel from './components/RestrictionPanel'
import ExportPanel from './components/ExportPanel'
import './styles/App.css'

function App() {
  const [activeTab, setActiveTab] = useState<TabType>('editor')

  const [packageInfo, setPackageInfo] = useState<PackageInfo>({
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
  })

  const [restrictionRules, setRestrictionRules] = useState<RestrictionRules>({
    childrenNotAllowed: false,
    pregnancyNeedDoctor: true,
    memberOnly: false,
    holidayNotAvailable: false,
    customRules: [],
  })

  const [exportSettings, setExportSettings] = useState<ExportSettings>({
    storeName: '康美口腔诊所',
    paperSize: 'A5',
    showOriginalPrice: true,
    outputType: 'deskCard',
  })

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
          <span className="tip-icon">💡</span>
          <span>所有修改实时保存，支持打印和导出</span>
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
          数据已自动保存
        </span>
      </footer>
    </div>
  )
}

export default App
