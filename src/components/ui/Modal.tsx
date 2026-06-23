'use client';

import { ReactNode, useEffect, useRef } from 'react';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  children: ReactNode;
  size?: 'sm' | 'md' | 'lg';
}

const sizeStyles = {
  sm: 'max-w-sm',
  md: 'max-w-md',
  lg: 'max-w-lg',
};

export function Modal({ isOpen, onClose, children, size = 'md' }: ModalProps) {
  const overlayRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      document.body.style.overflow = 'hidden';
    }

    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = '';
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      ref={overlayRef}
      className="fixed inset-0 z-[400] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200"
      onClick={(e) => {
        if (e.target === overlayRef.current) onClose();
      }}
    >
      <div
        className={`
          bg-white rounded-2xl w-full ${sizeStyles[size]}
          shadow-xl animate-in zoom-in-95 fade-in duration-200
        `}
      >
        {children}
      </div>
    </div>
  );
}

interface ModalHeaderProps {
  title: string;
  onClose?: () => void;
}

export function ModalHeader({ title, onClose }: ModalHeaderProps) {
  return (
    <div className="flex items-center justify-between p-6 border-b border-[#E7E5E4]">
      <h2 className="text-xl font-bold text-[#1C1917]">{title}</h2>
      {onClose && (
        <button
          onClick={onClose}
          className="p-2 text-[#78716C] hover:text-[#1C1917] hover:bg-[#F5F5F4] rounded-full transition-colors"
        >
          <span className="material-symbols-outlined">close</span>
        </button>
      )}
    </div>
  );
}

export function ModalBody({ children }: { children: ReactNode }) {
  return <div className="p-6">{children}</div>;
}

export function ModalFooter({ children }: { children: ReactNode }) {
  return (
    <div className="p-6 border-t border-[#E7E5E4] bg-[#F9F7F4] rounded-b-2xl">
      {children}
    </div>
  );
}
