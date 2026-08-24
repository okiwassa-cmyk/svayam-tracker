// 検査の予定と、その前後で守ること。
// γ-GTPは直前の飲酒で動くので、採血の前3日は飲まない。
// 90日後にもう一度測るときも同じ条件でそろえること。

export const NO_ALCOHOL_DATES = ['2026-09-06', '2026-09-07', '2026-09-08']

export type CheckupNotice = { tone: 'alert' | 'info'; title: string; body: string }

export function getCheckupNotice(date: string): CheckupNotice | null {
  if (date === '2026-09-08') {
    return {
      tone: 'alert',
      title: '禁酒日（3/3）／明日は検査',
      body: '明日9日は朝8時までに食事をすませる。そのあとは絶食（水はOK）。13:00に採血。',
    }
  }
  const i = NO_ALCOHOL_DATES.indexOf(date)
  if (i >= 0) {
    return {
      tone: 'alert',
      title: `禁酒日（${i + 1}/${NO_ALCOHOL_DATES.length}）`,
      body: '9月9日の採血まで飲まない。γ-GTPは直前の飲酒で動くので、90日後の再検査と同じ条件にそろえるため。',
    }
  }
  if (date === '2026-09-05') {
    return {
      tone: 'info',
      title: '明日から3日間、禁酒',
      body: '9月9日13:00の採血に向けて、6日・7日・8日は飲まない。当日は朝8時までに食事をすませる。',
    }
  }
  if (date === '2026-09-09') {
    return {
      tone: 'alert',
      title: '検査日 13:00',
      body: '朝8時までに食事をすませる。そのあとは絶食（水はOK）。特定健診・骨密度DEXA・大腸・肺・子宮頸がん。90日後もこの条件で受ける。',
    }
  }
  if (date === '2026-09-15') {
    return { tone: 'info', title: '検査日 14:00', body: 'マンモグラフィ。' }
  }
  return null
}
