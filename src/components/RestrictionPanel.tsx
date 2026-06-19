import { RestrictionRules } from '../types'
import { generateFrontDeskText } from '../utils/restrictionText'

interface Props {
  rules: RestrictionRules
  onChange: (rules: RestrictionRules) => void
}

interface WarningItem {
  type: 'red' | 'yellow'
  message: string
}

function RestrictionPanel({ rules, onChange }: Props) {
  const updateRule = <K extends keyof RestrictionRules>(field: K, value: RestrictionRules[K]) => {
    onChange({ ...rules, [field]: value })
  }

  const updateAgeRange = (patch: Partial<RestrictionRules['ageRange']>) => {
    updateRule('ageRange', { ...rules.ageRange, ...patch })
  }

  const updateTimeSlot = (patch: Partial<RestrictionRules['timeSlot']>) => {
    updateRule('timeSlot', { ...rules.timeSlot, ...patch })
  }

  const updateMinConsumption = (patch: Partial<RestrictionRules['minimumConsumption']>) => {
    updateRule('minimumConsumption', { ...rules.minimumConsumption, ...patch })
  }

  const getWarnings = (): WarningItem[] => {
    const warnings: WarningItem[] = []

    if (rules.childrenNotAllowed && rules.memberOnly) {
      warnings.push({ type: 'yellow', message: '儿童不可选 + 会员专享：若有儿童会员，前台可能误收，请确认规则' })
    }
    if (rules.holidayNotAvailable && rules.pregnancyNeedDoctor) {
      warnings.push({ type: 'yellow', message: '节假日不可用 + 孕期需确认：节假日急诊孕妇可能引发纠纷' })
    }
    if (rules.memberOnly) {
      warnings.push({ type: 'yellow', message: '会员专享：新客到店可能因无法购买产生不满，建议设置新客体验价' })
    }
    if (rules.childrenNotAllowed) {
      warnings.push({ type: 'red', message: '儿童不可选：前台需主动询问年龄，避免收费后退费纠纷' })
    }
    if (rules.pregnancyNeedDoctor) {
      warnings.push({ type: 'red', message: '孕期需医生确认：前台无权直接收费，必须先安排医生评估' })
    }
    if (rules.holidayNotAvailable) {
      warnings.push({ type: 'yellow', message: '节假日不可用：请在系统日历中标注，避免顾客白跑一趟' })
    }
    if (rules.ageRange.enabled) {
      warnings.push({ type: 'yellow', message: '年龄段限制已启用：前台需核实身份证或询问年龄' })
    }
    if (rules.timeSlot.enabled) {
      warnings.push({ type: 'yellow', message: '时段限制已启用：预约时务必确认时间段，避免到店无法服务' })
    }
    if (rules.minimumConsumption.enabled && rules.minimumConsumption.amount > 0) {
      warnings.push({ type: 'yellow', message: '最低消费已设置：收费时需确认金额是否达标' })
    }
    if (!rules.stackableDiscount) {
      warnings.push({ type: 'yellow', message: '不可叠加优惠：前台收银时需检查是否有其他优惠在用' })
    }

    return warnings
  }

  const warnings = getWarnings()
  const redWarnings = warnings.filter((w) => w.type === 'red')
  const yellowWarnings = warnings.filter((w) => w.type === 'yellow')
  const frontDeskLines = generateFrontDeskText(rules)

  return (
    <div className="restriction-container">
      <div className="restriction-form scrollable">
        <h2 className="section-title">收费限制规则</h2>
        <p className="section-desc">设置套餐的使用限制规则，保护诊所利益，减少前台误收</p>

        <div className="restriction-section">
          <h3 className="subsection-title">基础限制</h3>
          <div className="restriction-options">
            <div className="restriction-option">
              <label className="checkbox-label large">
                <input type="checkbox" checked={rules.childrenNotAllowed} onChange={(e) => updateRule('childrenNotAllowed', e.target.checked)} className="form-checkbox" />
                <div className="option-content">
                  <span className="option-title">儿童不可选</span>
                  <span className="option-desc">12岁以下儿童不能购买此套餐</span>
                </div>
              </label>
            </div>
            <div className="restriction-option">
              <label className="checkbox-label large">
                <input type="checkbox" checked={rules.pregnancyNeedDoctor} onChange={(e) => updateRule('pregnancyNeedDoctor', e.target.checked)} className="form-checkbox" />
                <div className="option-content">
                  <span className="option-title">孕期需医生确认</span>
                  <span className="option-desc">孕妇购买前必须经医生评估确认</span>
                </div>
              </label>
            </div>
            <div className="restriction-option">
              <label className="checkbox-label large">
                <input type="checkbox" checked={rules.memberOnly} onChange={(e) => updateRule('memberOnly', e.target.checked)} className="form-checkbox" />
                <div className="option-content">
                  <span className="option-title">会员专享</span>
                  <span className="option-desc">仅限会员购买，非会员不可选</span>
                </div>
              </label>
            </div>
            <div className="restriction-option">
              <label className="checkbox-label large">
                <input type="checkbox" checked={rules.holidayNotAvailable} onChange={(e) => updateRule('holidayNotAvailable', e.target.checked)} className="form-checkbox" />
                <div className="option-content">
                  <span className="option-title">节假日不可用</span>
                  <span className="option-desc">法定节假日及周末不可使用</span>
                </div>
              </label>
            </div>
          </div>
        </div>

        <div className="restriction-section">
          <h3 className="subsection-title">年龄限制</h3>
          <div className="compound-rule">
            <label className="checkbox-label">
              <input type="checkbox" checked={rules.ageRange.enabled} onChange={(e) => updateAgeRange({ enabled: e.target.checked })} className="form-checkbox" />
              <span>启用年龄限制</span>
            </label>
            {rules.ageRange.enabled && (
              <div className="compound-fields">
                <div className="form-row">
                  <div className="form-group">
                    <label>最小年龄</label>
                    <input type="number" min={0} max={150} value={rules.ageRange.min || ''} onChange={(e) => updateAgeRange({ min: Number(e.target.value) })} placeholder="0" className="form-input" />
                  </div>
                  <div className="form-group">
                    <label>最大年龄</label>
                    <input type="number" min={0} max={150} value={rules.ageRange.max || ''} onChange={(e) => updateAgeRange({ max: Number(e.target.value) })} placeholder="0" className="form-input" />
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="restriction-section">
          <h3 className="subsection-title">适用时段</h3>
          <div className="compound-rule">
            <label className="checkbox-label">
              <input type="checkbox" checked={rules.timeSlot.enabled} onChange={(e) => updateTimeSlot({ enabled: e.target.checked })} className="form-checkbox" />
              <span>启用时段限制</span>
            </label>
            {rules.timeSlot.enabled && (
              <div className="compound-fields">
                <div className="form-row">
                  <div className="form-group">
                    <label>开始时间</label>
                    <input type="time" value={rules.timeSlot.startTime} onChange={(e) => updateTimeSlot({ startTime: e.target.value })} className="form-input" />
                  </div>
                  <div className="form-group">
                    <label>结束时间</label>
                    <input type="time" value={rules.timeSlot.endTime} onChange={(e) => updateTimeSlot({ endTime: e.target.value })} className="form-input" />
                  </div>
                </div>
                <label className="checkbox-label" style={{ marginTop: 10 }}>
                  <input type="checkbox" checked={rules.timeSlot.weekdaysOnly} onChange={(e) => updateTimeSlot({ weekdaysOnly: e.target.checked })} className="form-checkbox" />
                  <span>仅限工作日（周一至周五）</span>
                </label>
              </div>
            )}
          </div>
        </div>

        <div className="restriction-section">
          <h3 className="subsection-title">最低消费</h3>
          <div className="compound-rule">
            <label className="checkbox-label">
              <input type="checkbox" checked={rules.minimumConsumption.enabled} onChange={(e) => updateMinConsumption({ enabled: e.target.checked })} className="form-checkbox" />
              <span>启用最低消费</span>
            </label>
            {rules.minimumConsumption.enabled && (
              <div className="compound-fields">
                <div className="form-group" style={{ maxWidth: 200 }}>
                  <label>最低金额（元）</label>
                  <input type="number" min={0} value={rules.minimumConsumption.amount || ''} onChange={(e) => updateMinConsumption({ amount: Number(e.target.value) })} placeholder="0" className="form-input" />
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="restriction-section">
          <h3 className="subsection-title">优惠叠加</h3>
          <label className="checkbox-label large">
            <input type="checkbox" checked={!rules.stackableDiscount} onChange={(e) => updateRule('stackableDiscount', !e.target.checked)} className="form-checkbox" />
            <div className="option-content">
              <span className="option-title">不可叠加其他优惠</span>
              <span className="option-desc">勾选后，此套餐不可与门店其他优惠活动同时使用</span>
            </div>
          </label>
        </div>

        <div className="restriction-section">
          <h3 className="subsection-title">其他限制说明</h3>
          <textarea
            className="form-textarea"
            placeholder="每行一条，可输入其他需要前台注意的限制规则..."
            rows={4}
            value={rules.customRules.join('\n')}
            onChange={(e) => updateRule('customRules', e.target.value.split('\n').filter(Boolean))}
          />
        </div>
      </div>

      <div className="restriction-right">
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
                    {redWarnings.map((w, i) => (
                      <div key={`red-${i}`} className="warning-item red">
                        <span className="warning-badge">红</span>
                        <span className="warning-text">{w.message}</span>
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
                    {yellowWarnings.map((w, i) => (
                      <div key={`yellow-${i}`} className="warning-item yellow">
                        <span className="warning-badge">黄</span>
                        <span className="warning-text">{w.message}</span>
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

        <div className="front-desk-text-panel">
          <h2 className="section-title">前台话术</h2>
          <p className="section-desc">根据当前规则自动生成，可直接粘贴到前台手册</p>
          {frontDeskLines.length === 0 ? (
            <div className="no-warnings small">
              <p>暂无限制规则，前台话术为空</p>
            </div>
          ) : (
            <div className="front-desk-lines">
              {frontDeskLines.map((line, i) => (
                <div key={i} className="front-desk-line">
                  <span className="line-number">{i + 1}</span>
                  <span className="line-text">{line}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default RestrictionPanel
