import React from 'react';

export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, info) {
    console.error('ErrorBoundary caught:', error, info);
  }

  handleReload = () => {
    this.setState({ hasError: false, error: null });
    window.location.href = window.location.origin + '/';
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-slate-50 p-6">
          <div className="max-w-lg w-full bg-white border border-slate-200 rounded-xl shadow-sm p-6">
            <h2 className="text-lg font-semibold text-red-700 mb-2">Algo salió mal</h2>
            <p className="text-sm text-slate-600 mb-4">
              Se produjo un error al renderizar la página. Recarga para volver a intentar.
            </p>
            <pre className="text-xs bg-slate-50 border border-slate-200 rounded p-3 overflow-auto max-h-48 text-red-700 whitespace-pre-wrap">
              {this.state.error?.message || String(this.state.error)}
            </pre>
            <button
              onClick={this.handleReload}
              className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-md text-sm font-medium hover:bg-blue-700"
            >
              Recargar
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}