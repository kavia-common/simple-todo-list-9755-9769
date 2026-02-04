import { render, screen } from '@testing-library/react';
import App from './App';

test('renders todo title', () => {
  render(<App />);
  const title = screen.getByText(/todos/i);
  expect(title).toBeInTheDocument();
});
