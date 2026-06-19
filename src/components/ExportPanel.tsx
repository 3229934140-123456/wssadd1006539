import { useState, useRef } from 'react'
import { PackageInfo, ExportSettings, RestrictionRules, OutputType } from '../types'
import { generateFrontDeskText, generateRestrictionSummary } from '../utils/restrictionText'
import PreviewCard from './PreviewCard'

interface Props {
  packageInfo: PackageInfo
  rules: RestrictionRules
  settings: ExportSettings
  onChange: (settings: ExportSettings) => void
}

function ExportPanel({ packageInfo, rules, settings, onChange }: Props) {
  const [previewPage, setPreviewPage] = useState(0)
  const printRef = useRef<HTMLDivElement>(null)

  const outputTypeOptions: { key: OutputType; label: string; icon: string; desc: string }[] = [
    { key: 'deskCard', label: '前台台卡', icon: '🖼', desc: '放置前台展示，简洁明了' },
    { key: 'clinicNotice', label: '诊室告知单', icon: '📋', desc: '详细告知，患者签字确认' },
    { key: 'momentsPoster', label: '朋友圈海报文案', icon: '📱', desc: '适合微信传播，引流获客' },
  ]

  const paperSizes = [
    { value: 'A4' as const, label: 'A4 (210×297mm)', w: 210, h: 297 },
    { value: 'A5' as const, label: 'A5 (148×210mm)', w: 148, h: 210 },
    { value: 'postcard' as const, label: '明信片 (100×148mm)', w: 100, h: 148 },
  ]

  const handleChange = (field: keyof ExportSettings, value: string | boolean | OutputType[]) => {
    onChange({ ...settings, [field]: value })
  }

  const toggleOutputType = (key: OutputType) => {
    const current = settings.outputTypes
    if (current.includes(key)) {
      if (current.length > 1) {
        handleChange('outputTypes', current.filter((t) => t !== key))
      }
    } else {
      handleChange('outputTypes', [...current, key])
    }
  }

  const formatDate = (dateStr: string) => {
    if (!dateStr) return '长期有效'
    const d = new Date(dateStr)
    return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, '0')}.${String(d.getDate()).padStart(2, '0')}`
  }

  const restrictionLines = generateFrontDeskText(rules)
  const restrictionTags = generateRestrictionSummary(rules)

  const scaleFromPaper = () => {
    const ps = paperSizes.find((p) => p.value === settings.paperSize)
    if (!ps) return 1
    const maxW = 440
    return maxW / ps.w
  }

  const paperStyle = (): React.CSSProperties => {
    const ps = paperSizes.find((p) => p.value === settings.paperSize)
    if (!ps) return {}
    const scale = scaleFromPaper()
    return {
      width: ps.w * scale,
      minHeight: ps.h * scale,
    }
  }

  const handlePrint = () => {
    const printWindow = window.open('', '_blank')
    if (!printWindow || !printRef.current) return
    const content = printRef.current.innerHTML
    printWindow.document.write(`<!DOCTYPE html><html><head><meta charset="utf-8"><title>打印价目单</title><style>body{margin:0;padding:20px;font-family:-apple-system,BlinkMacSystemFont,'PingFang SC','Microsoft YaHei',sans-serif;color:#333;}@page{size:${settings.paperSize};margin:10mm;}.page{page-break-after:always;padding:20px;}.page:last-child{page-break-after:auto;}</style></head><body>${content}</body></html>`)
    printWindow.document.close()
    printWindow.print()
  }

  const handleExportText = () => {
    const storeName = settings.storeName || '口腔诊所'
    const allContent: string[] = []

    settings.outputTypes.forEach((type) => {
      switch (type) {
        case 'deskCard':
          allContent.push(generateDeskCardText(storeName))
          break
        case 'clinicNotice':
          allContent.push(generateClinicNoticeText(storeName))
          break
        case 'momentsPoster':
          allContent.push(generateMomentsText(storeName))
          break
      }
    })

    const blob = new Blob([allContent.join('\n\n' + '—'.repeat(40) + '\n\n')], { type: 'text/plain;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${packageInfo.name || '套餐'}_价目单.txt`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  const generateDeskCardText = (storeName: string) => {
    let text = `${storeName}\n${'='.repeat(30)}\n\n`
    text += `【${packageInfo.name || '套餐名称'}】\n\n`
    text += `适用人群：${packageInfo.targetAudience || '全年龄段'}\n\n包含项目：\n`
    packageInfo.items.forEach((item) => { text += `  ✓ ${item.name}\n` })
    text += '\n'
    if (settings.showOriginalPrice) text += `门市价：¥${packageInfo.retailPrice}\n`
    text += `活动价：¥${packageInfo.activityPrice}\n\n`
    text += `有效期：${formatDate(packageInfo.validFrom)} - ${formatDate(packageInfo.validTo)}\n`
    text += `${packageInfo.allowTransfer ? '可转赠' : '不可转赠'}\n`
    if (restrictionTags.length > 0) text += `\n使用限制：${restrictionTags.join(' · ')}\n`
    text += `\n${'='.repeat(30)}\n地址：__________ 电话：__________`
    return text
  }

  const generateClinicNoticeText = (storeName: string) => {
    let text = `${storeName} - 诊室告知单\n${'='.repeat(40)}\n\n`
    text += `套餐名称：${packageInfo.name || '套餐名称'}\n适用人群：${packageInfo.targetAudience || '全年龄段'}\n\n服务内容：\n`
    packageInfo.items.forEach((item, idx) => { text += `  ${idx + 1}. ${item.name}\n` })
    text += '\n费用说明：\n'
    if (settings.showOriginalPrice) text += `  门市价：¥${packageInfo.retailPrice}\n`
    text += `  实收价：¥${packageInfo.activityPrice}\n\n使用规则：\n`
    text += `  • 有效期：${formatDate(packageInfo.validFrom)} 至 ${formatDate(packageInfo.validTo)}\n`
    text += `  • ${packageInfo.allowTransfer ? '可转赠他人使用' : '仅限本人使用'}\n`
    restrictionLines.forEach((line) => { text += `  • ${line}\n` })
    text += `\n${'='.repeat(40)}\n患者确认签字：__________  日期：__________\n医生/护士签字：__________`
    return text
  }

  const generateMomentsText = (storeName: string) => {
    let text = `【${storeName}】特惠来袭！🦷✨\n\n🌟 ${packageInfo.name || '超值套餐'} 🌟\n\n适用：${packageInfo.targetAudience || '所有人'}\n\n🎁 包含项目：\n`
    packageInfo.items.forEach((item) => { text += `   ✨ ${item.name}\n` })
    text += '\n'
    if (settings.showOriginalPrice) text += `💰 原价 ¥${packageInfo.retailPrice}\n`
    text += `🎉 活动价仅需 ¥${packageInfo.activityPrice}！\n\n⏰ 活动时间：${formatDate(packageInfo.validFrom)} - ${formatDate(packageInfo.validTo)}\n`
    if (packageInfo.allowTransfer) text += '🎁 支持转赠，送家人送朋友都合适！\n'
    text += `\n📍 ${storeName}\n📞 预约电话：__________\n\n转发此海报到朋友圈，到店出示即可享受优惠！\n#口腔护理 #洁牙 #健康牙齿`
    return text
  }

  const renderDeskCard = () => (
    <div className={`print-page paper-${settings.paperSize.toLowerCase()}`} style={paperStyle()}>
      <div className="desk-card-store">{settings.storeName || '口腔诊所'}</div>
      <PreviewCard packageInfo={packageInfo} showOriginalPrice={settings.showOriginalPrice} />
      {restrictionTags.length > 0 && (
        <div className="card-restriction-tags">
          {restrictionTags.map((tag, i) => (
            <span key={i} className="restriction-tag-item">{tag}</span>
          ))}
        </div>
      )}
      <div className="card-footer-contact">
        地址：__________ 电话：__________
      </div>
    </div>
  )

  const renderClinicNotice = () => (
    <div className={`print-page paper-${settings.paperSize.toLowerCase()}`} style={paperStyle()}>
      <div className="clinic-notice-preview">
        <h3>{settings.storeName || '口腔诊所'} - 诊室告知单</h3>
        <div className="notice-content">
          <p><strong>套餐名称：</strong>{packageInfo.name || '套餐名称'}</p>
          <p><strong>适用人群：</strong>{packageInfo.targetAudience || '全年龄段'}</p>
          <h4>服务内容：</h4>
          <ol>
            {packageInfo.items.length > 0 ? packageInfo.items.map((item) => (
              <li key={item.id}>{item.name}</li>
            )) : <li>暂无项目</li>}
          </ol>
          <h4>费用说明：</h4>
          {settings.showOriginalPrice && <p>门市价：¥{packageInfo.retailPrice}</p>}
          <p className="highlight-price">实收价：¥{packageInfo.activityPrice}</p>
          <h4>使用规则：</h4>
          <ul>
            <li>有效期：{formatDate(packageInfo.validFrom)} 至 {formatDate(packageInfo.validTo)}</li>
            <li>{packageInfo.allowTransfer ? '可转赠他人使用' : '仅限本人使用'}</li>
            {restrictionLines.map((line, i) => (
              <li key={i}>{line}</li>
            ))}
          </ul>
        </div>
        <div className="notice-signatures">
          <div className="signature-line"><span>患者确认签字：</span><span className="signature-placeholder">____________</span></div>
          <div className="signature-line"><span>日期：</span><span className="signature-placeholder">____________</span></div>
          <div className="signature-line"><span>医生/护士签字：</span><span className="signature-placeholder">____________</span></div>
        </div>
      </div>
    </div>
  )

  const renderMomentsPoster = () => (
    <div className={`print-page paper-${settings.paperSize.toLowerCase()}`} style={paperStyle()}>
      <div className="moments-preview">
        <div className="moments-header">
          <div className="moments-avatar">🦷</div>
          <div className="moments-name">{settings.storeName || '口腔诊所'}</div>
        </div>
        <div className="moments-content">
          <p>【{settings.storeName || '口腔诊所'}】特惠来袭！🦷✨</p>
          <p><strong>🌟 {packageInfo.name || '超值套餐'} 🌟</strong></p>
          <p>适用：{packageInfo.targetAudience || '所有人'}</p>
          <p>🎁 包含项目：</p>
          {packageInfo.items.map((item) => (
            <p key={item.id}>&nbsp;&nbsp;&nbsp;✨ {item.name}</p>
          ))}
          {settings.showOriginalPrice && <p>💰 原价 ¥{packageInfo.retailPrice}</p>}
          <p className="moments-price">🎉 活动价仅需 <strong>¥{packageInfo.activityPrice}</strong>！</p>
          <p>⏰ 活动时间：{formatDate(packageInfo.validFrom)} - {formatDate(packageInfo.validTo)}</p>
          {packageInfo.allowTransfer && <p>🎁 支持转赠，送家人送朋友都合适！</p>}
          {restrictionTags.length > 0 && (
            <p className="moments-restrictions">📌 {restrictionTags.join(' · ')}</p>
          )}
          <p className="hashtags">#口腔护理 #洁牙 #健康牙齿</p>
        </div>
      </div>
    </div>
  )

  const previewRenderers: Record<OutputType, () => JSX.Element> = {
    deskCard: renderDeskCard,
    clinicNotice: renderClinicNotice,
    momentsPoster: renderMomentsPoster,
  }

  const activeOutput = settings.outputTypes[previewPage] || settings.outputTypes[0]

  return (
    <div className="export-container">
      <div className="export-settings">
        <h2 className="section-title">打印/导出设置</h2>
        <p className="section-desc">设置输出参数，批量生成标准价目单</p>

        <div className="form-group">
          <label>门店名称</label>
          <input type="text" value={settings.storeName} onChange={(e) => handleChange('storeName', e.target.value)} placeholder="请输入门店名称" className="form-input" />
        </div>

        <div className="form-group">
          <label>纸张大小</label>
          <div className="radio-group">
            {paperSizes.map((size) => (
              <label key={size.value} className="radio-label">
                <input type="radio" name="paperSize" value={size.value} checked={settings.paperSize === size.value} onChange={(e) => handleChange('paperSize', e.target.value)} />
                <span>{size.label}</span>
              </label>
            ))}
          </div>
        </div>

        <div className="form-group">
          <label className="checkbox-label">
            <input type="checkbox" checked={settings.showOriginalPrice} onChange={(e) => handleChange('showOriginalPrice', e.target.checked)} className="form-checkbox" />
            <span>显示原价（门市价）</span>
          </label>
        </div>

        <div className="form-group">
          <label>输出类型（可多选批量生成）</label>
          <div className="output-type-grid">
            {outputTypeOptions.map((type) => (
              <div
                key={type.key}
                className={`output-type-card ${settings.outputTypes.includes(type.key) ? 'active' : ''}`}
                onClick={() => toggleOutputType(type.key)}
              >
                <div className="output-type-header">
                  <input
                    type="checkbox"
                    checked={settings.outputTypes.includes(type.key)}
                    onChange={() => toggleOutputType(type.key)}
                    className="form-checkbox"
                    onClick={(e) => e.stopPropagation()}
                  />
                  <span className="output-icon">{type.icon}</span>
                  <span className="output-label">{type.label}</span>
                </div>
                <div className="output-desc">{type.desc}</div>
              </div>
            ))}
          </div>
        </div>

        <div className="export-actions">
          <button onClick={handlePrint} className="btn btn-primary">
            打印所选
          </button>
          <button onClick={handleExportText} className="btn btn-secondary">
            导出文案
          </button>
        </div>
      </div>

      <div className="export-preview">
        <div className="preview-header-bar">
          <h2 className="section-title" style={{ marginBottom: 0 }}>
            预览 - {outputTypeOptions.find((t) => t.key === activeOutput)?.label}
            <span className="paper-badge">{settings.paperSize}</span>
          </h2>
          {settings.outputTypes.length > 1 && (
            <div className="preview-pagination">
              {settings.outputTypes.map((type, idx) => (
                <button
                  key={type}
                  className={`page-dot ${previewPage === idx ? 'active' : ''}`}
                  onClick={() => setPreviewPage(idx)}
                  title={outputTypeOptions.find((t) => t.key === type)?.label}
                />
              ))}
              <span className="page-info">{previewPage + 1} / {settings.outputTypes.length}</span>
            </div>
          )}
        </div>
        <div className="preview-content" ref={printRef}>
          {(previewRenderers[activeOutput] || renderDeskCard)()}
        </div>
      </div>
    </div>
  )
}

export default ExportPanel
