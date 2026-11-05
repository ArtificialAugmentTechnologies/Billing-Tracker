import { describe, expect, it } from 'vitest';
import { suggestRefCode } from './projects';

describe('suggestRefCode', () => {
  it('reproduces the sample reference', () => {
    expect(suggestRefCode('Agamathikalvi', 'Agamathikalvi Website Redevelopment')).toBe(
      'AAT/PRJ/AGM-WEB',
    );
  });

  it('uses the first word when it does not repeat the client', () => {
    expect(suggestRefCode('Salem', 'Mobile App Build')).toBe('AAT/PRJ/SLM-MOB');
  });

  it('suggests nothing until both parts are known', () => {
    expect(suggestRefCode('', 'Website')).toBe('');
    expect(suggestRefCode('Salem', '')).toBe('');
  });
});
