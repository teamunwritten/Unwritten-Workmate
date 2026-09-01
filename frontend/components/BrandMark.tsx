export default function BrandMark({
  compact = false,
  dark = false,
  large = false,
}: {
  compact?: boolean;
  dark?: boolean;
  large?: boolean;
}) {
  return (
    <div className="flex items-center gap-2.5 min-w-0">
      <div
        className={`${
          large ? "h-11 w-11" : "h-7 w-7"
        } rounded-md bg-white flex items-center justify-center shrink-0 overflow-hidden`}
      >
        <img src="/logo-mark.svg" alt="" className={`${large ? "h-9 w-9" : "h-5 w-5"} object-contain`} />
      </div>
      {!compact && (
        <div className="min-w-0 leading-none">
          <div className={`text-[10px] font-light tracking-[0.2em] uppercase truncate ${dark ? "text-white/60" : "text-muted"}`}>
            unwritten
          </div>
          <div className={`text-[16px] font-extrabold tracking-tight -mt-0.5 truncate ${dark ? "text-white" : "text-ink"}`}>
            workmate
          </div>
        </div>
      )}
    </div>
  );
}
