import styles from "./statcard.module.css";

type Props = {
  title: string;
  value: number | string;
  color?: string;
  subtitle?: string;
};

export default function StatCard({ title, value, color = "#2563eb", subtitle }: Props) {
  return (
    <div className={styles.card}>
      <div className={styles.header}>
        <span>{title}</span>
      </div>

      <div className={styles.value} style={{ color }}>
        {value}
      </div>

      {subtitle && <div className={styles.sub}>{subtitle}</div>}
    </div>
  );
}
