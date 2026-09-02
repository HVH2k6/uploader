import { SignJWT, jwtVerify, type JWTPayload } from 'jose'

const JWT_SECRET = process.env.JWT_SECRET || 'super-secret-jwt-key'
const REFRESH_SECRET = process.env.REFRESH_SECRET || 'super-secret-refresh-key'

const encodedJwtSecret = new TextEncoder().encode(JWT_SECRET)
const encodedRefreshSecret = new TextEncoder().encode(REFRESH_SECRET)

export async function signAccessToken(payload: JWTPayload) {
    return new SignJWT(payload)
        .setProtectedHeader({ alg: 'HS256' })
        .setIssuedAt()
        .setExpirationTime('15m')
        .sign(encodedJwtSecret)
}

export async function signRefreshToken(payload: JWTPayload) {
    return new SignJWT(payload)
        .setProtectedHeader({ alg: 'HS256' })
        .setIssuedAt()
        .setExpirationTime('7d')
        .sign(encodedRefreshSecret)
}

export async function verifyAccessToken(token: string) {
    try {
        const { payload } = await jwtVerify(token, encodedJwtSecret)
        return payload
    } catch (error) {
        return null
    }
}

export async function verifyRefreshToken(token: string) {
    try {
        const { payload } = await jwtVerify(token, encodedRefreshSecret)
        return payload
    } catch (error) {
        return null
    }
}
