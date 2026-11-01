"use client";
import { useActionState, type ReactNode } from "react";
import { useFormStatus } from "react-dom";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { Result } from "@/app/actions";
export function Submit({
  children,
  disabled = false,
  variant = "default",
}: {
  children: ReactNode;
  disabled?: boolean;
  variant?: "default" | "outline" | "ghost" | "destructive";
}) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={disabled || pending} variant={variant}>
      {pending ? (
        <>
          <Loader2 className="spin" size={16} />
          처리 중…
        </>
      ) : (
        children
      )}
    </Button>
  );
}
export function ActionForm({
  action,
  children,
  className = "",
  confirm,
}: {
  action: (state: Result, form: FormData) => Promise<Result>;
  children: ReactNode;
  className?: string;
  confirm?: string;
}) {
  const [state, formAction] = useActionState(action, {});
  return (
    <form
      action={formAction}
      className={className}
      onSubmit={(e) => {
        if (confirm && !window.confirm(confirm)) e.preventDefault();
      }}
    >
      {children}
      <div aria-live="polite">
        {state.error && (
          <p className="message error" role="alert">
            {state.error}
          </p>
        )}
        {state.success && (
          <p className="message success" role="status">
            {state.success}
          </p>
        )}
      </div>
    </form>
  );
}
export function Hidden({ name, value }: { name: string; value: string }) {
  return <input type="hidden" name={name} value={value} />;
}
