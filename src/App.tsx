import { useState, useEffect } from 'react'
import { ViewType } from './types'
import { useAppStore, AppStoreProvider } from './hooks/useAppStore'
import PackageList from './components/PackageList'
import PackageEditor from './components/PackageEditor'
import RestrictionPanel from './components/RestrictionPanel'
import ExportPanel from './components/ExportPanel'
import FrontDeskQuote from './components/FrontDeskQuote'
import ChangeHistory from './components/ChangeHistory'
import './styles/App.css'

function AppInner() {
  const [view, setView] = useState<ViewType>('list')
  const store = useAppStore()

  useEffect(() => {
    store.executeDueSchedules()
  }, [store])

  const tabs = [
    { key: 'list' as ViewType, label: '套餐管理', icon: '📋' },
    { key: 'frontdesk' as ViewType, label: '前台报价', icon: '💁' },
    { key: 'history' as ViewType, label: '变更记录', icon: '📝' },
  ]

  const editorTabs = [
    { key: 'editor' as ViewType, label: '套餐编辑', icon: '✏️' },
    { key: 'restriction' as ViewType, label: '收费限制', icon: '🚫' },
    { key: 'export' as ViewType, label: '打印导出', icon: '🖨️' },
  ]

  const isEditingPackage = view === 'editor' || view === 'restriction' || view === 'export'

  const renderMain = () => {
    if (view === 'list') {
      return (
        <PackageList
          packages={store.state.packages}
          currentPackageId={store.state.currentPackageId}
          onSelect={store.selectPackage}
          onNavigate={setView}
          onCreate={() => store.createPackage()}
          onDuplicate={store.duplicatePackage}
          onSetStatus={store.setPackageStatus}
        />
      )
    }
    if (view === 'frontdesk') {
      return <FrontDeskQuote packages={store.state.packages} />
    }
    if (view === 'history') {
      return (
        <ChangeHistory
          history={store.state.history}
          onRestore={store.restoreFromHistory}
        />
      )
    }
    if (!store.currentPackage) {
      return (
        <div className="empty-state">
          <div className="empty-icon">📋</div>
          <p>请先从套餐管理选择一个套餐</p>
          <button className="btn btn-primary" onClick={() => setView('list')}>去选择套餐</button>
        </div>
      )
    }
    if (view === 'editor') {
      return (
        <PackageEditor
          packageInfo={store.currentPackage.packageInfo}
          onChange={store.setPackageInfo}
        />
      )
    }
    if (view === 'restriction') {
      return (
        <RestrictionPanel
          rules={store.currentPackage.restrictionRules}
          onChange={store.setRestrictionRules}
        />
      )
    }
    if (view === 'export') {
      return (
        <ExportPanel
          packageInfo={store.currentPackage.packageInfo}
          rules={store.currentPackage.restrictionRules}
          settings={store.currentPackage.exportSettings}
          onChange={store.setExportSettings}
        />
      )
    }
    return null
  }

  return (
    <div className="app">
      <header className="app-header">
        <div className="header-content">
          <div className="app-logo">🦷</div>
          <div className="app-title-group">
            <h1 className="app-title">口腔诊所套餐配置器</h1>
            <p className="app-subtitle">洁牙抛光收费规则管理系统</p>
          </div>
          {isEditingPackage && store.currentPackage && (
            <div className="current-package-badge">
              正在编辑：<strong>{store.currentPackage.packageInfo.name}</strong>
            </div>
          )}
        </div>
        <div className="header-tip">
          <span className="tip-icon">💾</span>
          <span>{store.savedTimeDisplay}</span>
        </div>
      </header>

      <nav className="app-nav">
        {!isEditingPackage ? (
          <div className="nav-tabs">
            {tabs.map((tab) => (
              <button
                key={tab.key}
                className={`nav-tab ${view === tab.key ? 'active' : ''}`}
                onClick={() => setView(tab.key)}
              >
                <span className="nav-tab-icon">{tab.icon}</span>
                <span className="nav-tab-label">{tab.label}</span>
              </button>
            ))}
          </div>
        ) : (
          <div className="nav-tabs">
            <button
              className="nav-tab back-tab"
              onClick={() => setView('list')}
            >
              <span className="nav-tab-icon">←</span>
              <span className="nav-tab-label">返回套餐列表</span>
            </button>
            {editorTabs.map((tab) => (
              <button
                key={tab.key}
                className={`nav-tab ${view === tab.key ? 'active' : ''}`}
                onClick={() => setView(tab.key)}
              >
                <span className="nav-tab-icon">{tab.icon}</span>
                <span className="nav-tab-label">{tab.label}</span>
              </button>
            ))}
          </div>
        )}
      </nav>

      <main className="app-main">
        {renderMain()}
      </main>

      <footer className="app-footer">
        <span>© 2025 口腔诊所套餐配置器</span>
        <span className="footer-status">
          <span className="status-dot"></span>
          共 {store.state.packages.length} 个套餐 · {store.state.history.length} 条变更记录
        </span>
      </footer>
    </div>
  )
}

function App() {
  return (
    <AppStoreProvider>
      <AppInner />
    </AppStoreProvider>
  )
}

export default App
