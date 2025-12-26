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
      onClick={(e) => {
        // ✅ fecha SOMENTE se clicar no backdrop (fora do conteúdo)
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className={`
          relative w-full max-w-3xl
          bg-white rounded-lg p-6 shadow-xl
          max-h-[90vh] overflow-y-auto
          ${contentClassName ?? ""}
        `}
      >
        {children}
      </div>
    </div>
  );
}
