import { render, fireEvent, screen } from '@solidjs/testing-library';
import { Counter } from './Counter';

describe('Counter', () => {
  it('increments value', async () => {
    render(() => <Counter />);
    const button = await screen.findByRole('button');
    expect(button).toHaveTextContent('Count: 0');
    fireEvent.click(button);
    expect(button).toHaveTextContent('Count: 1');
  });
});
