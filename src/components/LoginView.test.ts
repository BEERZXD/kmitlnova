import { describe, expect, it } from 'vitest';
import { getLoginImageClassName, isLoginSubmitKey, parseLoginImageList } from './LoginView';

describe('parseLoginImageList', () => {
  it('uses non-empty non-comment lines as login image sources with default framing', () => {
    expect(parseLoginImageList(`
# Login images
/login-bg.jpg

https://example.com/campus.jpg
  /another-local-image.webp
    `)).toEqual([
      { src: '/login-bg.jpg', objectPosition: '50% 50%' },
      { src: 'https://example.com/campus.jpg', objectPosition: '50% 50%' },
      { src: '/another-local-image.webp', objectPosition: '50% 50%' },
    ]);
  });

  it('supports pipe-delimited object-position values for per-image framing', () => {
    expect(parseLoginImageList(`
/login-bg.jpg | 50% 35%
https://example.com/campus.jpg | center top
    `)).toEqual([
      { src: '/login-bg.jpg', objectPosition: '50% 35%' },
      { src: 'https://example.com/campus.jpg', objectPosition: 'center top' },
    ]);
  });
});

describe('getLoginImageClassName', () => {
  it('only marks the visible image as active so the carousel just crossfades', () => {
    expect(getLoginImageClassName(0, 0)).toBe('login-visual-image active');
    expect(getLoginImageClassName(1, 0)).toBe('login-visual-image inactive');
  });
});

describe('isLoginSubmitKey', () => {
  it('treats plain Enter as a login submit intent', () => {
    expect(isLoginSubmitKey({ key: 'Enter', shiftKey: false, isComposing: false })).toBe(true);
    expect(isLoginSubmitKey({ key: 'Enter', shiftKey: true, isComposing: false })).toBe(false);
    expect(isLoginSubmitKey({ key: 'a', shiftKey: false, isComposing: false })).toBe(false);
  });
});
