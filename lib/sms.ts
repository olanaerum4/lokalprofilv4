/** Normalize to E.164 — handles "900 00 000", "90000000", "4790000000" */
export function normalizePhone(raw: string): string {
  const digits = raw.replace(/[\s\-]/g, '')
  if (digits.startsWith('+')) return digits
  if (digits.startsWith('47') && digits.length === 10) return '+' + digits
  if (digits.length === 8) return '+47' + digits
  return digits
}

export async function sendSMS(to: string, message: string) {
  const u = process.env.ELKS_USERNAME!
  const p = process.env.ELKS_PASSWORD!
  const from = process.env.ELKS_FROM_NUMBER ?? 'LokalProfil' // Swedish number e.g. +46XXXXXXXXX
  const normalizedTo = normalizePhone(to)
  try {
    const r = await fetch('https://api.46elks.com/a1/sms', {
      method: 'POST',
      headers: {
        Authorization: 'Basic ' + Buffer.from(`${u}:${p}`).toString('base64'),
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        from,
        to: normalizedTo,
        message,
        whenreply: `${process.env.NEXT_PUBLIC_APP_URL}/api/webhook`,
      }),
    })
    return r.ok
  } catch { return false }
}

export const sms = {
  reminder24h: (name: string, biz: string, time: string) =>
    `Hei ${name}! Påminnelse om din time hos ${biz} i morgen kl ${time}. Avbestilling? Ring oss direkte.`,
  reminder2h: (name: string, biz: string, time: string) =>
    `Hei ${name}! Din time hos ${biz} er om 2 timer (kl ${time}). Vi gleder oss til å se deg!`,
  reviewRequest: (name: string, biz: string) =>
    `Hei ${name}! Takk for besøket hos ${biz} i dag 😊 Svar med:\n1=Dårlig 2=OK 3=Bra 4=Veldig bra 5=Fantastisk`,
  positive: (link: string) =>
    `Så glad du er fornøyd! 🌟 Det hadde betydd mye om du la igjen en anmeldelse her: ${link}`,
  negative: () =>
    `Det er leit å høre! Vi ønsker å bli bedre. Hva kan vi gjøre annerledes? Svar på denne meldingen.`,
}

export function fmtTime(ts: string) {
  return new Date(ts).toLocaleTimeString('nb-NO', { timeZone: 'Europe/Oslo', hour: '2-digit', minute: '2-digit' })
}
