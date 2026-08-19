import React from "react";

type ErrorBoundaryProps = {
  children: React.ReactNode;
};

type ErrorBoundaryState = {
  hasError: boolean;
  message: string;
};

export default class ErrorBoundary extends React.Component<
  ErrorBoundaryProps,
  ErrorBoundaryState
> {
  state: ErrorBoundaryState = { hasError: false, message: "" };

  static getDerivedStateFromError(error: unknown): ErrorBoundaryState {
    return {
      hasError: true,
      message: error instanceof Error ? error.message : "حدث خطأ غير متوقع أثناء تحميل الصفحة.",
    };
  }

  componentDidCatch(error: unknown, info: React.ErrorInfo) {
    console.error("Application render error", error, info.componentStack);
  }

  handleReload = () => {
    window.location.reload();
  };

  render() {
    if (!this.state.hasError) return this.props.children;

    return (
      <main
        dir="rtl"
        className="min-h-screen flex items-center justify-center bg-slate-50 px-6 py-12 text-slate-900"
      >
        <section className="w-full max-w-lg rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-lg">
          <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-full bg-red-100 text-2xl text-red-700">
            !
          </div>
          <h1 className="mb-3 text-2xl font-bold">تعذر تحميل الموقع</h1>
          <p className="mb-6 leading-8 text-slate-600">
            حدث خطأ أثناء تشغيل الصفحة. أعد المحاولة، وإذا استمرت المشكلة تواصل مع مسؤول الموقع.
          </p>
          {import.meta.env.DEV && (
            <pre className="mb-6 max-h-32 overflow-auto rounded-lg bg-slate-100 p-3 text-left text-xs text-red-700" dir="ltr">
              {this.state.message}
            </pre>
          )}
          <button
            type="button"
            onClick={this.handleReload}
            className="rounded-lg bg-blue-700 px-6 py-3 font-semibold text-white transition hover:bg-blue-800 focus:outline-none focus:ring-4 focus:ring-blue-200"
          >
            إعادة تحميل الصفحة
          </button>
        </section>
      </main>
    );
  }
}
