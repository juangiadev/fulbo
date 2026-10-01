import { AlertTriangle, LoaderCircle } from 'lucide-react';
import styles from './ConfirmModal.module.css';

interface ConfirmModalProps {
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  isConfirming?: boolean;
  onCancel: () => void;
  onConfirm: () => void | Promise<void>;
}

export function ConfirmModal({
  title,
  message,
  confirmText = 'Eliminar',
  cancelText = 'Cancelar',
  isConfirming = false,
  onCancel,
  onConfirm,
}: ConfirmModalProps) {
  return (
    <div className={styles.backdrop} role="presentation">
      <div
        aria-labelledby="confirm-modal-title"
        aria-modal="true"
        className={styles.modal}
        role="dialog"
      >
        <div className={styles.header}>
          <span aria-hidden="true" className={styles.iconWrap}>
            <AlertTriangle size={24} strokeWidth={1.8} />
          </span>
          <div>
            <p className={styles.eyebrow}>Confirmar acción</p>
            <h3 id="confirm-modal-title">{title}</h3>
          </div>
        </div>

        <p className={styles.message}>{message}</p>

        <div className={styles.actions}>
          <button
            className={styles.cancelButton}
            disabled={isConfirming}
            onClick={onCancel}
            type="button"
          >
            {cancelText}
          </button>
          <button
            className={styles.confirmButton}
            disabled={isConfirming}
            onClick={() => {
              void onConfirm();
            }}
            type="button"
          >
            <span>{isConfirming ? 'Eliminando...' : confirmText}</span>
            {isConfirming ? <LoaderCircle aria-hidden="true" className={styles.spinner} size={18} /> : null}
          </button>
        </div>
      </div>
    </div>
  );
}
