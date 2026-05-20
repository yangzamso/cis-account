import ExcelJS from 'exceljs'
import type { MonthlyReport } from './report-builder'

function v(n: number) { return n ?? 0 }
function shincheonjiYear(year: number) { return year - 1983 }

function applyBorder(cell: ExcelJS.Cell) {
  cell.border = {
    top: { style: 'thin' }, left: { style: 'thin' },
    bottom: { style: 'thin' }, right: { style: 'thin' },
  }
}
function headerStyle(cell: ExcelJS.Cell, bg = 'FFB8D4E8') {
  cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: bg } }
  cell.font = { bold: true, size: 8 }
  cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true }
  applyBorder(cell)
}
function dataStyle(cell: ExcelJS.Cell) {
  cell.alignment = { horizontal: 'right', vertical: 'middle' }
  cell.numFmt = '#,##0'
  applyBorder(cell)
}
function labelStyle(cell: ExcelJS.Cell) {
  cell.alignment = { horizontal: 'left', vertical: 'middle' }
  cell.font = { size: 8 }
  applyBorder(cell)
}
function dashCell(cell: ExcelJS.Cell) {
  cell.value = '-'
  cell.alignment = { horizontal: 'center', vertical: 'middle' }
  cell.font = { size: 8 }
  applyBorder(cell)
}

