import { useState } from 'react'
import { ChangeHistoryEntry, DiffComparison, DiffEntry } from '../types'
import { useAppStore } from '../hooks/useAppStore'

interface Props {
  history: ChangeHistoryEntry[]
  onRestore: (entryId: string) => void
}

function formatTime(iso: string) {
  const d = new Date(iso)
  const now = new Date()
  const isToday = d.toDateString() === now.toDateString()
  const isYesterday = new Date(now.getTime() - 86400000).toDateString() === d.toDateString()
  const time = `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
  if (isToday) return `今天 ${time}`
  if (isYesterday) return `昨天 ${time}`
  return `${d.getMonth() + 1}月${d.getDate()}日 ${time}`
}

function fieldLabel(f: string) {
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

function fieldColor(f: string) {
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

function diffColor(type: DiffEntry['type']) {
  const map: Record<string, string> = {
    name: 'diff-name',
    price: 'diff-price',
    rule: 'diff-rule',
    export: 'diff-export',
    other: 'diff-other',
  }
  return map[type] || 'diff-other'
}

function ChangeHistory({ history, onRestore }: Props) {
  const store = useAppStore()
  const [confirmModal, setConfirmModal] = useState<{
    open: boolean
    entry: ChangeHistoryEntry | null
    diff: DiffComparison | null
  }>({ open: false, entry: null, diff: null })

  const openConfirm = (entry: ChangeHistoryEntry) => {
    const diff = store.computeDiff(entry.id)
    setConfirmModal({ open: true, entry, diff })
  }
  const closeConfirm = () => setConfirmModal({ open: false, entry: null, diff: null })

  const doRestore = () => {
    if (!confirmModal.entry) return
    onRestore(confirmModal.entry.id)
    closeConfirm()
  }

  return (
    <div className="history-page">
      <div className="history-header">
        <h2 className="section-title">规则变更记录</h2>
        <p className="section-desc">记录最近 {history.length} 次改动，可一键恢复到上一版（恢复前会展示差异对比）</p>
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
                  <button className="btn btn-secondary btn-sm" onClick={() => openConfirm(entry)}>
                    ↺ 恢复此版本
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ===== 恢复前差异对比弹窗 ===== */}
      {confirmModal.open && confirmModal.entry && (
        <div className="modal-mask" onClick={closeConfirm}>
          <div className="modal-content" style={{ maxWidth: 720 }} onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>⚠️ 确认恢复 · {confirmModal.entry.packageName}</h3>
              <button className="modal-close" onClick={closeConfirm}>×</button>
            </div>
            <div className="modal-body">
              <div className="diff-warning">
                <strong>即将恢复的版本：</strong>
                <p style={{ margin: '6px 0 0 0', fontSize: 13, color: '#666' }}>
                  {confirmModal.entry.summary} <br />
                  <span style={{ color: '#999' }}>
                    {confirmModal.entry.operator} · {formatTime(confirmModal.entry.timestamp)}
                  </span>
                </p>
              </div>

              <div style={{ marginTop: 16 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                  <strong>📊 差异对比</strong>
                  <span className="diff-summary">{confirmModal.diff?.summary || '正在计算差异...'}</span>
                </div>
                {!confirmModal.diff || confirmModal.diff.entries.length === 0 ? (
                  <div className="no-warnings small">
                    <p>当前套餐与该版本内容一致，恢复后不会有变化</p>
                  </div>
                ) : (
                  <div className="diff-table">
                    <div className="diff-row diff-row-head">
                      <div className="diff-cell diff-label">字段</div>
                      <div className="diff-cell diff-old">恢复后（变成）</div>
                      <div className="diff-cell diff-new">当前（将被覆盖）</div>
                    </div>
                    {confirmModal.diff.entries.map((e, i) => (
                      <div key={i} className={`diff-row ${diffColor(e.type)}`}>
                        <div className="diff-cell diff-label">
                          <span className={`diff-tag ${diffColor(e.type)}`}>{e.label}</span>
                        </div>
                        <div className="diff-cell diff-old">{e.newValue}</div>
                        <div className="diff-cell diff-new">{e.oldValue}</div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="fd-warning small" style={{ marginTop: 16 }}>
                <strong>⚠️ 风险提示：</strong>
                <p style={{ margin: '4px 0 0 0', fontSize: 13 }}>
                  恢复将覆盖套餐的名称、价格、有效期、限制规则和打印导出设置，同时系统会自动在变更记录中留下一条「恢复至版本」的新记录，方便必要时再恢复回来。
                </p>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn" onClick={closeConfirm}>取消</button>
              <button className="btn btn-danger" onClick={doRestore}>
                ✅ 确认恢复到此版本
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default ChangeHistory
