
import React from 'react';
import type { ConfirmationButtonVariant } from '../types';

interface ConfirmationModalProps {
  isOpen: boolean;
  title: string;
  message: string;
  onConfirm: () => void;
  onCancel: () => void;
  confirmButtonText?: string;
  confirmButtonVariant?: ConfirmationButtonVariant;
}

export const ConfirmationModal: React.FC<ConfirmationModalProps> = ({
  isOpen,
  title,
  message,
  onConfirm,
  onCancel,
  confirmButtonText = "確認", 
  confirmButtonVariant = 'default' 
}) => {
  if (!isOpen) {
    return null;
  }

  const confirmButtonClasses = () => {
    let base = "px-4 py-2 text-sm font-medium text-white rounded-md transition-colors focus:outline-none focus:ring-2 focus:ring-offset-1";
    if (confirmButtonVariant === 'destructive') {
      return `${base} bg-red-500 hover:bg-red-600 focus:ring-red-500`;
    }
    return `${base} bg-blue-500 hover:bg-blue-600 focus:ring-blue-500`;
  };

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900 bg-opacity-60 backdrop-blur-sm p-4"
      aria-labelledby="confirmation-modal-title"
      role="dialog"
      aria-modal="true"
    >
      <div className="bg-white p-6 rounded-lg shadow-xl w-full max-w-md m-4 transform transition-all">
        <h2 id="confirmation-modal-title" className="text-xl font-semibold text-gray-800 mb-3">
          {title}
        </h2>
        <p className="text-gray-600 text-sm mb-6 whitespace-pre-wrap">
          {message}
        </p>
        <div className="flex justify-end space-x-3">
          <button
            onClick={onCancel}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-md border border-gray-300 transition-colors focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-blue-500"
            aria-label="キャンセル"
          >
            キャンセル
          </button>
          <button
            onClick={onConfirm}
            className={confirmButtonClasses()}
            aria-label={confirmButtonText} 
          >
            {confirmButtonText}
          </button>
        </div>
      </div>
    </div>
  );
};