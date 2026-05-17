import { NextRequest, NextResponse } from 'next/server'
import OpenAI from 'openai'

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})

export async function POST(request: NextRequest) {
  try {
    const { videoUrl, game, momentTypes } = await request.json()

    const response = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        {
          role: 'system',
          content: `You are an AI that analyzes gaming videos. When given a video URL and game type, you identify key moments like kills, clutches, funny moments, and rage moments. Always respond with a JSON array of moments with this structure: { moments: [{ start_time: number, end_time: number, moment_type: string, confidence: number, description: string }] }`
        },
        {
          role: 'user',
          content: `Analyze this ${game} gameplay video and find these moments: ${momentTypes.join(', ')}. Video URL: ${videoUrl}. Return timestamps in seconds.`
        }
      ],
      response_format: { type: 'json_object' }
    })

    const result = JSON.parse(response.choices[0].message.content || '{}')
    return NextResponse.json(result)

  } catch (error) {
    return NextResponse.json({ error: 'Analysis failed' }, { status: 500 })
  }
}