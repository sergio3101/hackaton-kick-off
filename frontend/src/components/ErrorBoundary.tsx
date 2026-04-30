import { Component, type ErrorInfo, type ReactNode } from "react";

interface Props {
  children: ReactNode;
}

interface State {
  error: Error | null;
}

export default class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    // На проде сюда логично подключить Sentry/аналог. Для MVP — консоль,
    // чтобы при отладке не пришлось гадать, какой компонент кинул.
    console.error("UI crash:", error, info);
  }

  reset = (): void => {
    this.setState({ error: null });
  };

  render() {
    if (!this.state.error) return this.props.children;
    return (
      <div
        className="page"
        style={{
          maxWidth: 640,
          marginTop: 40,
        }}
      >
        <div className="card" style={{ padding: 24 }}>
          <div
            className="mono upper"
            style={{ color: "var(--danger)", marginBottom: 8 }}
          >
            UI · UNHANDLED ERROR
          </div>
          <h1 className="page-title" style={{ marginBottom: 8 }}>
            Что-то сломалось
          </h1>
          <div style={{ color: "var(--ink-3)", marginBottom: 16 }}>
            Страница упала с ошибкой. Можно попробовать перезагрузить или вернуться
            назад.
          </div>
          <pre
            style={{
              padding: 12,
              background: "var(--bg-2)",
              border: "1px solid var(--bg-line)",
              borderRadius: "var(--r-2)",
              color: "var(--ink-2)",
              fontSize: 12,
              overflow: "auto",
              maxHeight: 200,
              marginBottom: 16,
            }}
          >
            {this.state.error.message}
          </pre>
          <div style={{ display: "flex", gap: 8 }}>
            <button
              type="button"
              className="btn btn--primary"
              onClick={() => {
                this.reset();
                window.location.reload();
              }}
            >
              Перезагрузить
            </button>
            <button type="button" className="btn" onClick={this.reset}>
              Попробовать снова
            </button>
          </div>
        </div>
      </div>
    );
  }
}
