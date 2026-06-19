import { useState } from 'react'
import { PackageInfo, ExportSettings, RestrictionRules } from '../types'
import PreviewCard from './PreviewCard'

interface Props {
  packageInfo: PackageInfo
  rules: RestrictionRules
  settings: ExportSettings
  onChange: (settings: ExportSettings) => void
}

type OutputType = 'deskCard' | 'clinicNotice' | 'momentsPoster'

function ExportPanel({ packageInfo, rules, settings, onChange }: Props) {
  const [activeOutput, setActiveOutput] = useState<OutputType>('deskCard')

  const handleChange = (field: keyof ExportSettings, value: string | boolean) => {
    onChange({ ...settings, [field]: value })
  }

  const formatDate = (dateStr: string) => {
    if (!dateStr) return '长期有效'
    const date = new Date(dateStr)
    return `${date.getFullYear()}.${String(date.getMonth() + 1).padStart(2, '0')}.${String(date.getDate()).padStart(2, '0')}`
  }

  const handlePrint = () => {
    window.print()
  }

  const handleExportText = () => {
    let content = ''
    const storeName = settings.storeName || '口腔诊所'

    switch (activeOutput) {
      case 'deskCard':
        content = generateDeskCardText(storeName)
        break
      case 'clinicNotice':
        content = generateClinicNoticeText(storeName)
        break
      case 'momentsPoster':
        content = generateMomentsText(storeName)
        break
    }

    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${packageInfo.name || '套餐'}_${activeOutput}.txt`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  const generateDeskCardText = (storeName: string) => {
    let text = `${storeName}\n`
    text += `${'='.repeat(30)}\n\n`
    text += `【${packageInfo.name || '套餐名称'}】\n\n`
    text += `适用人群：${packageInfo.targetAudience || '全年龄段'}\n\n`
    text += `包含项目：\n`
    packageInfo.items.forEach((item) => {
      text += `  ✓ ${item.name}\n`
    })
    text += `\n`
    if (settings.showOriginalPrice) {
      text += `门市价：¥${packageInfo.retailPrice}\n`
    }
    text += `活动价：¥${packageInfo.activityPrice}\n\n`
    text += `有效期：${formatDate(packageInfo.validFrom)} - ${formatDate(packageInfo.validTo)}\n`
    text += `${packageInfo.allowTransfer ? '可转赠' : '不可转赠'}\n`
    text += `\n${'='.repeat(30)}\n`
    text += `地址：__________ 电话：__________`
    return text
  }

  const generateClinicNoticeText = (storeName: string) => {
    let text = `${storeName} - 诊室告知单\n`
    text += `${'='.repeat(40)}\n\n`
    text += `套餐名称：${packageInfo.name || '套餐名称'}\n`
    text += `适用人群：${packageInfo.targetAudience || '全年龄段'}\n\n`
    text += `服务内容：\n`
    packageInfo.items.forEach((item, index) => {
      text += `  ${index + 1}. ${item.name}\n`
    })
    text += `\n费用说明：\n`
    if (settings.showOriginalPrice) {
      text += `  门市价：¥${packageInfo.retailPrice}\n`
    }
    text += `  实收价：¥${packageInfo.activityPrice}\n\n`
    text += `使用规则：\n`
    text += `  • 有效期：${formatDate(packageInfo.validFrom)} 至 ${formatDate(packageInfo.validTo)}\n`
    text += `  • ${packageInfo.allowTransfer ? '可转赠他人使用' : '仅限本人使用'}\n`
    if (rules.childrenNotAllowed) text += `  • 儿童不可使用\n`
    if (rules.pregnancyNeedDoctor) text += `  • 孕妇需经医生确认\n`
    if (rules.memberOnly) text += `  • 仅限会员购买\n`
    if (rules.holidayNotAvailable) text += `  • 节假日不可使用\n`
    text += `\n${'='.repeat(40)}\n`
    text += `患者确认签字：__________  日期：__________\n`
    text += `医生/护士签字：__________\n`
    return text
  }

  const generateMomentsText = (storeName: string) => {
    let text = `【${storeName}】特惠来袭！🦷✨\n\n`
    text += `🌟 ${packageInfo.name || '超值套餐'} 🌟\n\n`
    text += `适用：${packageInfo.targetAudience || '所有人'}\n\n`
    text += `🎁 包含项目：\n`
    packageInfo.items.forEach((item) => {
      text += `   ✨ ${item.name}\n`
    })
    text += `\n`
    if (settings.showOriginalPrice) {
      text += `💰 原价 ¥${packageInfo.retailPrice}\n`
    }
    text += `🎉 活动价仅需 ¥${packageInfo.activityPrice}！\n\n`
    text += `⏰ 活动时间：${formatDate(packageInfo.validFrom)} - ${formatDate(packageInfo.validTo)}\n`
    if (packageInfo.allowTransfer) {
      text += `🎁 支持转赠，送家人送朋友都合适！\n`
    }
    text += `\n📍 ${storeName}\n`
    text += `📞 预约电话：__________\n\n`
    text += `转发此海报到朋友圈，到店出示即可享受优惠！\n`
    text += `#口腔护理 #洁牙 #健康牙齿`
    return text
  }

  const outputTypes: { key: OutputType; label: string; icon: string; desc: string }[] = [
    { key: 'deskCard', label: '前台台卡', icon: '🖼', desc: '放置前台展示，简洁明了' },
    { key: 'clinicNotice', label: '诊室告知单', icon: '📋', desc: '详细告知，患者签字确认' },
    { key: 'momentsPoster', label: '朋友圈海报文案', icon: '📱', desc: '适合微信传播，引流获客' },
  ]

  const paperSizes = [
    { value: 'A4', label: 'A4 (210×297mm)' },
    { value: 'A5', label: 'A5 (148×210mm)' },
    { value: 'postcard', label: '明信片 (100×148mm)' },
  ]

  return (
    <div className="export-container">
      <div className="export-settings">
        <h2 className="section-title">打印/导出设置</h2>
        <p className="section-desc">设置输出参数，生成标准价目单</p>

        <div className="form-group">
          <label>门店名称</label>
          <input
            type="text"
            value={settings.storeName}
            onChange={(e) => handleChange('storeName', e.target.value)}
            placeholder="请输入门店名称"
            className="form-input"
          />
        </div>

        <div className="form-group">
          <label>纸张大小</label>
          <div className="radio-group">
            {paperSizes.map((size) => (
              <label key={size.value} className="radio-label">
                <input
                  type="radio"
                  name="paperSize"
                  value={size.value}
                  checked={settings.paperSize === size.value}
                  onChange={(e) => handleChange('paperSize', e.target.value)}
                />
                <span>{size.label}</span>
              </label>
            ))}
          </div>
        </div>

        <div className="form-group">
          <label className="checkbox-label">
            <input
              type="checkbox"
              checked={settings.showOriginalPrice}
              onChange={(e) => handleChange('showOriginalPrice', e.target.checked)}
              className="form-checkbox"
            />
            <span>显示原价（门市价）</span>
          </label>
        </div>

        <div className="form-group">
          <label>输出类型</label>
          <div className="output-type-grid">
            {outputTypes.map((type) => (
              <div
                key={type.key}
                className={`output-type-card ${activeOutput === type.key ? 'active' : ''}`}
                onClick={() => setActiveOutput(type.key)}
              >
                <div className="output-icon">{type.icon}</div>
                <div className="output-label">{type.label}</div>
                <div className="output-desc">{type.desc}</div>
              </div>
            ))}
          </div>
        </div>

        <div className="export-actions">
          <button onClick={handlePrint} className="btn btn-primary">
            🖨 打印
          </button>
          <button onClick={handleExportText} className="btn btn-secondary">
            📥 导出文案
          </button>
        </div>
      </div>

      <div className="export-preview">
        <h2 className="section-title">
          预览 - {outputTypes.find((t) => t.key === activeOutput)?.label}
        </h2>
        <div className="preview-content">
          {activeOutput === 'deskCard' && (
            <div className="desk-card-preview">
              <div className="desk-card-store">{settings.storeName || '口腔诊所'}</div>
              <PreviewCard
                packageInfo={packageInfo}
                showOriginalPrice={settings.showOriginalPrice}
              />
            </div>
          )}

          {activeOutput === 'clinicNotice' && (
            <div className="clinic-notice-preview">
              <h3>{settings.storeName || '口腔诊所'} - 诊室告知单</h3>
              <div className="notice-content">
                <p><strong>套餐名称：</strong>{packageInfo.name || '套餐名称'}</p>
                <p><strong>适用人群：</strong>{packageInfo.targetAudience || '全年龄段'}</p>
                
                <h4>服务内容：</h4>
                <ol>
                  {packageInfo.items.length > 0 ? (
                    packageInfo.items.map((item) => (
                      <li key={item.id}>{item.name}</li>
                    ))
                  ) : (
                    <li>暂无项目</li>
                  )}
                </ol>

                <h4>费用说明：</h4>
                {settings.showOriginalPrice && (
                  <p>门市价：¥{packageInfo.retailPrice}</p>
                )}
                <p className="highlight-price">实收价：¥{packageInfo.activityPrice}</p>

                <h4>使用规则：</h4>
                <ul>
                  <li>有效期：{formatDate(packageInfo.validFrom)} 至 {formatDate(packageInfo.validTo)}</li>
                  <li>{packageInfo.allowTransfer ? '可转赠他人使用' : '仅限本人使用'}</li>
                  {rules.childrenNotAllowed && <li>儿童不可使用</li>}
                  {rules.pregnancyNeedDoctor && <li>孕妇需经医生确认</li>}
                  {rules.memberOnly && <li>仅限会员购买</li>}
                  {rules.holidayNotAvailable && <li>节假日不可使用</li>}
                </ul>
              </div>
              <div className="notice-signatures">
                <div className="signature-line">
                  <span>患者确认签字：</span>
                  <span className="signature-placeholder">____________</span>
                </div>
                <div className="signature-line">
                  <span>日期：</span>
                  <span className="signature-placeholder">____________</span>
                </div>
                <div className="signature-line">
                  <span>医生/护士签字：</span>
                  <span className="signature-placeholder">____________</span>
                </div>
              </div>
            </div>
          )}

          {activeOutput === 'momentsPoster' && (
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
                {settings.showOriginalPrice && (
                  <p>💰 原价 ¥{packageInfo.retailPrice}</p>
                )}
                <p className="moments-price">🎉 活动价仅需 <strong>¥{packageInfo.activityPrice}</strong>！</p>
                <p>⏰ 活动时间：{formatDate(packageInfo.validFrom)} - {formatDate(packageInfo.validTo)}</p>
                {packageInfo.allowTransfer && (
                  <p>🎁 支持转赠，送家人送朋友都合适！</p>
                )}
                <p className="hashtags">#口腔护理 #洁牙 #健康牙齿</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default ExportPanel
