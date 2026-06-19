import { useState } from 'react'
import { PackageInfo, PackageItem } from '../types'
import PreviewCard from './PreviewCard'

interface Props {
  packageInfo: PackageInfo
  onChange: (info: PackageInfo) => void
}

function PackageEditor({ packageInfo, onChange }: Props) {
  const [newItemName, setNewItemName] = useState('')

  const handleInputChange = (field: keyof PackageInfo, value: string | number | boolean) => {
    onChange({ ...packageInfo, [field]: value })
  }

  const addItem = () => {
    if (newItemName.trim()) {
      const newItem: PackageItem = {
        id: Date.now().toString(),
        name: newItemName.trim(),
      }
      onChange({ ...packageInfo, items: [...packageInfo.items, newItem] })
      setNewItemName('')
    }
  }

  const removeItem = (id: string) => {
    onChange({
      ...packageInfo,
      items: packageInfo.items.filter((item) => item.id !== id),
    })
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      addItem()
    }
  }

  return (
    <div className="editor-container">
      <div className="editor-form">
        <h2 className="section-title">套餐编辑</h2>
        
        <div className="form-group">
          <label>套餐名称</label>
          <input
            type="text"
            value={packageInfo.name}
            onChange={(e) => handleInputChange('name', e.target.value)}
            placeholder="如：尊享洁牙抛光套餐"
            className="form-input"
          />
        </div>

        <div className="form-group">
          <label>适用人群</label>
          <input
            type="text"
            value={packageInfo.targetAudience}
            onChange={(e) => handleInputChange('targetAudience', e.target.value)}
            placeholder="如：成人 / 儿童 / 全年龄段"
            className="form-input"
          />
        </div>

        <div className="form-group">
          <label>包含项目</label>
          <div className="item-input-row">
            <input
              type="text"
              value={newItemName}
              onChange={(e) => setNewItemName(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="输入项目名称，按回车添加"
              className="form-input item-input"
            />
            <button onClick={addItem} className="btn btn-primary btn-sm">
              添加
            </button>
          </div>
          <div className="items-list">
            {packageInfo.items.map((item) => (
              <div key={item.id} className="item-tag">
                <span>{item.name}</span>
                <button
                  onClick={() => removeItem(item.id)}
                  className="item-remove"
                >
                  ×
                </button>
              </div>
            ))}
            {packageInfo.items.length === 0 && (
              <p className="empty-hint">暂无项目，请添加包含的服务项目</p>
            )}
          </div>
        </div>

        <div className="form-row">
          <div className="form-group">
            <label>门市价（元）</label>
            <input
              type="number"
              value={packageInfo.retailPrice || ''}
              onChange={(e) => handleInputChange('retailPrice', Number(e.target.value))}
              placeholder="0"
              className="form-input"
            />
          </div>
          <div className="form-group">
            <label>活动价（元）</label>
            <input
              type="number"
              value={packageInfo.activityPrice || ''}
              onChange={(e) => handleInputChange('activityPrice', Number(e.target.value))}
              placeholder="0"
              className="form-input price-activity"
            />
          </div>
        </div>

        <div className="form-row">
          <div className="form-group">
            <label>有效期开始</label>
            <input
              type="date"
              value={packageInfo.validFrom}
              onChange={(e) => handleInputChange('validFrom', e.target.value)}
              className="form-input"
            />
          </div>
          <div className="form-group">
            <label>有效期结束</label>
            <input
              type="date"
              value={packageInfo.validTo}
              onChange={(e) => handleInputChange('validTo', e.target.value)}
              className="form-input"
            />
          </div>
        </div>

        <div className="form-group">
          <label className="checkbox-label">
            <input
              type="checkbox"
              checked={packageInfo.allowTransfer}
              onChange={(e) => handleInputChange('allowTransfer', e.target.checked)}
              className="form-checkbox"
            />
            <span>允许转赠</span>
          </label>
        </div>
      </div>

      <div className="editor-preview">
        <h2 className="section-title">实时预览</h2>
        <PreviewCard packageInfo={packageInfo} />
        <p className="preview-hint">预览效果与前台和顾客看到的一致</p>
      </div>
    </div>
  )
}

export default PackageEditor
