import { describe, it, expect } from 'vitest';
import { transitionBookmark } from '../logic/bookmark';

describe('transitionBookmark', () => {
  it('should save a new bookmark (insert active)', () => {
    const result = transitionBookmark(null, 'save');
    expect(result.nextStatus).toBe('active');
    expect(result.shouldInsert).toBe(true);
    expect(result.shouldUpdate).toBe(false);
    expect(result.countAdjustment).toBe(1);
  });

  it('should reactivate an inactive bookmark (update to active)', () => {
    const result = transitionBookmark({ status: 'inactive' }, 'save');
    expect(result.nextStatus).toBe('active');
    expect(result.shouldInsert).toBe(false);
    expect(result.shouldUpdate).toBe(true);
    expect(result.countAdjustment).toBe(1);
  });

  it('should no-op when saving an already active bookmark', () => {
    const result = transitionBookmark({ status: 'active' }, 'save');
    expect(result.nextStatus).toBe('active');
    expect(result.shouldInsert).toBe(false);
    expect(result.shouldUpdate).toBe(false);
    expect(result.countAdjustment).toBe(0);
  });

  it('should soft-delete an active bookmark (update to inactive)', () => {
    const result = transitionBookmark({ status: 'active' }, 'unsave');
    expect(result.nextStatus).toBe('inactive');
    expect(result.shouldInsert).toBe(false);
    expect(result.shouldUpdate).toBe(true);
    expect(result.countAdjustment).toBe(-1);
  });

  it('should no-op when unsaving an already inactive bookmark', () => {
    const result = transitionBookmark({ status: 'inactive' }, 'unsave');
    expect(result.nextStatus).toBe('inactive');
    expect(result.shouldInsert).toBe(false);
    expect(result.shouldUpdate).toBe(false);
    expect(result.countAdjustment).toBe(0);
  });

  it('should no-op when unsaving a non-existent (null) bookmark', () => {
    const result = transitionBookmark(null, 'unsave');
    expect(result.nextStatus).toBe('inactive');
    expect(result.shouldInsert).toBe(false);
    expect(result.shouldUpdate).toBe(false);
    expect(result.countAdjustment).toBe(0);
  });
});
