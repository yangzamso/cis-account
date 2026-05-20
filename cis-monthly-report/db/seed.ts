import { db } from './index'
import { accountItems, churches } from './schema'

const ACCOUNT_ITEMS = [
  // 수입
  { code: 'INC-01', nameKo: '십일조', nameRu: 'Десятина', type: 'income', category: '수입', keywords: '["십일조","tithe","десятина"]', sortOrder: 1 },
  { code: 'INC-02', nameKo: '주일헌금', nameRu: 'Воскресное пожертвование', type: 'income', category: '수입', keywords: '["주일","주일헌금","воскресное"]', sortOrder: 2 },
  { code: 'INC-03', nameKo: '감사·절기헌금', nameRu: 'Благодарственное и праздничное пожертвование', type: 'income', category: '수입', keywords: '["감사","절기","추수","благодарственное","праздничное"]', sortOrder: 3 },
  { code: 'INC-04', nameKo: '센터후원금', nameRu: 'Пожертвование на поддержку центра', type: 'income', category: '수입', keywords: '["센터","center","центр"]', sortOrder: 4 },
  { code: 'INC-05', nameKo: '기타헌금', nameRu: 'Прочие пожертвования', type: 'income', category: '수입', keywords: '["기타","прочие"]', sortOrder: 5 },
  { code: 'INC-06', nameKo: '건축헌금', nameRu: 'Пожертвование на строительство', type: 'income', category: '수입', keywords: '["건축","строительство"]', sortOrder: 6 },
  { code: 'INC-07', nameKo: '총회건축헌금', nameRu: 'Пожертвование на строительство штаба', type: 'income', category: '수입', keywords: '["총회건축","штаб"]', sortOrder: 7 },
  { code: 'INC-08', nameKo: '기타수입(차입 등)', nameRu: 'Прочие доходы (займы и т.д.)', type: 'income', category: '수입', keywords: '["차입","займ","대여","기타수입"]', sortOrder: 8 },
  // 지출
  { code: 'EXP-01', nameKo: '십일조 비축금(총회·지파로 보낸금)', nameRu: 'Резерв десятины (отправлено в штаб/трибу)', type: 'expense', category: '지출', keywords: '["비축금","보낸","총회","지파","резерв"]', sortOrder: 10 },
  { code: 'EXP-02', nameKo: '선교비', nameRu: 'Миссионерские расходы', type: 'expense', category: '지출', keywords: '["선교","전도","교육","심방","광고","миссия","евангелизация","образование"]', sortOrder: 11 },
  { code: 'EXP-03', nameKo: '교회생활비', nameRu: 'Расходы на жизнь церкви', type: 'expense', category: '지출', keywords: '["생활","식비","렌탈","간식","식사","жизнь","питание","аренда"]', sortOrder: 12 },
  { code: 'EXP-04', nameKo: '여비교통비·후생비', nameRu: 'Транспортные и социальные расходы', type: 'expense', category: '지출', keywords: '["교통","여비","후생","사명자","транспорт","проезд","благосостояние"]', sortOrder: 13 },
  { code: 'EXP-05', nameKo: '관리행정비', nameRu: 'Административные расходы', type: 'expense', category: '지출', keywords: '["관리","행정","사무","용품","офис","канцелярия","административные"]', sortOrder: 14 },
  { code: 'EXP-06', nameKo: '임차공과비', nameRu: 'Аренда и коммунальные услуги', type: 'expense', category: '지출', keywords: '["임대","임차","공과","전기","수도","가스","아파트","аренда","коммунальные","электричество","вода"]', sortOrder: 15 },
  { code: 'EXP-07', nameKo: '차량유지비', nameRu: 'Расходы на содержание автомобиля', type: 'expense', category: '지출', keywords: '["유류","차량","주유","통행","бензин","автомобиль","топливо"]', sortOrder: 16 },
  { code: 'EXP-08', nameKo: '각종지출비', nameRu: 'Прочие расходы', type: 'expense', category: '지출', keywords: '["기타지출","기타비용","прочие расходы"]', sortOrder: 17 },
  { code: 'EXP-09', nameKo: '자산부채관련', nameRu: 'Операции с активами и обязательствами', type: 'expense', category: '지출', keywords: '["보증금","정기예금","차입금변제","대여금","депозит","вклад","займ","погашение"]', sortOrder: 18 },
]

const CIS_CHURCHES = [
  { nameKo: '러시아(모스크바)', nameRu: 'Россия (Москва)', currencyCode: 'RUB', country: 'Russia', createdAt: new Date().toISOString() },
  { nameKo: '러시아(크림공화국)', nameRu: 'Россия (Крым)', currencyCode: 'RUB', country: 'Russia', createdAt: new Date().toISOString() },
  { nameKo: '우즈베키스탄(타슈켄트)', nameRu: 'Узбекистан (Ташкент)', currencyCode: 'UZS', country: 'Uzbekistan', createdAt: new Date().toISOString() },
  { nameKo: '우크라이나(키이우)', nameRu: 'Украина (Киев)', currencyCode: 'UAH', country: 'Ukraine', createdAt: new Date().toISOString() },
  { nameKo: '카자흐스탄(알마티)', nameRu: 'Казахстан (Алматы)', currencyCode: 'KZT', country: 'Kazakhstan', createdAt: new Date().toISOString() },
  { nameKo: '카자흐스탄(악토베)', nameRu: 'Казахстан (Актобе)', currencyCode: 'KZT', country: 'Kazakhstan', createdAt: new Date().toISOString() },
]

async function seed() {
  console.log('Seeding account items...')
  for (const item of ACCOUNT_ITEMS) {
    await db.insert(accountItems).values(item).onConflictDoNothing()
  }

  console.log('Seeding CIS churches...')
  for (const church of CIS_CHURCHES) {
    await db.insert(churches).values(church).onConflictDoNothing()
  }

  console.log('Seed complete.')
}

seed().catch(console.error)
