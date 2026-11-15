import { act } from '@testing-library/react';

/** Query results reach the screen a macrotask after the answer, and a page can chain several of them. */
export async function settleAsyncUpdates(rounds: number): Promise<void> {
  for (let round = 0; round < rounds; round += 1) {
    await act(async () => {
      await new Promise((done) => {
        setTimeout(done, 0);
      });
    });
  }
}
