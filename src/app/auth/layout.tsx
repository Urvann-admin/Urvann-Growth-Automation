/**
 * Prevent long-lived HTML cache on auth routes. Static prerender + s-maxage caused
 * browsers to keep old document references to chunk hashes after deploy → 404 on /_next/static/chunks/*.js
 */
export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
