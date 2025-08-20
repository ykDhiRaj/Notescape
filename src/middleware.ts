import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server'

const isPublicRoute = createRouteMatcher([
  '/sign-in(.*)',
  '/sign-up(.*)',
  '/',
  '/demo'
])

export default clerkMiddleware(async (auth, req) => {
  if (isPublicRoute(req)) return;
  const signInUrl = new URL('/sign-in', req.url)
  signInUrl.searchParams.set('redirect_url', req.url)
  await auth.protect({ unauthenticatedUrl: signInUrl.toString() })
})

export const config = {
  matcher: [
    // Skip Next.js internals and all static files, unless found in search params
    '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
    // Always run for API routes
    '/(api|trpc)(.*)',
  ],
}