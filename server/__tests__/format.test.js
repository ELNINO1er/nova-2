import { describe, it, expect } from 'vitest';
import {
  capitalize, initials, formatBytes, dashboardStatusText,
  dashboardStatusClass, historyTypeLabel, mapDocumentCategory,
} from '../../src/utils/format.js';

describe('capitalize', () => {
  it('capitalizes first letter', () => {
    expect(capitalize('hello')).toBe('Hello');
  });
  it('handles empty string', () => {
    expect(capitalize('')).toBe('');
  });
  it('handles null', () => {
    expect(capitalize(null)).toBeNull();
  });
});

describe('initials', () => {
  it('extracts two initials', () => {
    expect(initials('Kouamé Bamba')).toBe('KB');
  });
  it('strips Dr. prefix', () => {
    expect(initials('Dr. Aïcha Touré')).toBe('AT');
  });
  it('returns DR for empty', () => {
    expect(initials('')).toBe('DR');
  });
});

describe('formatBytes', () => {
  it('formats KB', () => {
    expect(formatBytes(5120)).toBe('5 KB');
  });
  it('formats MB', () => {
    expect(formatBytes(2 * 1024 * 1024)).toBe('2.0 MB');
  });
  it('handles 0', () => {
    expect(formatBytes(0)).toBe('0 KB');
  });
});

describe('dashboardStatusText', () => {
  it('returns Critique for critical', () => {
    expect(dashboardStatusText('critical')).toBe('Critique');
  });
  it('returns Normal for unknown', () => {
    expect(dashboardStatusText('ok')).toBe('Normal');
  });
});

describe('dashboardStatusClass', () => {
  it('returns red for critical', () => {
    expect(dashboardStatusClass('critical')).toContain('red');
  });
  it('returns emerald for normal', () => {
    expect(dashboardStatusClass('normal')).toContain('emerald');
  });
});

describe('historyTypeLabel', () => {
  it('maps known types', () => {
    expect(historyTypeLabel('appointment')).toBe('Consultation');
    expect(historyTypeLabel('prescription')).toBe('Ordonnance');
  });
  it('returns raw type for unknown', () => {
    expect(historyTypeLabel('custom')).toBe('custom');
  });
});

describe('mapDocumentCategory', () => {
  it('maps prescription to ordonnance', () => {
    expect(mapDocumentCategory('prescription')).toBe('ordonnance');
  });
  it('returns consultation for null', () => {
    expect(mapDocumentCategory(null)).toBe('consultation');
  });
});
