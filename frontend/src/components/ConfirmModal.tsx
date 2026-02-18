import buttonStyles from '../styles/Button.module.css';
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
        <h3 id="confirm-modal-title">{title}</h3>
        <p className={styles.message}>{message}</p>
        <div className={styles.actions}>
          <button
            className={buttonStyles.ghost}
            disabled={isConfirming}
            onClick={onCancel}
            type="button"
          >
            {cancelText}
          </button>
          <button
            className={buttonStyles.primary}
            disabled={isConfirming}
            onClick={() => {
              void onConfirm();
            }}
            type="button"
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
}
