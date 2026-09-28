import type { ButtonHTMLAttributes } from "react";
import clsx from "clsx";
import styles from "./Button.module.scss";

type ButtonVariant = "primary" | "secondary" | "ghost";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
}

export const Button = ({ variant = "secondary", type = "button", className, ...props }: ButtonProps) => (
  <button type={type} className={clsx(styles.button, styles[variant], className)} {...props} />
);
