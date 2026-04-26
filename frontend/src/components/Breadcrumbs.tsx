import { Link } from "react-router-dom";

export interface BreadcrumbItem {
  label: string;
  to?: string;
}

export default function Breadcrumbs({ items }: { items: BreadcrumbItem[] }) {
  return (
    <nav
      aria-label="breadcrumbs"
      className="text-sm mb-3"
      style={{ color: "var(--ink-3)" }}
    >
      {items.map((it, idx) => {
        const isLast = idx === items.length - 1;
        return (
          <span key={idx}>
            {it.to && !isLast ? (
              <Link
                to={it.to}
                className="hover:underline"
                style={{ color: "var(--accent)" }}
              >
                {it.label}
              </Link>
            ) : (
              <span style={isLast ? { color: "var(--ink-1)" } : undefined}>
                {it.label}
              </span>
            )}
            {!isLast && (
              <span className="mx-2" style={{ color: "var(--ink-4)" }}>
                /
              </span>
            )}
          </span>
        );
      })}
    </nav>
  );
}
