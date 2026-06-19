import { useState, useMemo } from 'react'
import { DentalPackage, FrontDeskInput, FrontDeskResult } from '../types'
import { evaluatePackage } from '../hooks/useAppStore'

interface Props {
  packages: DentalPackage[]
}

function FrontDeskQuote({ packages }: Props) {
  const today = new Date().toISOString().slice(0, 10)
  const nowTime = `${String(new Date().getHours()).padStart(2, '0')}:${String(new Date().getMinutes()).padStart(2, '0')}`

  const [input, setInput] = useState<FrontDeskInput>({
    age: null,
    isMember: false,
    isPregnant: false,
    appointmentDate: today,
    appointmentTime: nowTime,
  })

  const update = <K extends keyof FrontDeskInput>(field: K, value: FrontDeskInput[K]) => {
    setInput((prev) => ({ ...prev, [field]: value }))
  }

  const activePackages = useMemo(() => packages.filter((p) => p.status === 'active'), [packages])

  const results: FrontDeskResult[] = useMemo(() => {
    return activePackages.map((pkg) => evaluatePackage(pkg, input))
  }, [activePackages, input])

  const allowed = results.filter((r) => r.allowed)
  const denied = results.filter((r) => !r.allowed)

  return (
    <div className="frontdesk-page">
      <div className="frontdesk-left">
        <div className="fd-panel">
          <h2 className="section-title">顾客信息录入</h2>
          <p className="section-desc">前台只需要填写以下几项，系统会自动判断哪些套餐可收</p>

          <div className="form-group">
            <label>顾客年龄</label>
            <input
              type="number"
              min={0}
              max={150}
              value={input.age ?? ''}
              onChange={(e) => update('age', e.target.value === '' ? null : Number(e.target.value))}
              placeholder="请输入年龄"
              className="form-input"
            />
          </div>

          <div className="form-group">
            <label>预约日期</label>
            <input
              type="date"
              value={input.appointmentDate}
              onChange={(e) => update('appointmentDate', e.target.value)}
              className="form-input"
            />
          </div>

          <div className="form-group">
            <label>预约时间</label>
            <input
              type="time"
              value={input.appointmentTime}
              onChange={(e) => update('appointmentTime', e.target.value)}
              className="form-input"
            />
          </div>

          <div className="fd-checkboxes">
            <label className="checkbox-label large">
              <input
                type="checkbox"
                checked={input.isMember}
                onChange={(e) => update('isMember', e.target.checked)}
                className="form-checkbox"
              />
              <div className="option-content">
                <span className="option-title">是会员</span>
                <span className="option-desc">已购买会员的顾客</span>
              </div>
            </label>
            <label className="checkbox-label large">
              <input
                type="checkbox"
                checked={input.isPregnant}
                onChange={(e) => update('isPregnant', e.target.checked)}
                className="form-checkbox"
              />
              <div className="option-content">
                <span className="option-title">处于孕期</span>
                <span className="option-desc">孕妇需要先经医生确认</span>
              </div>
            </label>
          </div>
        </div>
      </div>

      <div className="frontdesk-right">
        <div className="fd-panel">
          <h2 className="section-title">
            ✅ 可收套餐
            <span className="result-count">{allowed.length}</span>
          </h2>
          {allowed.length === 0 ? (
            <div className="no-warnings small"><p>当前条件下无可收套餐，请检查录入信息</p></div>
          ) : (
            <div className="result-list">
              {allowed.map((r) => (
                <div key={r.packageId} className="result-card allowed">
                  <div className="result-header">
                    <h4>{r.packageName}</h4>
                    <span className="allowed-badge">可收</span>
                  </div>
                  <div className="result-message">
                    <strong>话术：</strong>
                    <span>{r.customerMessage}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="fd-panel">
          <h2 className="section-title">
            ❌ 不可收套餐
            <span className="result-count denied">{denied.length}</span>
          </h2>
          {denied.length === 0 ? (
            <div className="no-warnings small"><p>所有上架套餐均可收</p></div>
          ) : (
            <div className="result-list">
              {denied.map((r) => (
                <div key={r.packageId} className="result-card denied">
                  <div className="result-header">
                    <h4>{r.packageName}</h4>
                    <span className="denied-badge">不可收</span>
                  </div>
                  <div className="result-reasons">
                    <strong>原因：</strong>
                    <ul>
                      {r.reasons.map((reason, i) => (
                        <li key={i}>• {reason}</li>
                      ))}
                    </ul>
                  </div>
                  <div className="result-message">
                    <strong>对顾客话术：</strong>
                    <span>{r.customerMessage}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default FrontDeskQuote
