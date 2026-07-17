import OpenAI from 'openai'

let client: OpenAI | null = null

function getClient() {
  if (!client) {
    client = new OpenAI({
      baseURL: 'https://openrouter.ai/api/v1',
      apiKey: process.env.OPENROUTER_API_KEY || 'dummy_key',
      defaultHeaders: {
        'HTTP-Referer': process.env.NEXTAUTH_URL || 'http://localhost:3000',
        'X-Title': 'GENC IHH Raporlama Sistemi',
      },
    })
  }
  return client
}

const AI_MODEL = process.env.AI_MODEL || 'anthropic/claude-sonnet-4'

export async function callAI(
  systemPrompt: string,
  userPrompt: string,
  maxTokens = 1024
): Promise<string> {
  if (!process.env.OPENROUTER_API_KEY) {
    throw new Error(
      'OPENROUTER_API_KEY tanımlı değil. .env.local dosyanıza API anahtarınızı ekleyin.'
    )
  }

  try {
    const completion = await getClient().chat.completions.create({
      model: AI_MODEL,
      max_tokens: maxTokens,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
    })

    const content = completion.choices[0]?.message?.content
    if (!content) {
      throw new Error('AI yanıt üretemedi')
    }

    return content
  } catch (error: unknown) {
    if (error instanceof Error) {
      // Rate limit
      if (error.message.includes('429') || error.message.includes('rate limit')) {
        throw new Error('API istek limiti aşıldı. Lütfen bir dakika bekleyip tekrar deneyin.')
      }
      // Model bulunamadı
      if (error.message.includes('404') || error.message.includes('model')) {
        throw new Error(`Model bulunamadı: ${AI_MODEL}. Lütfen .env.local dosyanızdaki AI_MODEL değerini kontrol edin.`)
      }
      // Timeout
      if (error.message.includes('timeout') || error.message.includes('ETIMEDOUT')) {
        throw new Error('AI yanıt süresi doldu. Lütfen tekrar deneyin.')
      }
      // API key hatası
      if (error.message.includes('401') || error.message.includes('authentication')) {
        throw new Error('Geçersiz API anahtarı. Lütfen OPENROUTER_API_KEY değerini kontrol edin.')
      }
      throw new Error(`AI hatası: ${error.message}`)
    }
    throw new Error('Bilinmeyen AI hatası')
  }
}
