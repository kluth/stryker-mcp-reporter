import { createSignal } from 'solid-js';

export function Counter() {
  const [count, setCount] = createSignal(0);
  return (
    <div>
      <button onClick={() => setCount(c => c + 1)}>
        Count: {count()}
      </button>
    </div>
  );
}
