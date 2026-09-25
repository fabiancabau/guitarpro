import { useEffect, useId, useRef, useState, type ReactNode } from 'react';

interface PopoverProps {
  /** Content of the trigger button. */
  trigger: ReactNode;
  triggerLabel: string;
  triggerClassName?: string;
  isActive?: boolean;
  disabled?: boolean;
  align?: 'start' | 'center' | 'end';
  placement?: 'top' | 'bottom';
  children: ReactNode;
}

/**
 * Button + floating panel. The panel stays mounted while closed so its controls keep their
 * state and remain addressable; it is only hidden visually.
 */
export function Popover({
  trigger,
  triggerLabel,
  triggerClassName = 'chip',
  isActive = false,
  disabled = false,
  align = 'center',
  placement = 'top',
  children
}: PopoverProps) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement | null>(null);
  const panelId = useId();

  useEffect(() => {
    if (!open) return;

    const onPointerDown = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false);
    };

    document.addEventListener('pointerdown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('pointerdown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [open]);

  return (
    <div className="popover" ref={rootRef}>
      <button
        type="button"
        className={`${triggerClassName}${isActive ? ' is-active' : ''}${open ? ' is-open' : ''}`}
        aria-label={triggerLabel}
        title={triggerLabel}
        aria-expanded={open}
        aria-controls={panelId}
        disabled={disabled}
        onClick={() => setOpen((value) => !value)}
      >
        {trigger}
      </button>
      <div
        id={panelId}
        className={`popover__panel popover__panel--${placement} popover__panel--${align}`}
        data-open={open}
      >
        {children}
      </div>
    </div>
  );
}
