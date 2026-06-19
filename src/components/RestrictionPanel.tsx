import { RestrictionRules } from '../types'

interface Props {
  rules: RestrictionRules
  onChange: (rules: RestrictionRules) => void
}

interface WarningItem {
  type: 'red' | 'yellow'
  message: string
}

function RestrictionPanel({ rules, onChange }: Props) {
  const handleChange = (field: keyof RestrictionRules, value: boolean | string[]) => {
    onChange({ ...rules, [field]: value })
  }

  const getWarnings = (): WarningItem[] => {
    const warnings: WarningItem[] = []

    if (rules.childrenNotAllowed && rules.memberOnly) {
      warnings.push({
        type: 'yellow',
        message: '儿童不可选 + 会员专享：若有儿童会员，前台可能误收，请确认规则',
      })
    }

    if (rules.holidayNotAvailable && rules.pregnancyNeedDoctor) {
      warnings.push({
        type: 'yellow',
        message: '节假日不可用 + 孕期需确认：节假日急诊孕妇可能引发纠纷',
      })
    }

    if (rules.memberOnly) {
      warnings.push({
        type: 'yellow',
        message: '会员专享：新客到店可能因无法购买产生不满，建议设置新客体验价',
      })
    }

    if (rules.childrenNotAllowed) {
      warnings.push({
        type: 'red',
        message: '儿童不可选：前台需主动询问年龄，避免收费后退费纠纷',
      })
    }

    if (rules.pregnancyNeedDoctor) {
      warnings.push({
        type: 'red',
        message: '孕期需医生确认：前台无权直接收费，必须先安排医生评估',
      })
    }

    if (rules.holidayNotAvailable) {
      warnings.push({
        type: 'yellow',
        message: '节假日不可用：请在系统日历中标注，避免顾客白跑一趟',
      })
    }

    return warnings
  }

  const warnings = getWarnings()
  const redWarnings = warnings.filter((w) => w.type === 'red')
  const yellowWarnings = warnings.filter((w) => w.type === 'yellow')

  return (
    <div className="restriction-container">
      <div className="restriction-form">
        <h2 className="section-title">收费限制</h2>
        <p className="section-desc">设置套餐的使用限制规则，保护诊所利益，减少前台误收</p>

        <div className="restriction-options">
          <div className="restriction-option">
            <label className="checkbox-label large">
              <input
                type="checkbox"
                checked={rules.childrenNotAllowed}
                onChange={(e) => handleChange('childrenNotAllowed', e.target.checked)}
                className="form-checkbox"
              />
              <div className="option-content">
                <span className="option-title">儿童不可选</span>
                <span className="option-desc">12岁以下儿童不能购买此套餐</span>
              </div>
            </label>
          </div>

          <div className="restriction-option">
            <label className="checkbox-label large">
              <input
                type="checkbox"
                checked={rules.pregnancyNeedDoctor}
                onChange={(e) => handleChange('pregnancyNeedDoctor', e.target.checked)}
                className="form-checkbox"
              />
              <div className="option-content">
                <span className="option-title">孕期需医生确认</span>
                <span className="option-desc">孕妇购买前必须经医生评估确认</span>
              </div>
            </label>
          </div>

          <div className="restriction-option">
            <label className="checkbox-label large">
              <input
                type="checkbox"
                checked={rules.memberOnly}
                onChange={(e) => handleChange('memberOnly', e.target.checked)}
                className="form-checkbox"
              />
              <div className="option-content">
                <span className="option-title">会员专享</span>
                <span className="option-desc">仅限会员购买，非会员不可选</span>
              </div>
            </label>
          </div>

          <div className="restriction-option">
            <label className="checkbox-label large">
              <input
                type="checkbox"
                checked={rules.holidayNotAvailable}
                onChange={(e) => handleChange('holidayNotAvailable', e.target.checked)}
                className="form-checkbox"
              />
              <div className="option-content">
                <span className="option-title">节假日不可用</span>
                <span className="option-desc">法定节假日及周末不可使用</span>
              </div>
            </label>
          </div>
        </div>

        <div className="custom-rules-section">
          <h3 className="subsection-title">其他限制说明</h3>
          <textarea
            className="form-textarea"
            placeholder="可输入其他需要前台注意的限制规则..."
            rows={4}
            value={rules.customRules.join('\n')}
            onChange={(e) => handleChange('customRules', e.target.value.split('\n').filter(Boolean))}
          />
        </div>
      </div>

      <div className="warnings-panel">
        <h2 className="section-title">风险提示</h2>
        <p className="section-desc">系统自动检测可能引起前台误收的设置</p>

        {warnings.length === 0 ? (
          <div className="no-warnings">
            <div className="no-warnings-icon">✓</div>
            <p>当前设置无明显风险</p>
          </div>
        ) : (
          <div className="warnings-list">
            {redWarnings.length > 0 && (
              <div className="warning-group">
                <h3 className="warning-group-title red">
                  <span className="warning-icon">⚠</span>
                  高风险（{redWarnings.length}项）
                </h3>
                <div className="warning-items">
                  {redWarnings.map((warning, index) => (
                    <div key={`red-${index}`} className="warning-item red">
                      <span className="warning-badge">红</span>
                      <span className="warning-text">{warning.message}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {yellowWarnings.length > 0 && (
              <div className="warning-group">
                <h3 className="warning-group-title yellow">
                  <span className="warning-icon">⚡</span>
                  注意事项（{yellowWarnings.length}项）
                </h3>
                <div className="warning-items">
                  {yellowWarnings.map((warning, index) => (
                    <div key={`yellow-${index}`} className="warning-item yellow">
                      <span className="warning-badge">黄</span>
                      <span className="warning-text">{warning.message}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        <div className="warning-legend">
          <div className="legend-item">
            <span className="legend-dot red"></span>
            <span>红色：必须培训前台，容易引发纠纷</span>
          </div>
          <div className="legend-item">
            <span className="legend-dot yellow"></span>
            <span>黄色：需要注意，建议配套措施</span>
          </div>
        </div>
      </div>
    </div>
  )
}

export default RestrictionPanel
