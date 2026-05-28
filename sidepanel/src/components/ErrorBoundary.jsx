import { Component } from "react";
import "./ErrorBoundary.css";

class ErrorBoundary extends Component {
  constructor(props) {
    super(props);

    this.state = {
      error: null
    };
  }

  static getDerivedStateFromError(error) {
    return {
      error
    };
  }

  componentDidCatch(error, errorInfo) {
    console.error(error, errorInfo);
  }

  handleReload = () => {
    globalThis.location.reload();
  };

  render() {
    const { children, title = "Something went wrong" } = this.props;
    const { error } = this.state;

    if (!error) {
      return children;
    }

    return (
      <main className="error-boundary">
        <section className="error-card">
          <h1>{title}</h1>
          <p>
            Tabspace hit an unexpected error. Reload and try again.
          </p>

          <pre>{error.message}</pre>

          <button onClick={this.handleReload} type="button">
            Reload
          </button>
        </section>
      </main>
    );
  }
}

export default ErrorBoundary;
