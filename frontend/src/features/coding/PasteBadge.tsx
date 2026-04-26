export function PasteBadge({
  pasteChars,
  codeLen,
}: {
  pasteChars: number;
  codeLen: number;
}) {
  const ratio = codeLen > 0 ? pasteChars / codeLen : 0;
  const percent = Math.round(ratio * 100);
  const heavy = ratio >= 0.7;
  return (
    <span
      title={`Вставлено ${pasteChars} символов из ${codeLen} (~${percent}%)`}
      className={`pill ${heavy ? "pill--danger" : "pill--warn"}`}
    >
      📋 буфер: {pasteChars} симв · {percent}%
    </span>
  );
}
