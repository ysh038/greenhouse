import { QueryErrorResetBoundary } from '@tanstack/react-query'
import { Component, Suspense, type ReactNode } from 'react'

export interface DataErrorProps {
    error: unknown
    retry: () => void
}

interface ErrorBoundaryProps {
    renderError: (props: DataErrorProps) => ReactNode
    onRetry: () => void
    resetKeys: readonly unknown[]
    children: ReactNode
}

interface ErrorBoundaryState {
    hasError: boolean
    error: unknown
}

class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
    state: ErrorBoundaryState = { hasError: false, error: null }

    static getDerivedStateFromError(error: unknown): ErrorBoundaryState {
        return { hasError: true, error }
    }

    componentDidUpdate(
        previousProps: ErrorBoundaryProps,
        previousState: ErrorBoundaryState,
    ): void {
        const hasChanged =
            previousProps.resetKeys.length !== this.props.resetKeys.length ||
            previousProps.resetKeys.some(
                (key, index) => !Object.is(key, this.props.resetKeys[index]),
            )
        if (previousState.hasError && this.state.hasError && hasChanged) {
            this.retry()
        }
    }

    retry = (): void => {
        this.props.onRetry()
        this.setState({ hasError: false, error: null })
    }

    render(): ReactNode {
        if (this.state.hasError) {
            return this.props.renderError({
                error: this.state.error,
                retry: this.retry,
            })
        }
        return this.props.children
    }
}

export function DataBoundary({
    pending,
    renderError,
    resetKeys = [],
    children,
}: {
    pending: ReactNode
    renderError: (props: DataErrorProps) => ReactNode
    resetKeys?: readonly unknown[]
    children: ReactNode
}) {
    return (
        <QueryErrorResetBoundary>
            {({ reset }) => (
                <ErrorBoundary
                    renderError={renderError}
                    onRetry={reset}
                    resetKeys={resetKeys}
                >
                    <Suspense fallback={pending}>{children}</Suspense>
                </ErrorBoundary>
            )}
        </QueryErrorResetBoundary>
    )
}
