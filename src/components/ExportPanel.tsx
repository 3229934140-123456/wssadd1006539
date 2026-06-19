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

  if (previewPage >= settings.outputTypes.length) {
    setTimeout(() => setPreviewPage(0), 0)
  }

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

  const paperPrintStyle = (): React.CSSProperties => {
    const ps = paperSizes.find((p) => p.value === settings.paperSize)
    if (!ps) return {}
    return {
      width: ps.w + 'mm',
      minHeight: ps.h + 'mm',
    }
  }

  const handlePrint = () => {
    const printWindow = window.open('', '_blank')
    if (!printWindow || !printRef.current) return

    const pagesHtml: string[] = []
    settings.outputTypes.forEach((type) => {
      if (type === 'deskCard') pagesHtml.push(renderDeskCardHtml())
      if (type === 'clinicNotice') pagesHtml.push(renderClinicNoticeHtml())
      if (type === 'momentsPoster') pagesHtml.push(renderMomentsPosterHtml())
    })

    const html = `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<title>${packageInfo.name || '价目单'}</title>
<style>
  * { box-sizing: border-box; }
  body {
    margin: 0;
    font-family: -apple-system, BlinkMacSystemFont, 'PingFang SC', 'Microsoft YaHei', sans-serif;
    color: #333;
  }
  @page {
    size: ${settings.paperSize};
    margin: 10mm;
  }
  .print-page {
    page-break-after: always;
    padding: 0;
    background: white;
  }
  .print-page:last-child { page-break-after: auto; }
  ${printCssRules()}
</style>
</head>
<body>${pagesHtml.join('')}</body>
</html>`

    printWindow.document.write(html)
    printWindow.document.close()
    setTimeout(() => printWindow.print(), 200)
  }

  const printCssRules = () => `
    .desk-card-store { text-align: center; font-size: 15px; font-weight: 600; color: #333; margin-bottom: 14px; }
    .preview-card { background: linear-gradient(135deg, #ffffff 0%, #f8fdfb 100%); border: 1px solid #e8f5f2; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 16px rgba(0, 184, 148, 0.08); }
    .preview-card-header { background: linear-gradient(135deg, #00b894 0%, #00cec9 100%); color: white; padding: 18px; text-align: center; }
    .preview-package-name { font-size: 19px; font-weight: 600; margin-bottom: 6px; }
    .preview-audience-tag { display: inline-block; padding: 3px 12px; background: rgba(255,255,255,0.25); border-radius: 12px; font-size: 12px; }
    .preview-card-body { padding: 18px; }
    .preview-items { margin-bottom: 16px; }
    .preview-items h4 { font-size: 13px; color: #666; margin-bottom: 10px; font-weight: 500; }
    .preview-items ul { display: flex; flex-direction: column; gap: 8px; }
    .preview-items li { display: flex; align-items: center; gap: 8px; font-size: 14px; color: #333; }
    .check-icon { color: #00b894; font-weight: bold; }
    .preview-price { text-align: center; padding: 14px 0; border-top: 1px dashed #e8f5f2; }
    .original-price { font-size: 14px; color: #999; margin-bottom: 6px; }
    .original-price span { text-decoration: line-through; }
    .activity-price { display: flex; align-items: baseline; justify-content: center; gap: 4px; }
    .price-symbol { font-size: 16px; color: #ff6b6b; font-weight: 600; }
    .price-value { font-size: 32px; font-weight: 700; color: #ff6b6b; }
    .discount-tag { margin-left: 8px; padding: 3px 10px; background: #ff6b6b; color: white; font-size: 12px; border-radius: 4px; font-weight: 500; }
    .preview-card-footer { padding: 10px 18px; background: #f8fdfb; display: flex; justify-content: space-between; align-items: center; font-size: 12px; color: #888; }
    .transfer-allowed { color: #00b894; }
    .transfer-not-allowed { color: #999; }
    .card-restriction-tags { display: flex; flex-wrap: wrap; gap: 6px; margin-top: 12px; justify-content: center; }
    .restriction-tag-item { padding: 3px 10px; background: #fef0f0; color: #e74c3c; border-radius: 12px; font-size: 11px; font-weight: 500; }
    .card-footer-contact { text-align: center; font-size: 12px; color: #999; margin-top: 16px; padding-top: 12px; border-top: 1px dashed #e4e7ed; }
    .clinic-notice-preview { background: white; padding: 20px; }
    .clinic-notice-preview h3 { text-align: center; font-size: 17px; color: #333; margin-bottom: 16px; padding-bottom: 10px; border-bottom: 2px solid #00b894; }
    .notice-content { margin-bottom: 24px; }
    .notice-content p { margin-bottom: 8px; font-size: 14px; color: #333; line-height: 1.7; }
    .notice-content h4 { font-size: 14px; color: #333; margin: 14px 0 8px; }
    .notice-content ol, .notice-content ul { margin-left: 20px; margin-bottom: 8px; }
    .notice-content li { margin-bottom: 4px; font-size: 13px; color: #555; }
    .notice-content ol { list-style: decimal; }
    .notice-content ul { list-style: disc; }
    .highlight-price { color: #ff6b6b; font-size: 15px !important; font-weight: 600; }
    .notice-signatures { margin-top: 24px; display: flex; flex-direction: column; gap: 14px; }
    .signature-line { display: flex; align-items: center; font-size: 14px; color: #555; }
    .signature-placeholder { flex: 1; border-bottom: 1px solid #333; margin-left: 8px; }
    .moments-preview { background: white; border-radius: 12px; overflow: hidden; box-shadow: 0 2px 12px rgba(0,0,0,0.1); }
    .moments-header { display: flex; align-items: center; gap: 12px; padding: 14px; border-bottom: 1px solid #f0f0f0; }
    .moments-avatar { width: 44px; height: 44px; background: linear-gradient(135deg, #00b894 0%, #00cec9 100%); border-radius: 8px; display: flex; align-items: center; justify-content: center; font-size: 24px; }
    .moments-name { font-size: 14px; font-weight: 600; color: #576b95; }
    .moments-content { padding: 14px; }
    .moments-content p { font-size: 14px; color: #333; line-height: 1.7; margin-bottom: 6px; }
    .moments-price { font-size: 15px !important; color: #333; }
    .moments-price strong { color: #ff6b6b; font-size: 17px; }
    .moments-restrictions { color: #e74c3c !important; font-size: 12px !important; }
    .hashtags { color: #576b95 !important; margin-top: 10px !important; font-size: 13px !important; }
  `

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
    if (rules.minimumConsumption.enabled && rules.minimumConsumption.amount > 0) {
      text += `\n最低消费：¥${rules.minimumConsumption.amount}\n`
    }
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
    text += `  实收价：¥${packageInfo.activityPrice}\n`
    if (rules.minimumConsumption.enabled && rules.minimumConsumption.amount > 0) {
      text += `  最低消费：¥${rules.minimumConsumption.amount}\n`
    }
    text += '\n使用规则：\n'
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
    text += `🎉 活动价仅需 ¥${packageInfo.activityPrice}！`
    if (rules.minimumConsumption.enabled && rules.minimumConsumption.amount > 0) {
      text += `（最低消费 ¥${rules.minimumConsumption.amount}）`
    }
    text += `\n\n⏰ 活动时间：${formatDate(packageInfo.validFrom)} - ${formatDate(packageInfo.validTo)}\n`
    if (packageInfo.allowTransfer) text += '🎁 支持转赠，送家人送朋友都合适！\n'
    text += `\n📍 ${storeName}\n📞 预约电话：__________\n\n转发此海报到朋友圈，到店出示即可享受优惠！\n#口腔护理 #洁牙 #健康牙齿`
    return text
  }

  const renderDeskCardHtml = () => {
    const minCon = (rules.minimumConsumption.enabled && rules.minimumConsumption.amount > 0)
      ? `<div class="card-min-consumption">最低消费 ¥${rules.minimumConsumption.amount}</div>`
      : ''
    const discount = packageInfo.retailPrice > 0 ? Math.round((packageInfo.activityPrice / packageInfo.retailPrice) * 100) / 10 : 0
    return `<div class="print-page" style="${inlineStyle(paperPrintStyle())}">
      <div class="desk-card-store">${settings.storeName || '口腔诊所'}</div>
      <div class="preview-card">
        <div class="preview-card-header">
          <div class="preview-package-name">${escapeHtml(packageInfo.name || '套餐名称')}</div>
          ${packageInfo.targetAudience ? `<span class="preview-audience-tag">${escapeHtml(packageInfo.targetAudience)}</span>` : ''}
        </div>
        <div class="preview-card-body">
          <div class="preview-items">
            <h4>包含项目</h4>
            <ul>
              ${packageInfo.items.length > 0 ? packageInfo.items.map((it) => `<li><span class="check-icon">✓</span>${escapeHtml(it.name)}</li>`).join('') : '<li style="color:#c0c4cc;font-style:italic">暂无项目</li>'}
            </ul>
          </div>
          <div class="preview-price">
            ${settings.showOriginalPrice && packageInfo.retailPrice > 0 ? `<div class="original-price">门市价：<span>¥${packageInfo.retailPrice}</span></div>` : ''}
            <div class="activity-price">
              <span class="price-symbol">¥</span>
              <span class="price-value">${packageInfo.activityPrice > 0 ? packageInfo.activityPrice : '0'}</span>
              ${discount > 0 && discount < 10 ? `<span class="discount-tag">${discount}折</span>` : ''}
            </div>
          </div>
        </div>
        <div class="preview-card-footer">
          <div class="valid-period">有效期：${formatDate(packageInfo.validFrom)} 至 ${formatDate(packageInfo.validTo)}</div>
          <div class="transfer-info">${packageInfo.allowTransfer ? '<span class="transfer-allowed">可转赠</span>' : '<span class="transfer-not-allowed">不可转赠</span>'}</div>
        </div>
      </div>
      ${restrictionTags.length > 0 ? `<div class="card-restriction-tags">${restrictionTags.map((t) => `<span class="restriction-tag-item">${escapeHtml(t)}</span>`).join('')}</div>` : ''}
      ${minCon}
      <div class="card-footer-contact">地址：__________ 电话：__________</div>
    </div>`
  }

  const renderClinicNoticeHtml = () => {
    return `<div class="print-page" style="${inlineStyle(paperPrintStyle())}">
      <div class="clinic-notice-preview">
        <h3>${settings.storeName || '口腔诊所'} - 诊室告知单</h3>
        <div class="notice-content">
          <p><strong>套餐名称：</strong>${escapeHtml(packageInfo.name || '套餐名称')}</p>
          <p><strong>适用人群：</strong>${escapeHtml(packageInfo.targetAudience || '全年龄段')}</p>
          <h4>服务内容：</h4>
          <ol>
            ${packageInfo.items.length > 0 ? packageInfo.items.map((it) => `<li>${escapeHtml(it.name)}</li>`).join('') : '<li>暂无项目</li>'}
          </ol>
          <h4>费用说明：</h4>
          ${settings.showOriginalPrice ? `<p>门市价：¥${packageInfo.retailPrice}</p>` : ''}
          <p class="highlight-price">实收价：¥${packageInfo.activityPrice}</p>
          ${rules.minimumConsumption.enabled && rules.minimumConsumption.amount > 0 ? `<p><strong>最低消费：</strong>¥${rules.minimumConsumption.amount}（不足部分不退不补）</p>` : ''}
          <h4>使用规则：</h4>
          <ul>
            <li>有效期：${formatDate(packageInfo.validFrom)} 至 ${formatDate(packageInfo.validTo)}</li>
            <li>${packageInfo.allowTransfer ? '可转赠他人使用' : '仅限本人使用'}</li>
            ${restrictionLines.map((l) => `<li>${escapeHtml(l)}</li>`).join('')}
          </ul>
        </div>
        <div class="notice-signatures">
          <div class="signature-line"><span>患者确认签字：</span><span class="signature-placeholder"></span></div>
          <div class="signature-line"><span>日期：</span><span class="signature-placeholder"></span></div>
          <div class="signature-line"><span>医生/护士签字：</span><span class="signature-placeholder"></span></div>
        </div>
      </div>
    </div>`
  }

  const renderMomentsPosterHtml = () => {
    return `<div class="print-page" style="${inlineStyle(paperPrintStyle())}">
      <div class="moments-preview">
        <div class="moments-header">
          <div class="moments-avatar">🦷</div>
          <div class="moments-name">${escapeHtml(settings.storeName || '口腔诊所')}</div>
        </div>
        <div class="moments-content">
          <p>【${escapeHtml(settings.storeName || '口腔诊所')}】特惠来袭！🦷✨</p>
          <p><strong>🌟 ${escapeHtml(packageInfo.name || '超值套餐')} 🌟</strong></p>
          <p>适用：${escapeHtml(packageInfo.targetAudience || '所有人')}</p>
          <p>🎁 包含项目：</p>
          ${packageInfo.items.map((it) => `<p>&nbsp;&nbsp;&nbsp;✨ ${escapeHtml(it.name)}</p>`).join('')}
          ${settings.showOriginalPrice ? `<p>💰 原价 ¥${packageInfo.retailPrice}</p>` : ''}
          <p class="moments-price">🎉 活动价仅需 <strong>¥${packageInfo.activityPrice}</strong>${rules.minimumConsumption.enabled && rules.minimumConsumption.amount > 0 ? `（最低消费 ¥${rules.minimumConsumption.amount}）` : ''}！</p>
          <p>⏰ 活动时间：${formatDate(packageInfo.validFrom)} - ${formatDate(packageInfo.validTo)}</p>
          ${packageInfo.allowTransfer ? '<p>🎁 支持转赠，送家人送朋友都合适！</p>' : ''}
          ${restrictionTags.length > 0 ? `<p class="moments-restrictions">📌 ${restrictionTags.map(escapeHtml).join(' · ')}</p>` : ''}
          <p class="hashtags">#口腔护理 #洁牙 #健康牙齿</p>
        </div>
      </div>
    </div>`
  }

  function escapeHtml(s: string) {
    return s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c] || c))
  }

  function inlineStyle(style: React.CSSProperties): string {
    return Object.entries(style).map(([k, v]) => `${k.replace(/[A-Z]/g, (m) => '-' + m.toLowerCase())}:${v}`).join(';')
  }

  const renderDeskCard = () => (
    <div className={`print-page paper-${settings.paperSize.toLowerCase()}`} style={paperStyle()}>
      <div className="desk-card-store">{settings.storeName || '口腔诊所'}</div>
      <PreviewCard packageInfo={packageInfo} showOriginalPrice={settings.showOriginalPrice} />
      {rules.minimumConsumption.enabled && rules.minimumConsumption.amount > 0 && (
        <div className="card-min-consumption">最低消费 ¥{rules.minimumConsumption.amount}（不足部分不退不补）</div>
      )}
      {restrictionTags.length > 0 && (
        <div className="card-restriction-tags">
          {restrictionTags.map((tag, i) => (
            <span key={i} className="restriction-tag-item">{tag}</span>
          ))}
        </div>
      )}
      <div className="card-footer-contact">地址：__________ 电话：__________</div>
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
          {rules.minimumConsumption.enabled && rules.minimumConsumption.amount > 0 && (
            <p><strong>最低消费：</strong>¥{rules.minimumConsumption.amount}（不足部分不退不补）</p>
          )}
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
          <p className="moments-price">
            🎉 活动价仅需 <strong>¥{packageInfo.activityPrice}</strong>
            {rules.minimumConsumption.enabled && rules.minimumConsumption.amount > 0 && (
              <span>（最低消费 ¥{rules.minimumConsumption.amount}）</span>
            )}！
          </p>
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
          <label>纸张大小（版式会跟随变化）</label>
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
          <label>输出物料（可多选，打印时会输出全部）</label>
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
          <div className="output-selected-hint">
            已选 {settings.outputTypes.length} 项物料，打印时会自动分页输出
          </div>
        </div>

        <div className="export-actions">
          <button onClick={handlePrint} className="btn btn-primary">
            🖨 打印所选（共{settings.outputTypes.length}页）
          </button>
          <button onClick={handleExportText} className="btn btn-secondary">
            📥 导出文案
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
              <button
                className="page-arrow"
                onClick={() => setPreviewPage(Math.max(0, previewPage - 1))}
                disabled={previewPage === 0}
              >‹</button>
              {settings.outputTypes.map((type, idx) => (
                <button
                  key={type}
                  className={`page-dot ${previewPage === idx ? 'active' : ''}`}
                  onClick={() => setPreviewPage(idx)}
                  title={outputTypeOptions.find((t) => t.key === type)?.label}
                />
              ))}
              <button
                className="page-arrow"
                onClick={() => setPreviewPage(Math.min(settings.outputTypes.length - 1, previewPage + 1))}
                disabled={previewPage === settings.outputTypes.length - 1}
              >›</button>
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
