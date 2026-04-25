import { Link } from "react-router-dom";

export interface BreadcrumbItem {
  label: string;
  to?: string;
}

export default function Breadcrumbs({ items }: { items: BreadcrumbItem[] }) {
  return (
    <nav aria-label="breadcrumbs" className="text-sm text-slate-500 mb-3">
      {items.map((it, idx) => {
        const isLast = idx === items.length - 1;
        return (
          <span key={idx}>
            {it.to && !isLast ? (
              <Link to={it.to} className="hover:text-brand hover:underline">
                {it.label}
              </Link>
            ) : (
              <span className={isLast ? "text-slate-700" : ""}>{it.label}</span>
            )}
            {!isLast && <span className="mx-2 text-slate-400">/</span>}
          </span>
        );
      })}
    </nav>
  );
}
