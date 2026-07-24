import { render, screen } from '@testing-library/react';
import App from './App';

test('renders the ID validator heading', () => {
  render(<App />);
  const heading = screen.getByRole('heading', { name: /south african id validator/i });
  expect(heading).toBeInTheDocument();
});

test('renders the ID number input', () => {
  render(<App />);
  const input = screen.getByLabelText(/id number/i);
  expect(input).toBeInTheDocument();
});
