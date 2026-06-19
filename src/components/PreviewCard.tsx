import { PackageInfo } from '../types'

interface Props {
  packageInfo: PackageInfo
  showOriginalPrice?: boolean
}

function PreviewCard({ packageInfo, showOriginalPrice = true }: Props) {
  const formatDate = (dateStr: string) => {
    if (!dateStr) return '未设置'
    const date = new Date(dateStr)
    return `${date.getFullYear()}年${date.getMonth() + 1}月${date.getDate()}日`
  }

  const discount = packageInfo.retailPrice > 0
    ? Math.round((packageInfo.activityPrice / packageInfo.retailPrice) * 100) / 10
    : 0

  return (
    <div className="preview-card">
      <div className="preview-card-header">
        <h3 className="preview-package-name">
          {packageInfo.name || '套餐名称'}
        </h3>
        {packageInfo.targetAudience && (
          <span className="preview-audience-tag">{packageInfo.targetAudience}</span>
        )}
      </div>

      <div className="preview-card-body">
        <div className="preview-items">
          <h4>包含项目</h4>
          <ul>
            {packageInfo.items.length > 0 ? (
              packageInfo.items.map((item) => (
                <li key={item.id}>
                  <span className="check-icon">✓</span>
                  {item.name}
                </li>
              ))
            ) : (
              <li className="empty-item">暂无项目</li>
            )}
          </ul>
        </div>

        <div className="preview-price">
          {showOriginalPrice && packageInfo.retailPrice > 0 && (
            <div className="original-price">
              门市价：<span>¥{packageInfo.retailPrice}</span>
            </div>
          )}
          <div className="activity-price">
            <span className="price-symbol">¥</span>
            <span className="price-value">
              {packageInfo.activityPrice > 0 ? packageInfo.activityPrice : '0'}
            </span>
            {discount > 0 && discount < 10 && (
              <span className="discount-tag">{discount}折</span>
            )}
          </div>
        </div>
      </div>

      <div className="preview-card-footer">
        <div className="valid-period">
          有效期：{formatDate(packageInfo.validFrom)} 至 {formatDate(packageInfo.validTo)}
        </div>
        <div className="transfer-info">
          {packageInfo.allowTransfer ? (
            <span className="transfer-allowed">可转赠</span>
          ) : (
            <span className="transfer-not-allowed">不可转赠</span>
          )}
        </div>
      </div>
    </div>
  )
}

export default PreviewCard
