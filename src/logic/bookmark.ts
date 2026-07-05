export interface SavedPostState {
  status: 'active' | 'inactive';
}

export interface TransitionResult {
  nextStatus: 'active' | 'inactive';
  shouldInsert: boolean;
  shouldUpdate: boolean;
  countAdjustment: number;
}

/**
 * Pure state machine transition function for saving/unsaving posts.
 * Preserves history and enforces idempotence.
 */
export function transitionBookmark(
  currentRecord: SavedPostState | null,
  action: 'save' | 'unsave'
): TransitionResult {
  if (action === 'save') {
    if (!currentRecord) {
      return {
        nextStatus: 'active',
        shouldInsert: true,
        shouldUpdate: false,
        countAdjustment: 1,
      };
    }
    if (currentRecord.status === 'inactive') {
      return {
        nextStatus: 'active',
        shouldInsert: false,
        shouldUpdate: true,
        countAdjustment: 1,
      };
    }
    // Already active, save is idempotent (no-op)
    return {
      nextStatus: 'active',
      shouldInsert: false,
      shouldUpdate: false,
      countAdjustment: 0,
    };
  } else {
    // Action is 'unsave'
    if (!currentRecord || currentRecord.status === 'inactive') {
      // Not saved, or already unsaved, unsave is idempotent (no-op)
      return {
        nextStatus: 'inactive',
        shouldInsert: false,
        shouldUpdate: false,
        countAdjustment: 0,
      };
    }
    // Active, transition to inactive (soft delete)
    return {
      nextStatus: 'inactive',
      shouldInsert: false,
      shouldUpdate: true,
      countAdjustment: -1,
    };
  }
}
