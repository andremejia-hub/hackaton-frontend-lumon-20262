/* Praise Kier */
import { Component, type ReactNode } from "react";
export class ErrorBoundary extends Component<
  { children: ReactNode },
  { failed: boolean }
> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  render() {
    return this.state.failed ? (
      <main role="alert">
        <h1 className="text-3xl">No pudimos mostrar esta página</h1>
        <p className="my-4">Vuelve al panel para intentar nuevamente.</p>
        <a className="underline" href="/">
          Volver al panel
        </a>
      </main>
    ) : (
      this.props.children
    );
  }
}
