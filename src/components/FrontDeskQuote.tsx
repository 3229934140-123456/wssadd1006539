import { useState, useMemo } from 'react'
import { DentalPackage, FrontDeskInput, FrontDeskResult, CustomerInfo, PackageInfo, RestrictionRules } from '../types'
import { useAppStore } from '../hooks/useAppStore'

interface Props {
  packages: DentalPackage[]
}

function formatDateTime(iso: string) {
  const d = new Date(iso)
  const mm = String(d.getMonth() + 1).padStart(2, '0')
  const dd = String(d.getDate()).padStart(2, '0')
  const hh = String(d.getHours()).padStart(2, '0')
  const mi = String(d.getMinutes()).padStart(2, '0')
  return `${mm}月${dd}日 ${hh}:${mi}`
}

function FrontDeskQuote({ packages }: Props) {
  const store = useAppStore()
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

  const ageEmpty = input.age === null || isNaN(input.age)
  const dateEmpty = !input.appointmentDate
  const timeEmpty = !input.appointmentTime
  const inputIncomplete = ageEmpty || dateEmpty || timeEmpty

  const results: FrontDeskResult[] = useMemo(() => {
    return packages.map((pkg) => store.evaluatePackageWithReasons(pkg, input))
  }, [packages, input, store])

  const allowed = results.filter((r) => r.allowed && !inputIncomplete)
  const deniedAll = results.filter((r) => !r.allowed || inputIncomplete)

  const denied = deniedAll.map((r) => {
    const reasons = [...r.reasons]
    if (inputIncomplete) {
      if (ageEmpty) reasons.unshift('请先填写顾客年龄')
      if (dateEmpty) reasons.unshift('请先填写预约日期')
      if (timeEmpty) reasons.unshift('请先填写预约时间')
    }
    return { ...r, reasons: Array.from(new Set(reasons)) }
  })

  /* ===== 成交单弹窗 ===== */
  const [quoteModal, setQuoteModal] = useState<{
    open: boolean
    result: FrontDeskResult | null
    snapshotOverride: { packageInfo: PackageInfo; restrictionRules: RestrictionRules } | null
  }>({ open: false, result: null, snapshotOverride: null })

  const [customer, setCustomer] = useState<CustomerInfo>({
    name: '',
    phone: '',
    age: null,
    isMember: false,
    isPregnant: false,
    note: '',
  })

  const openQuoteModal = (r: FrontDeskResult) => {
    setCustomer({
      name: '',
      phone: '',
      age: input.age,
      isMember: input.isMember,
      isPregnant: input.isPregnant,
      note: '',
    })
    setQuoteModal({ open: true, result: r, snapshotOverride: null })
  }

  const closeQuoteModal = () => setQuoteModal({ open: false, result: null, snapshotOverride: null })

  const saveQuoteDraft = () => {
    if (!quoteModal.result) return
    store.createQuoteDraft({
      packageId: quoteModal.result.packageId,
      customer,
      appointmentDate: input.appointmentDate,
      appointmentTime: input.appointmentTime,
      restrictionSummary: quoteModal.result.reasons,
      customerMessage: quoteModal.result.customerMessage,
    })
    closeQuoteModal()
  }

  const printQuoteModal = () => {
    if (!quoteModal.result) return
    const snap = quoteModal.snapshotOverride
    let dataPkg: DentalPackage
    if (snap) {
      dataPkg = {
        id: quoteModal.result.packageId,
        status: 'active',
        packageInfo: snap.packageInfo,
        restrictionRules: snap.restrictionRules,
        exportSettings: { storeName: '', paperSize: 'A5', showOriginalPrice: true, outputTypes: [] },
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }
    } else {
      const found = packages.find((p) => p.id === quoteModal.result!.packageId)
      if (!found) return
      dataPkg = found
    }
    const html = buildQuotePrintHtml(dataPkg, customer, input, quoteModal.result)
    const w = window.open('', '_blank', 'width=800,height=900')
    if (!w) return
    w.document.write(html)
    w.document.close()
    w.focus()
    setTimeout(() => w.print(), 300)
  }

  const buildQuotePrintHtml = (
    pkg: DentalPackage,
    cus: CustomerInfo,
    fd: FrontDeskInput,
    res: FrontDeskResult,
  ) => {
    const items = pkg.packageInfo.items.map((x) => `<li>• ${x.name}</li>`).join('')
    const restrictLine = (() => {
      const r = pkg.restrictionRules
      const lines: string[] = []
      if (r.memberOnly) lines.push('会员专享')
      if (r.childrenNotAllowed) lines.push('儿童不可选')
      if (r.pregnancyNeedDoctor) lines.push('孕期需医生确认')
      if (r.holidayNotAvailable) lines.push('节假日不可用')
      if (r.minimumConsumption.enabled && r.minimumConsumption.amount > 0) lines.push(`最低消费 ¥${r.minimumConsumption.amount}`)
      if (!r.stackableDiscount) lines.push('不与其他优惠同享')
      return lines.length ? lines.join('／') : '无特殊限制'
    })()
    return `<!DOCTYPE html>
<html><head><meta charset="utf-8"><title>报价确认单</title>
<style>
  body { font-family: -apple-system,"Microsoft YaHei",sans-serif; margin:0; padding:24px; color:#333; }
  .q-head { text-align:center; border-bottom:2px solid #00b894; padding-bottom:12px; margin-bottom:16px;}
  .q-title { font-size:20px; font-weight:700; color:#00b894;}
  .q-sub { font-size:12px; color:#999; margin-top:4px;}
  .q-row { display:flex; padding:6px 0; border-bottom:1px dashed #eee; font-size:14px;}
  .q-label { width:110px; color:#666; }
  .q-val { flex:1; font-weight:600; }
  .q-block { margin-top:14px; }
  .q-block h3 { font-size:15px; color:#00b894; margin:0 0 8px 0; padding-bottom:4px; border-bottom:1px solid #f0f0f0;}
  .q-items { padding-left:0; margin:0; font-size:14px; line-height:1.9;}
  .q-price-row { display:flex; align-items:baseline; gap:14px; padding:10px 0;}
  .q-price-retail { color:#999; text-decoration:line-through; font-size:13px;}
  .q-price-activity { color:#ff6b6b; font-size:24px; font-weight:700;}
  .q-restrict { font-size:13px; color:#e67e22; background:#fff8e1; padding:8px 12px; border-radius:6px;}
  .q-msg { font-size:13px; background:#f0faf7; padding:8px 12px; border-radius:6px; line-height:1.7;}
  .q-sign { display:flex; justify-content:space-between; margin-top:40px; font-size:12px; color:#999; padding-top:10px; border-top:1px dashed #ccc;}
</style></head><body>
  <div class="q-head">
    <div class="q-title">口腔诊所 · 套餐报价确认单</div>
    <div class="q-sub">仅用于意向确认，最终以结算单为准 · ${formatDateTime(new Date().toISOString())}</div>
  </div>
  <div class="q-row"><div class="q-label">顾客姓名</div><div class="q-val">${cus.name || '________'}</div></div>
  <div class="q-row"><div class="q-label">联系电话</div><div class="q-val">${cus.phone || '________'}</div></div>
  <div class="q-row"><div class="q-label">年龄</div><div class="q-val">${cus.age !== null ? cus.age + ' 岁' : '________'}</div></div>
  <div class="q-row"><div class="q-label">会员身份</div><div class="q-val">${cus.isMember ? '☑ 是会员' : '☐ 非会员'}</div></div>
  <div class="q-row"><div class="q-label">孕期状态</div><div class="q-val">${cus.isPregnant ? '☑ 处于孕期（需医生确认）' : '☐ 否'}</div></div>
  <div class="q-row"><div class="q-label">预约时间</div><div class="q-val">${fd.appointmentDate || '____'} ${fd.appointmentTime || '____'}</div></div>
  <div class="q-block"><h3>意向套餐：${pkg.packageInfo.name}</h3>
    <div class="q-price-row">
      <span>门市价 <span class="q-price-retail">¥${pkg.packageInfo.retailPrice}</span></span>
      <span>活动价 <span class="q-price-activity">¥${pkg.packageInfo.activityPrice}</span></span>
    </div>
    <div style="font-size:13px; color:#666; margin-bottom:6px;">包含项目：</div>
    <ul class="q-items">${items}</ul>
  </div>
  <div class="q-block"><h3>限制与说明</h3>
    <div class="q-restrict">${restrictLine}</div>
  </div>
  <div class="q-block"><h3>前台对顾客的话术</h3>
    <div class="q-msg">${res.customerMessage}</div>
  </div>
  ${cus.note ? `<div class="q-block"><h3>备注</h3><div style="font-size:13px; color:#555;">${cus.note}</div></div>` : ''}
  <div class="q-sign">
    <span>前台签字：__________</span>
    <span>顾客签字：__________</span>
    <span>日期：${fd.appointmentDate || '____'}</span>
  </div>
</body></html>`
  }

  return (
    <div className="frontdesk-page">
      <div className="frontdesk-left">
        <div className="fd-panel">
          <h2 className="section-title">顾客信息录入</h2>
          <p className="section-desc">前台只需要填写以下几项，系统会自动判断哪些套餐可收</p>

          {inputIncomplete && (
            <div className="fd-warning">
              <strong>⚠️ 请先补全必填信息：</strong>
              <ul>
                {ageEmpty && <li>顾客年龄</li>}
                {dateEmpty && <li>预约日期</li>}
                {timeEmpty && <li>预约时间</li>}
              </ul>
            </div>
          )}

          <div className="form-group">
            <label>顾客年龄 <span className="required-star">*</span></label>
            <input
              type="number"
              min={0}
              max={150}
              value={input.age ?? ''}
              onChange={(e) => update('age', e.target.value === '' ? null : Number(e.target.value))}
              placeholder="请输入年龄"
              className={`form-input ${ageEmpty ? 'input-error' : ''}`}
            />
          </div>

          <div className="form-group">
            <label>预约日期 <span className="required-star">*</span></label>
            <input
              type="date"
              value={input.appointmentDate}
              onChange={(e) => update('appointmentDate', e.target.value)}
              className={`form-input ${dateEmpty ? 'input-error' : ''}`}
            />
          </div>

          <div className="form-group">
            <label>预约时间 <span className="required-star">*</span></label>
            <input
              type="time"
              value={input.appointmentTime}
              onChange={(e) => update('appointmentTime', e.target.value)}
              className={`form-input ${timeEmpty ? 'input-error' : ''}`}
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

        {/* ===== 最近报价列表 ===== */}
        <div className="fd-panel" style={{ marginTop: 16 }}>
          <h2 className="section-title">最近开过的报价（{store.state.quoteDrafts.length}）</h2>
          {store.state.quoteDrafts.length === 0 ? (
            <div className="no-warnings small"><p>还没有报价记录，点上方可收套餐的「生成成交单」开第一单</p></div>
          ) : (
            <div className="quote-history">
              {store.state.quoteDrafts.slice(0, 10).map((d) => (
                <div key={d.id} className="quote-history-item">
                  <div className="quote-history-top">
                    <span className="quote-history-pkg">{d.packageName}</span>
                    <span className="quote-history-price">¥{d.finalPrice}</span>
                  </div>
                  <div className="quote-history-meta">
                    {d.customer.name || '未留名'} · {d.appointmentDate || '未排期'} · {formatDateTime(d.createdAt)}
                  </div>
                  <div className="quote-history-actions">
                    <button
                      className="btn btn-link"
                      onClick={() => {
                        const fakeResult: FrontDeskResult = {
                          packageId: d.packageId,
                          packageName: d.packageName,
                          allowed: true,
                          reasons: d.restrictionSummary,
                          customerMessage: d.customerMessage,
                        }
                        setCustomer({ ...d.customer })
                        setQuoteModal({
                          open: true,
                          result: fakeResult,
                          snapshotOverride: {
                            packageInfo: d.packageSnapshot.packageInfo,
                            restrictionRules: d.packageSnapshot.restrictionRules,
                          },
                        })
                      }}
                    >查看</button>
                    <button
                      className="btn btn-link danger"
                      onClick={() => store.deleteQuoteDraft(d.id)}
                    >删除</button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="frontdesk-right">
        <div className="fd-panel">
          <h2 className="section-title">
            ✅ 可收套餐
            <span className="result-count">{allowed.length}</span>
          </h2>
          {inputIncomplete ? (
            <div className="no-warnings small"><p>请先补全左侧必填信息（带 * 的项目）</p></div>
          ) : allowed.length === 0 ? (
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
                  <div style={{ marginTop: 10, textAlign: 'right' }}>
                    <button
                      className="btn btn-primary"
                      onClick={() => openQuoteModal(r)}
                    >📝 生成成交单</button>
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

      {/* ===== 成交单弹窗 ===== */}
      {quoteModal.open && quoteModal.result && (() => {
        const livePkg = packages.find((p) => p.id === quoteModal.result!.packageId)
        const snap = quoteModal.snapshotOverride
        const displayInfo = snap ? snap.packageInfo : (livePkg?.packageInfo ?? null)
        if (!displayInfo) return null
        return (
          <div className="modal-mask" onClick={closeQuoteModal}>
            <div className="modal-content" onClick={(e) => e.stopPropagation()}>
              <div className="modal-header">
                <h3>📝 报价确认单 · {quoteModal.result.packageName}</h3>
                <button className="modal-close" onClick={closeQuoteModal}>×</button>
              </div>
              <div className="modal-body">
                {snap && (
                  <div className="fd-warning small" style={{ marginBottom: 12 }}>
                    📋 此为历史报价快照，价格和项目为保存时的数据，不会随套餐修改而变化
                  </div>
                )}
                <div className="quote-summary">
                  <div className="quote-price-row">
                    <span>门市价：<del className="q-retail">¥{displayInfo.retailPrice}</del></span>
                    <span className="q-activity">活动价：¥{displayInfo.activityPrice}</span>
                  </div>
                  <div className="quote-items">
                    <strong>包含项目：</strong>
                    {displayInfo.items.map((x) => x.name).join('、')}
                  </div>
                </div>

                <div className="form-row">
                  <div className="form-group flex-1">
                    <label>顾客姓名</label>
                    <input
                      className="form-input"
                      value={customer.name}
                      onChange={(e) => setCustomer({ ...customer, name: e.target.value })}
                      placeholder="请输入姓名"
                    />
                  </div>
                  <div className="form-group flex-1">
                    <label>联系电话</label>
                    <input
                      className="form-input"
                      value={customer.phone}
                      onChange={(e) => setCustomer({ ...customer, phone: e.target.value })}
                      placeholder="请输入电话"
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label>备注（可选）</label>
                  <textarea
                    className="form-textarea"
                    rows={2}
                    value={customer.note}
                    onChange={(e) => setCustomer({ ...customer, note: e.target.value })}
                    placeholder="如特殊注意事项、过敏史等"
                  />
                </div>

                <div className="fd-warning small">
                  <strong>📣 对顾客话术：</strong>
                  <p style={{ margin: '4px 0 0 0' }}>{quoteModal.result.customerMessage}</p>
                </div>
              </div>
              <div className="modal-footer">
                <button className="btn" onClick={closeQuoteModal}>取消</button>
                <button className="btn" onClick={() => { saveQuoteDraft(); printQuoteModal(); }}>📄 保存并打印</button>
                <button className="btn btn-primary" onClick={saveQuoteDraft}>💾 保存报价草稿</button>
              </div>
            </div>
          </div>
        )
      })()}
    </div>
  )
}

export default FrontDeskQuote
