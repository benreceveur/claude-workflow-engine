import React from 'react';

/**
 * HelloWorld Component
 *
 * A simple functional component that displays a "Hello, World!" heading.
 * Created for testing agent invocation functionality.
 *
 * @example
 * ```tsx
 * import HelloWorld from './components/HelloWorld';
 *
 * function App() {
 *   return (
 *     <div className="app">
 *       <HelloWorld />
 *     </div>
 *   );
 * }
 * ```
 */

interface HelloWorldProps {
  /** Optional CSS class name for custom styling */
  className?: string;
  /** Optional test ID for testing purposes */
  testId?: string;
}

const HelloWorld: React.FC<HelloWorldProps> = ({
  className = '',
  testId = 'hello-world'
}) => {
  return (
    <h1
      className={className}
      data-testid={testId}
      role="heading"
      aria-level={1}
    >
      Hello, World!
    </h1>
  );
};

export default HelloWorld;
