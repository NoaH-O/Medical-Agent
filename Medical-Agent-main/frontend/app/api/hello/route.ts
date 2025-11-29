import { NextRequest, NextResponse } from "next/server"

// Example GET endpoint
export async function GET(request: NextRequest) {
  // You can access query parameters like this:
  // const { searchParams } = new URL(request.url)
  // const name = searchParams.get('name')

  return NextResponse.json({
    message: "Hello from Greptile Hackathon API!",
    timestamp: new Date().toISOString(),
  })
}

// Example POST endpoint
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    // Process the request body here
    // For example: const { name } = body

    return NextResponse.json({
      message: "Data received successfully",
      data: body,
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    return NextResponse.json(
      { error: "Invalid request body" },
      { status: 400 }
    )
  }
}
