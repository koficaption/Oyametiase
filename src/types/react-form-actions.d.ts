import "react";

declare module "react" {
  interface FormHTMLAttributes<T> {
    action?:
      | string
      | ((formData: FormData) => void | Promise<void> | Promise<unknown>)
      | undefined;
  }
}
