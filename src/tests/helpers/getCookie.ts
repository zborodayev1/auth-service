export function getCookie(
  cookies: string | string[] | undefined,
  name: string,
): string | undefined {
  if (!Array.isArray(cookies)) {
    return undefined
  }

  const cookie = cookies.find((cookie) => cookie.startsWith(`${name}=`))

  return cookie?.split(';', 1)[0]?.slice(name.length + 1)
}
