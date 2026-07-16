import styles from "./DeviceTableSkeleton.module.css";

export default function DeviceTableSkeleton() {
  return (
    <div className={styles.skeleton}>
      {Array.from({ length: 8 }).map((_, index) => (
        <div className={styles.row} key={index}>
          <span />
          <span />
          <span />
          <span />
          <span />
        </div>
      ))}
    </div>
  );
}