export async function buildExcel(report: MonthlyReport): Promise<Buffer> {
  const wb = new ExcelJS.Workbook()
  const ws = wb.addWorksheet('월말보고서')
  const scYear = shincheonjiYear(report.year)

  ws.columns = Array(15).fill(null).map(() => ({ width: 13 }))
  ws.getColumn(1).width = 14
  ws.getColumn(2).width = 14

  let r = 1

  // ── 제목 ──────────────────────────────────
  const mergeTitle = (text: string, fontSize: number, bold = true) => {
    ws.mergeCells(`A${r}:O${r}`)
    const c = ws.getCell(`A${r}`)
    c.value = text; c.font = { bold, size: fontSize }
    c.alignment = { horizontal: 'center' }
    r++
  }
  mergeTitle(`${report.churchNameKo} 재정부 월말보고서`, 13)
  mergeTitle(`${report.churchNameRu} Department of Finance End-of-Month Report`, 10, false)
  mergeTitle(`신천기${scYear}년 ${report.month}월  Shincheonji Year ${scYear} (${report.year}) ${report.month}(Month)`, 10, false)
  r++

  // ── 1. 총괄현황 ───────────────────────────
  ws.mergeCells(`A${r}:O${r}`)
  ws.getCell(`A${r}`).value = '1. 총괄현황  General Overview'
  ws.getCell(`A${r}`).font = { bold: true, size: 10 }; r++

  const s1H = ['통화\nCurrency', '전월이월금\nPrev. Balance', '월입금\nMonthly Income', '월출금\nMonthly Expenditure', '월잔액\nMonthly Balance', '회계잔금\nAccounting Balance', '통장잔고\nBankbook', '현금\nCash']
  const s1HRow = ws.addRow(s1H); s1HRow.height = 30
  s1HRow.eachCell(c => headerStyle(c)); r++

  const s1Local = ws.addRow(['현지화폐', v(report.prevBalanceLocal), v(report.monthlyIncomeLocal), v(report.monthlyExpenseLocal), v(report.monthlyBalanceLocal), v(report.accountingBalanceLocal), v(report.bankbookBalance), v(report.cashLocalBalance)])
  labelStyle(s1Local.getCell(1)); [2,3,4,5,6,7,8].forEach(i => dataStyle(s1Local.getCell(i))); r++

  const s1Usd = ws.addRow(['USD', v(report.prevBalanceUsd), v(report.monthlyIncomeUsd), v(report.monthlyExpenseUsd), v(report.monthlyBalanceUsd), v(report.accountingBalanceUsd), null, v(report.cashUsdBalance)])
  labelStyle(s1Usd.getCell(1)); [2,3,4,5,6].forEach(i => dataStyle(s1Usd.getCell(i))); dashCell(s1Usd.getCell(7)); dataStyle(s1Usd.getCell(8)); r++; r++

  // ── 2. 각 부서별 재정현황 ──────────────────
  ws.mergeCells(`A${r}:O${r}`)
  ws.getCell(`A${r}`).value = '2. 각 부서별 재정현황  Financial Status by Department'
  ws.getCell(`A${r}`).font = { bold: true, size: 10 }; r++

  const s2H = ['통화\nCurrency', '부서명\nDepartment', '전월이월금\nPrev. Balance', '월입금\nMonthly Income', '월출금\nMonthly Exp.', '월잔액\nMonthly Balance', '회계잔금(예적금포함)\nAccounting Balance']
  const s2HRow = ws.addRow(s2H); s2HRow.height = 30
  s2HRow.eachCell(c => headerStyle(c)); r++

  const s2Local = ws.addRow(['현지화폐', '재정부 The Department of Finance', v(report.prevBalanceLocal), v(report.monthlyIncomeLocal), v(report.monthlyExpenseLocal), v(report.monthlyBalanceLocal), v(report.accountingBalanceLocal)])
  labelStyle(s2Local.getCell(1)); labelStyle(s2Local.getCell(2)); [3,4,5,6,7].forEach(i => dataStyle(s2Local.getCell(i))); r++
  const s2Usd = ws.addRow(['USD', '', v(report.prevBalanceUsd), v(report.monthlyIncomeUsd), v(report.monthlyExpenseUsd), v(report.monthlyBalanceUsd), v(report.accountingBalanceUsd)])
  labelStyle(s2Usd.getCell(1)); labelStyle(s2Usd.getCell(2)); [3,4,5,6,7].forEach(i => dataStyle(s2Usd.getCell(i))); r++

  const s2TotLocal = ws.addRow(['현지화폐', '합계 Total', v(report.prevBalanceLocal), v(report.monthlyIncomeLocal), v(report.monthlyExpenseLocal), v(report.monthlyBalanceLocal), v(report.accountingBalanceLocal)])
  s2TotLocal.eachCell((c, i) => { applyBorder(c); c.font = { bold: true, size: 8 }; c.alignment = { horizontal: i <= 2 ? 'left' : 'right', vertical: 'middle' }; if (i > 2) c.numFmt = '#,##0' }); r++
  const s2TotUsd = ws.addRow(['USD', '', v(report.prevBalanceUsd), v(report.monthlyIncomeUsd), v(report.monthlyExpenseUsd), v(report.monthlyBalanceUsd), v(report.accountingBalanceUsd)])
  s2TotUsd.eachCell((c, i) => { applyBorder(c); c.font = { bold: true, size: 8 }; c.alignment = { horizontal: i <= 2 ? 'left' : 'right', vertical: 'middle' }; if (i > 2) c.numFmt = '#,##0' }); r++; r++

  // ── 3. 정기예·적금현황 ────────────────────
  ws.mergeCells(`A${r}:O${r}`)
  ws.getCell(`A${r}`).value = '3. 정기예·적금현황  Status of Deposits and Time Deposits'
  ws.getCell(`A${r}`).font = { bold: true, size: 10 }; r++

  const s3H = ['구분\nCategory', '이월금\nCarried-Over', '증가\nIncrease', '감소\nDecrease', '잔액\nBalance']
  const s3HRow = ws.addRow(s3H); s3HRow.height = 30
  s3HRow.eachCell(c => headerStyle(c)); r++

  for (const d of report.depositRows) {
    const dr = ws.addRow([d.category, v(d.carriedOver), v(d.increase), v(d.decrease), v(d.balance)])
    labelStyle(dr.getCell(1)); [2,3,4,5].forEach(i => dataStyle(dr.getCell(i))); r++
  }
  if (report.depositRows.length > 0) {
    const totals = [
      report.depositRows.reduce((s,d)=>s+d.carriedOver,0),
      report.depositRows.reduce((s,d)=>s+d.increase,0),
      report.depositRows.reduce((s,d)=>s+d.decrease,0),
      report.depositRows.reduce((s,d)=>s+d.balance,0),
    ]
    const s3Tot = ws.addRow(['합계 Total', ...totals])
    s3Tot.eachCell(c => { applyBorder(c); c.font = { bold: true, size: 8 }; c.alignment = { horizontal: c.col === 1 ? 'left' : 'right', vertical: 'middle' }; if (c.col > 1) c.numFmt = '#,##0' })
    r++
  }
  r++

  // ── 4. 수입내역 ───────────────────────────
  ws.mergeCells(`A${r}:O${r}`)
  ws.getCell(`A${r}`).value = '4. 일반재정 수입내역  General Fund Income Details'
  ws.getCell(`A${r}`).font = { bold: true, size: 10 }; r++

  const s4H = ['통화\nCurrency', '십일조\nTithes', '주일헌금\nSunday', '감사·절기\nThanksgiving', '기타헌금\nOther Off.', '센터후원금\nCenter Support', '기타입금\nOther Income', '건축헌금\nBuilding Fund', '합 계\nTotal', '총회·지파로 보낸헌금\nRemittance to HQ/Tribe']
  const s4HRow = ws.addRow(s4H); s4HRow.height = 36
  s4HRow.eachCell((c, i) => headerStyle(c, i === 9 ? 'FFFDE68A' : i === 10 ? 'FFFED7AA' : 'FFB8D4E8')); r++

  const s4Local = ws.addRow(['현지화폐', v(report.tithesLocal), v(report.sundayOfferingsLocal), v(report.thanksgivingLocal), v(report.otherOfferingsLocal), v(report.centerSupportLocal), v(report.otherIncomeLocal), v(report.buildingFundLocal), v(report.incomeTotalLocal), v(report.exp01Local)])
  labelStyle(s4Local.getCell(1)); [2,3,4,5,6,7,8].forEach(i => dataStyle(s4Local.getCell(i)))
  const s4LocalTotal = s4Local.getCell(9); dataStyle(s4LocalTotal); s4LocalTotal.fill = { type:'pattern', pattern:'solid', fgColor:{argb:'FFFFFDE7'} }; s4LocalTotal.font = { bold:true, size:8 }
  const s4LocalRemit = s4Local.getCell(10); dataStyle(s4LocalRemit); s4LocalRemit.fill = { type:'pattern', pattern:'solid', fgColor:{argb:'FFFFF3E0'} }
  r++

  const s4Usd = ws.addRow(['USD', v(report.tithesUsd), v(report.sundayOfferingsUsd), v(report.thanksgivingUsd), v(report.otherOfferingsUsd), v(report.centerSupportUsd), v(report.otherIncomeUsd), v(report.buildingFundUsd), v(report.incomeTotalUsd), v(report.exp01Usd)])
  labelStyle(s4Usd.getCell(1)); [2,3,4,5,6,7,8].forEach(i => dataStyle(s4Usd.getCell(i)))
  const s4UsdTotal = s4Usd.getCell(9); dataStyle(s4UsdTotal); s4UsdTotal.fill = { type:'pattern', pattern:'solid', fgColor:{argb:'FFFFFDE7'} }; s4UsdTotal.font = { bold:true, size:8 }
  const s4UsdRemit = s4Usd.getCell(10); dataStyle(s4UsdRemit); s4UsdRemit.fill = { type:'pattern', pattern:'solid', fgColor:{argb:'FFFFF3E0'} }
  r++; r++

  // ── 5. 지출내역 ───────────────────────────
  ws.mergeCells(`A${r}:O${r}`)
  ws.getCell(`A${r}`).value = '5. 일반재정 지출내역  General Fund Expenditure Details'
  ws.getCell(`A${r}`).font = { bold: true, size: 10 }; r++

  const s5H = [
    '통화\nCurrency',
    '십일조비축금\n(총회·지파로 보낸금)\nTithe Reserve',
    '선교비\nMission Exp.',
    '교회생활비\nChurch Living',
    '여비교통비·후생비\nTravel & Welfare',
    '관리행정비\nAdministrative',
    '임차공과비\nRental & Utility',
    '차량유지비\nVehicle',
    '각종지출비\nMiscellaneous',
    '자산부채관련\nAssets & Liabilities',
    '합 계\nTotal',
  ]
  const s5HRow = ws.addRow(s5H); s5HRow.height = 48
  s5HRow.eachCell((c, i) => headerStyle(c, i === 11 ? 'FFFDE68A' : 'FFB8D4E8')); r++

  const s5Local = ws.addRow(['현지화폐', v(report.exp01Local), v(report.exp02Local), v(report.exp03Local), v(report.exp04Local), v(report.exp05Local), v(report.exp06Local), v(report.exp07Local), v(report.exp08Local), v(report.exp09Local), v(report.expTotalLocal)])
  labelStyle(s5Local.getCell(1)); [2,3,4,5,6,7,8,9,10].forEach(i => dataStyle(s5Local.getCell(i)))
  const s5LocalTotal = s5Local.getCell(11); dataStyle(s5LocalTotal); s5LocalTotal.fill = { type:'pattern', pattern:'solid', fgColor:{argb:'FFFFFDE7'} }; s5LocalTotal.font = { bold:true, size:8 }
  r++

  const s5Usd = ws.addRow(['USD', v(report.exp01Usd), v(report.exp02Usd), v(report.exp03Usd), v(report.exp04Usd), v(report.exp05Usd), v(report.exp06Usd), v(report.exp07Usd), v(report.exp08Usd), v(report.exp09Usd), v(report.expTotalUsd)])
  labelStyle(s5Usd.getCell(1)); [2,3,4,5,6,7,8,9,10].forEach(i => dataStyle(s5Usd.getCell(i)))
  const s5UsdTotal = s5Usd.getCell(11); dataStyle(s5UsdTotal); s5UsdTotal.fill = { type:'pattern', pattern:'solid', fgColor:{argb:'FFFFFDE7'} }; s5UsdTotal.font = { bold:true, size:8 }
  r++; r++

  // ── 6. 차입금 ─────────────────────────────
  ws.mergeCells(`A${r}:O${r}`)
  ws.getCell(`A${r}`).value = '6. 차입금  Loans'
  ws.getCell(`A${r}`).font = { bold: true, size: 10 }; r++

  const s6H = ['이월금\nCarried-Over', '월 차입금\nMonthly Borrowings', '월 상환금\nMonthly Repayments', '차입잔금\nLoan Balance']
  const s6HRow = ws.addRow(s6H); s6HRow.height = 30
  s6HRow.eachCell(c => headerStyle(c)); r++
  const s6D = ws.addRow([v(report.loanCarriedOver), v(report.monthlyBorrowing), v(report.monthlyRepayment), v(report.loanBalance)])
  s6D.eachCell(c => dataStyle(c)); r++; r++

  // ── 7. 차입잔금내역 ───────────────────────
  ws.mergeCells(`A${r}:O${r}`)
  ws.getCell(`A${r}`).value = '7. 차입잔금내역  Loan Balance Details'
  ws.getCell(`A${r}`).font = { bold: true, size: 10 }; r++

  const s7HRow = ws.addRow(['상도 (성도)\nMembers', '기 타\nOthers', '합 계\nTotal']); s7HRow.height = 30
  s7HRow.eachCell(c => headerStyle(c)); r++
  const s7D = ws.addRow([v(report.loanDetailMembers), v(report.loanDetailOthers), v(report.loanBalance)])
  s7D.eachCell(c => dataStyle(c)); r++; r++

  // ── 푸터 ──────────────────────────────────
  ws.mergeCells(`A${r}:O${r}`)
  ws.getCell(`A${r}`).value = '위와 같이 보고합니다.  As reported above.'; r++
  ws.mergeCells(`A${r}:O${r}`)
  ws.getCell(`A${r}`).value = `신천기${scYear} (${report.year}) 년  ${report.month}월    Shincheonji Year ${scYear} (${report.year}), ${report.month} (Month)`; r++
  ws.mergeCells(`A${r}:O${r}`)
  ws.getCell(`A${r}`).value = '보고자 : 재정부장                    Reported by: General Director, Department of Finance'
  ;[r-2, r-1, r].forEach(ri => { ws.getRow(ri).getCell(1).alignment = { horizontal: 'center' }; ws.getRow(ri).getCell(1).font = { size: 9 } })

  const buf = await wb.xlsx.writeBuffer()
  return Buffer.from(buf)
}
