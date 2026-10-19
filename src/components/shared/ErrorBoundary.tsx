"use client";
import React, { Component, ReactNode } from 'react';

export class ErrorBoundary extends Component<{children: ReactNode, title: string}, {hasError: boolean, error: Error | null}> {
  state = { hasError: false, error: null };
  
  static getDerivedStateFromError(error: Error) { return { hasError: true, error }; }
  
  render() {
    if (this.state.hasError) {
      return (
        <div className="p-4 bg-danger/10 border border-danger/20 rounded-xl text-danger text-sm">
          <p className="font-bold mb-1">{this.props.title} сломался</p>
          <p className="font-mono text-xs opacity-80">{this.state.error?.message}</p>
        </div>
      );
    }
    return this.props.children;
  }
}