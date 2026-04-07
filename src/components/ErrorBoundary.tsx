'use client';

import React, { Component, ErrorInfo, ReactNode } from 'react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  errorInfo: string | null;
}

class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    errorInfo: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    // Update state so the next render will show the fallback UI.
    return { hasError: true, errorInfo: error.message };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error:', error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      let displayMessage = 'Something went wrong.';
      
      try {
        // Check if it's a Firestore JSON error
        const parsed = JSON.parse(this.state.errorInfo || '');
        if (parsed.error && parsed.operationType) {
          displayMessage = `Database Error: ${parsed.operationType} failed on ${parsed.path || 'unknown path'}.`;
          if (parsed.error.includes('insufficient permissions')) {
            displayMessage += ' You do not have permission to perform this action.';
          }
        }
      } catch (e) {
        // Not a JSON error, use the raw message if it's user-friendly
        if (this.state.errorInfo) {
          displayMessage = this.state.errorInfo;
        }
      }

      return (
        <div className="flex flex-col items-center justify-center min-h-[200px] p-6 bg-red-50 border border-red-200 rounded-xl text-center">
          <h2 className="text-xl font-bold text-red-700 mb-2">Oops!</h2>
          <p className="text-red-600 mb-4">{displayMessage}</p>
          <button
            className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
            onClick={() => this.setState({ hasError: false, errorInfo: null })}
          >
            Try again
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
