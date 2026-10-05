export function Logo({ className = "" }) {
  return (
    <span className={`inline-flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-sm bg-white md:h-11 md:w-36 ${className}`}>
      <img src="/brand/milugui-isotipo.png" alt="MiLuGui" className="block h-9 w-9 object-contain md:hidden" />
      <img src="/brand/milugui-logo.svg" alt="MiLuGui" className="hidden h-full w-full object-cover object-center md:block" />
    </span>
  )
}
