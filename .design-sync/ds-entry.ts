// Bundle entry for design-sync (claude.ai/design).
// Re-exports the shift-manager UI kit (src/components/ui) so the converter
// assigns every primitive to window.ShiftManagerUI. This app has no library
// build, so this hand-written barrel stands in for a dist entry.
// Hand-written sync input — safe to commit, reused on every re-sync.
export * from '../src/components/ui/Avatar';
export * from '../src/components/ui/Badge';
export * from '../src/components/ui/Button';
export * from '../src/components/ui/Dialog';
export * from '../src/components/ui/DropdownButton';
export * from '../src/components/ui/EmptyState';
export * from '../src/components/ui/Field';
export * from '../src/components/ui/Icon';
export * from '../src/components/ui/Select';
export * from '../src/components/ui/Stat';
export * from '../src/components/ui/Tabs';
