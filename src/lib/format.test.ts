import { describe, expect, it } from 'vitest';
import { abbreviateName, shortFirstName } from './format';

describe('shortFirstName', () => {
  it('returns just the first name', () => {
    expect(shortFirstName('Jose David Jayk Vanegas')).toBe('Jose');
  });

  it('caps a long first name at 10 chars with an ellipsis', () => {
    expect(shortFirstName('Bartholomew')).toBe('Bartholome…'); // 11 → 10 + …
  });

  it('leaves a 10-char first name untouched', () => {
    expect(shortFirstName('Maximilian')).toBe('Maximilian'); // exactly 10
  });

  it('handles a single short name', () => {
    expect(shortFirstName('Ana')).toBe('Ana');
  });

  it('collapses extra whitespace', () => {
    expect(shortFirstName('  Jose   David ')).toBe('Jose');
  });

  it('falls back to Unknown for empty/nullish', () => {
    expect(shortFirstName(null)).toBe('Unknown');
    expect(shortFirstName(undefined)).toBe('Unknown');
    expect(shortFirstName('   ')).toBe('Unknown');
  });

  it('respects a custom max', () => {
    expect(shortFirstName('Jonathan', 4)).toBe('Jona…');
  });
});

describe('abbreviateName', () => {
  it('uses first name + last initial', () => {
    expect(abbreviateName('Jose David Jayk Vanegas')).toBe('Jose V.');
  });

  it('handles two-word names', () => {
    expect(abbreviateName('Ana Lopez')).toBe('Ana L.');
  });

  it('returns a single-word name unchanged', () => {
    expect(abbreviateName('Ana')).toBe('Ana');
  });

  it('uppercases the last initial', () => {
    expect(abbreviateName('jose vanegas')).toBe('jose V.');
  });

  it('collapses extra whitespace', () => {
    expect(abbreviateName('  Jose   David   Vanegas ')).toBe('Jose V.');
  });

  it('falls back to Unknown for empty/nullish', () => {
    expect(abbreviateName(null)).toBe('Unknown');
    expect(abbreviateName('   ')).toBe('Unknown');
  });
});
