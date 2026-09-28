import styles from "./UserCard.module.scss";

export const UserCardSkeleton = () => (
  <div className={styles.card} aria-hidden="true">
    <div className={styles.skeletonAvatar} />
    <div className={styles.body}>
      <div className={styles.skeletonLine} />
      <div className={styles.skeletonLineShort} />
      <div className={styles.hobbies}>
        <div className={styles.skeletonPill} />
        <div className={styles.skeletonPill} />
      </div>
    </div>
  </div>
);
