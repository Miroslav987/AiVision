// src/components/shared/ErrorBoundary.tsx
"use client";
import React, { Component, ReactNode } from 'react';

interface Props {
  children: ReactNode;
  title: string;
}

interface State {
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };
  
  static getDerivedStateFromError(error: Error): State { 
    return { error }; 
  }
  
  render() {
    if (this.state.error) {
      return (
        <div className="p-4 bg-danger/10 border border-danger/20 rounded-xl flex flex-col items-start gap-2 text-danger text-sm">
          <p className="font-bold">{this.props.title}: ошибка</p>
          <p className="font-mono text-xs opacity-80">{this.state.error.message}</p>
          <button 
            onClick={() => this.setState({ error: null })}
            className="mt-1 text-xs px-3 py-1 bg-danger/20 hover:bg-danger/30 rounded transition-colors"
          >
            Повторить
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}