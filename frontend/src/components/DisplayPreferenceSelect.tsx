import { DisplayPreference } from '@shared/enums';
import { ChevronDown, Image, Shield } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import styles from './DisplayPreferenceSelect.module.css';

interface DisplayPreferenceSelectProps {
  describedBy?: string;
  disabled?: boolean;
  onChange: (value: DisplayPreference) => void;
  value: DisplayPreference;
}

const OPTIONS = [
  {
    description: 'Usar tu foto de perfil.',
    icon: Image,
    label: 'Mi foto',
    value: DisplayPreference.IMAGE,
  },
  {
    description: 'Usar el escudo de tu equipo favorito.',
    icon: Shield,
    label: 'Mi equipo favorito',
    value: DisplayPreference.FAVORITE_TEAM,
  },
] as const;

export function DisplayPreferenceSelect({
  describedBy,
  disabled = false,
  onChange,
  value,
}: DisplayPreferenceSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const selectorRef = useRef<HTMLDivElement>(null);
  const selectedOption = useMemo(
    () => OPTIONS.find((option) => option.value === value) ?? OPTIONS[0],
    [value],
  );

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    const closeOnOutsidePointerDown = (event: PointerEvent) => {
      if (!selectorRef.current?.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsOpen(false);
      }
    };

    window.addEventListener('pointerdown', closeOnOutsidePointerDown);
    window.addEventListener('keydown', closeOnEscape);
    return () => {
      window.removeEventListener('pointerdown', closeOnOutsidePointerDown);
      window.removeEventListener('keydown', closeOnEscape);
    };
  }, [isOpen]);

  const SelectedIcon = selectedOption.icon;

  return (
    <div className={styles.selector} ref={selectorRef}>
      <button
        aria-describedby={describedBy}
        aria-expanded={isOpen}
        className={styles.trigger}
        disabled={disabled}
        onClick={() => setIsOpen((current) => !current)}
        type="button"
      >
        <span aria-hidden="true" className={styles.iconWrap}>
          <SelectedIcon size={18} />
        </span>
        <span>{selectedOption.label}</span>
        <ChevronDown aria-hidden="true" className={styles.triggerIcon} size={18} />
      </button>

      {isOpen ? (
        <div aria-label="Opciones para mostrar en el avatar" className={styles.optionList}>
          {OPTIONS.map(({ description, icon: Icon, label, value: optionValue }) => {
            const isSelected = value === optionValue;

            return (
              <button
                aria-pressed={isSelected}
                className={`${styles.option} ${isSelected ? styles.selected : ''}`}
                key={optionValue}
                onClick={() => {
                  onChange(optionValue);
                  setIsOpen(false);
                }}
                type="button"
              >
                <span aria-hidden="true" className={styles.iconWrap}>
                  <Icon size={18} />
                </span>
                <span className={styles.copy}>
                  <strong>{label}</strong>
                  <small>{description}</small>
                </span>
              </button>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}
