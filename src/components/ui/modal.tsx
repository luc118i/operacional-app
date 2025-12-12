import { ReactNode } from "react";

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  children: ReactNode;
  contentClassName?: string;
}

export function Modal({
  isOpen,
  onClose,
  children,
  contentClassName,
}: ModalProps) {
  if (!isOpen) return null;

  return (
    <div
      className="
        fixed inset-0 z-[99999]
        flex items-center justify-center
        bg-[rgba(0,0,0,0.75)]
        px-4
      "
      onClick={onClose}
    >
      <div
        className={`
          relative w-full max-w-3xl
          bg-white rounded-lg p-6 shadow-xl
          max-h-[90vh] overflow-y-auto
          ${contentClassName ?? ""}
        `}
        onClick={(e) => e.stopPropagation()} // não fecha ao clicar dentro
      >
        {children}
      </div>
    </div>
  );
}
