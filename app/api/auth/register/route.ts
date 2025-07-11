import { type NextRequest, NextResponse } from "next/server"
import { createUser } from "@/lib/auth"

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { email, password, firstName, lastName, phone, userType, businessName } = body

    // Validate required fields
    if (!email || !password || !firstName || !lastName || !userType) {
      return NextResponse.json(
        {
          success: false,
          error: "Missing required fields",
        },
        { status: 400 },
      )
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        {
          success: false,
          error: "Invalid email format",
        },
        { status: 400 },
      )
    }

    // Validate password strength
    if (password.length < 6) {
      return NextResponse.json(
        {
          success: false,
          error: "Password must be at least 6 characters long",
        },
        { status: 400 },
      )
    }

    // Validate user type
    if (!["seeker", "provider"].includes(userType)) {
      return NextResponse.json(
        {
          success: false,
          error: "Invalid user type",
        },
        { status: 400 },
      )
    }

    // For providers, business name is required
    if (userType === "provider" && !businessName) {
      return NextResponse.json(
        {
          success: false,
          error: "Business name is required for providers",
        },
        { status: 400 },
      )
    }

    // Check if database is configured
    if (!process.env.DATABASE_URL) {
      return NextResponse.json(
        {
          success: false,
          error: "Database not configured. Please set up your Neon database connection.",
        },
        { status: 503 },
      )
    }

    try {
      const result = await createUser({
        email,
        password,
        firstName,
        lastName,
        phone,
        userType,
        businessName,
      })

      if (!result.success) {
        return NextResponse.json(
          {
            success: false,
            error: result.error,
          },
          { status: 400 },
        )
      }

      // Set HTTP-only cookie with the token
      const response = NextResponse.json({
        success: true,
        user: result.user,
        message: "Account created successfully",
      })

      response.cookies.set("auth-token", result.token!, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        maxAge: 7 * 24 * 60 * 60, // 7 days
      })

      return response
    } catch (dbError) {
      console.error("Database registration error:", dbError)
      return NextResponse.json(
        {
          success: false,
          error: "Failed to create account. Please try again.",
        },
        { status: 500 },
      )
    }
  } catch (error) {
    console.error("Registration API error:", error)
    return NextResponse.json(
      {
        success: false,
        error: "Internal server error. Please try again.",
      },
      { status: 500 },
    )
  }
}
