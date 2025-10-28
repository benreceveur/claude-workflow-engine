import React from 'react';
import { render, screen } from '@testing-library/react';
import HelloWorld from './HelloWorld';

/**
 * Test suite for HelloWorld component
 */
describe('HelloWorld Component', () => {
  it('should render "Hello, World!" text', () => {
    render(<HelloWorld />);
    const heading = screen.getByText('Hello, World!');
    expect(heading).toBeInTheDocument();
  });

  it('should render as an h1 element', () => {
    render(<HelloWorld />);
    const heading = screen.getByRole('heading', { level: 1 });
    expect(heading).toBeInTheDocument();
  });

  it('should apply custom className when provided', () => {
    render(<HelloWorld className="custom-class" />);
    const heading = screen.getByText('Hello, World!');
    expect(heading).toHaveClass('custom-class');
  });

  it('should have default test ID', () => {
    render(<HelloWorld />);
    const heading = screen.getByTestId('hello-world');
    expect(heading).toBeInTheDocument();
  });

  it('should accept custom test ID', () => {
    render(<HelloWorld testId="custom-test-id" />);
    const heading = screen.getByTestId('custom-test-id');
    expect(heading).toBeInTheDocument();
  });

  it('should have proper ARIA attributes for accessibility', () => {
    render(<HelloWorld />);
    const heading = screen.getByRole('heading', { level: 1 });
    expect(heading).toHaveAttribute('aria-level', '1');
  });
});
