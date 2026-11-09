import { describe, expect, it } from 'vitest';
import { greet } from './use';

describe('the kit installed as a package', () => {
  it('runs its TypeScript sources from node_modules', () => {
    expect(greet({ code: 'hello', params: { name: 'kit' } })).toBe('hello kit');
    expect(greet({ code: '' })).toBe('');
  });
});
