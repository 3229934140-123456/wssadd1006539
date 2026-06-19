import { ChangeHistoryEntry } from '../types'

interface Props {
  history: ChangeHistoryEntry[]
  onRestore: (entryId: string) => void
}

function ChangeHistory({ history, onRestore }: Props) {
  const formatTime = (iso: string) => {
    const d = new Date(iso)
    const now = new Date()
    const isToday = d.toDateString() === now.toDateString()
    const isYesterday = new Date(now.getTime() - 86400000).toDateString() === d.toDateString()
    const time = `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
    if (isToday) return `今天 ${time}`
    if (isYesterday) return `昨天 ${time}`
    return `${d.getMonth() + 1}月${d.getDate()}日 ${time}`
  }

  const fieldLabel = (f: string) => {
    const map: Record<string, string> = {
      'packageInfo.name': '套餐名称',
      'packageInfo.price': '套餐价格',
      'restrictionRules': '收费限制',
      'exportSettings': '导出设置',
      'status': '套餐状态',
      'other': '其他内容',
    }
    return map[f] || '其他内容'
  }

  const fieldColor = (f: string) => {
    const map: Record<string, string> = {
      'packageInfo.name': 'field-name',
      'packageInfo.price': 'field-price',
      'restrictionRules': 'field-rule',
      'exportSettings': 'field-export',
      'status': 'field-status',
      'other': 'field-other',
    }
    return map[f] || 'field-other'
  }

  return (
    <div className="history-page">
      <div className="history-header">
        <h2 className="section-title">规则变更记录</h2>
        <p className="section-desc">记录最近 {history.length} 次改动，可一键恢复到上一版</p>
      </div>

      {history.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon">📝</div>
          <p>暂无变更记录</p>
          <p className="empty-hint">修改套餐内容后会自动记录在这里</p>
        </div>
      ) : (
        <div className="history-timeline">
          {history.map((entry) => (
            <div key={entry.id} className="history-entry">
              <div className="history-dot"></div>
              <div className="history-content">
                <div className="history-top">
                  <span className={`field-tag ${fieldColor(entry.field)}`}>
                    {fieldLabel(entry.field)}
                  </span>
                  <span className="history-pkg">{entry.packageName}</span>
                  <span className="history-time">{formatTime(entry.timestamp)}</span>
                </div>
                <div className="history-summary">
                  {entry.summary}
                </div>
                <div className="history-bottom">
                  <span className="history-operator">操作人：{entry.operator}</span>
                  <button className="btn btn-secondary btn-sm" onClick={() => onRestore(entry.id)}>
                    ↺ 恢复此版本
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export default ChangeHistory
