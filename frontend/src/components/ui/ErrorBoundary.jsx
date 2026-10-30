import { Component } from "react";

export default class ErrorBoundary extends Component {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  render() {
    if (!this.state.failed) return this.props.children;
    return (
      <div className="page-container" role="alert">
        <h1>This view could not be opened</h1>
        <p>
          Reload the workspace to try again. Your saved account records remain
          available.
        </p>
        <button
          className="btn btn-primary"
          type="button"
          onClick={() => window.location.reload()}
        >
          Reload workspace
        </button>
      </div>
    );
  }
}
