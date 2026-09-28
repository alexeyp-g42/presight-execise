import { Avatar } from "@/components/Avatar";
import type { User } from "@/types/user";
import { hueStyle } from "@/utils/color";
import { getFlag } from "@/utils/flags";
import styles from "./UserCard.module.scss";

const VISIBLE_HOBBIES = 2;

interface UserCardProps {
  user: User;
}

export const UserCard = ({ user }: UserCardProps) => {
  const fullName = `${user.first_name} ${user.last_name}`;
  const nationalities = user.nationalities.join(", ");
  const visibleHobbies = user.hobbies.slice(0, VISIBLE_HOBBIES);
  const hiddenHobbies = user.hobbies.slice(VISIBLE_HOBBIES);

  return (
    <article className={styles.card}>
      <Avatar src={user.avatar} name={fullName} />
      <div className={styles.body}>
        <h3 className={styles.name} title={fullName}>
          {fullName}
        </h3>
        <div className={styles.meta}>
          <span className={styles.nationality} title={nationalities}>
            <span className={styles.flags} aria-hidden="true">
              {user.nationalities.map(getFlag).join("")}
            </span>
            {nationalities}
          </span>
          <span className={styles.age} aria-label={`${user.age} years old`}>
            <strong>{user.age}</strong> yrs
          </span>
        </div>
        <ul className={styles.hobbies} aria-label="Hobbies">
          {visibleHobbies.map((hobby) => (
            <li key={hobby} className={styles.hobby} style={hueStyle(hobby)}>
              {hobby}
            </li>
          ))}
          {hiddenHobbies.length > 0 && (
            <li className={styles.more} title={hiddenHobbies.join(", ")}>
              +{hiddenHobbies.length}
            </li>
          )}
          {user.hobbies.length === 0 && <li className={styles.noHobbies}>No hobbies yet</li>}
        </ul>
      </div>
    </article>
  );
};
