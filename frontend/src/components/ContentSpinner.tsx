import styles from './ContentSpinner.module.css';

export function ContentSpinner() {
  return (
    <div className={styles.wrap}>
      <span aria-hidden="true" className={styles.spinner} />
    </div>
  );
}
