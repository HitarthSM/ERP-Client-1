import { describe, expect, it } from 'vitest';
import { TruncatedLabel } from './TruncatedLabel';

describe('TruncatedLabel', () => {
  it('exposes full text via title', () => {
    const el = TruncatedLabel({ text: 'Very Long Warehouse Name' });
    expect(el.props.title).toBe('Very Long Warehouse Name');
    expect(el.props.children).toBe('Very Long Warehouse Name');
    expect(String(el.props.className)).toContain('truncate');
  });
});
