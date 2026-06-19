import { RestrictionRules } from '../types'

export function generateFrontDeskText(rules: RestrictionRules): string[] {
  const lines: string[] = []

  if (rules.childrenNotAllowed) {
    lines.push('本套餐儿童（12岁以下）不可使用，请主动询问顾客年龄后再收费。')
  }

  if (rules.pregnancyNeedDoctor) {
    lines.push('孕妇购买本套餐前须安排医生评估，前台不得直接收费。')
  }

  if (rules.memberOnly) {
    lines.push('本套餐为会员专享，非会员不可购买，请先确认会员身份。')
  }

  if (rules.holidayNotAvailable) {
    lines.push('本套餐节假日（含周末）不可使用，请在预约时告知顾客。')
  }

  if (rules.ageRange.enabled) {
    const { min, max } = rules.ageRange
    if (min > 0 && max > 0 && max < 150) {
      lines.push(`本套餐适用年龄 ${min}~${max} 岁，超出范围请勿收费。`)
    } else if (min > 0) {
      lines.push(`本套餐适用年龄 ${min} 岁及以上。`)
    } else if (max > 0 && max < 150) {
      lines.push(`本套餐适用年龄 ${max} 岁及以下。`)
    }
  }

  if (rules.timeSlot.enabled) {
    const timeDesc = rules.timeSlot.weekdaysOnly
      ? `工作日 ${rules.timeSlot.startTime}-${rules.timeSlot.endTime}`
      : `每日 ${rules.timeSlot.startTime}-${rules.timeSlot.endTime}`
    lines.push(`本套餐仅限${timeDesc}使用，其他时段不可预约。`)
  }

  if (rules.minimumConsumption.enabled && rules.minimumConsumption.amount > 0) {
    lines.push(`本套餐最低消费 ¥${rules.minimumConsumption.amount}，不足部分不退不补。`)
  }

  if (!rules.stackableDiscount) {
    lines.push('本套餐不可与其他优惠叠加使用，请勿重复打折。')
  }

  rules.customRules.forEach((rule) => {
    if (rule.trim()) {
      lines.push(rule.trim())
    }
  })

  return lines
}

export function generateRestrictionSummary(rules: RestrictionRules): string[] {
  const items: string[] = []

  if (rules.childrenNotAllowed) items.push('儿童不可选')
  if (rules.pregnancyNeedDoctor) items.push('孕期需确认')
  if (rules.memberOnly) items.push('会员专享')
  if (rules.holidayNotAvailable) items.push('节假日不可用')

  if (rules.ageRange.enabled) {
    const { min, max } = rules.ageRange
    if (min > 0 && max > 0 && max < 150) {
      items.push(`${min}-${max}岁`)
    } else if (min > 0) {
      items.push(`${min}岁以上`)
    } else if (max > 0 && max < 150) {
      items.push(`${max}岁以下`)
    }
  }

  if (rules.timeSlot.enabled) {
    const prefix = rules.timeSlot.weekdaysOnly ? '工作日' : '每日'
    items.push(`${prefix} ${rules.timeSlot.startTime}-${rules.timeSlot.endTime}`)
  }

  if (rules.minimumConsumption.enabled && rules.minimumConsumption.amount > 0) {
    items.push(`最低¥${rules.minimumConsumption.amount}`)
  }

  if (!rules.stackableDiscount) {
    items.push('不可叠加优惠')
  }

  return items
}
