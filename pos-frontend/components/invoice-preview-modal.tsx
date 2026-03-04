'use client';

import { useEffect, useState } from 'react';
import { X, Download, Printer, Loader2 } from 'lucide-react';
import { api } from '@/lib/api';

interface InvoicePreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  invoiceId: string;
}

export function InvoicePreviewModal({ isOpen, onClose, invoiceId }: InvoicePreviewModalProps) {
  const [blob, setBlob] = useState<Blob | null>(null);
  const [blobUrl, setBlobUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen || !invoiceId) {
      return;
    }

    // Reset state when modal opens
    setLoading(true);
    setError(null);
    setBlob(null);

    // Fetch PDF
    console.log('InvoicePreviewModal - Fetching PDF for invoice:', invoiceId);
    
    api.invoices.downloadPDF(invoiceId)
      .then(response => {
        console.log('InvoicePreviewModal - PDF response received:', {
          status: response.status,
          dataType: typeof response.data,
          isBlob: response.data instanceof Blob,
          size: response.data instanceof Blob ? response.data.size : 'N/A',
        });

        if (response.data instanceof Blob && response.data.size > 0) {
          setBlob(response.data);
          const url = window.URL.createObjectURL(response.data);
          setBlobUrl(url);
          console.log('InvoicePreviewModal - Blob URL created:', url);
        } else {
          const errorMsg = 'Invalid PDF data received';
          console.error('InvoicePreviewModal - Error:', errorMsg);
          setError(errorMsg);
        }
      })
      .catch(err => {
        const errorMsg = err.message || 'Failed to load PDF preview';
        console.error('InvoicePreviewModal - Fetch error:', err);
        setError(errorMsg);
      })
      .finally(() => {
        setLoading(false);
      });

    // Cleanup: Revoke blob URL when modal closes
    return () => {
      if (blobUrl) {
        console.log('InvoicePreviewModal - Revoking blob URL:', blobUrl);
        window.URL.revokeObjectURL(blobUrl);
        setBlobUrl(null);
      }
    };
  }, [isOpen, invoiceId]);

  const handleDownloadFromPreview = () => {
    if (!blob) {
      console.error('InvoicePreviewModal - No blob available for download');
      return;
    }

    console.log('InvoicePreviewModal - Downloading PDF from preview');
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `invoice-${invoiceId}.pdf`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
    console.log('InvoicePreviewModal - Download triggered');
  };

  const handlePrint = () => {
    if (!blobUrl) {
      console.error('InvoicePreviewModal - No blob URL available for print');
      return;
    }

    console.log('InvoicePreviewModal - Opening print dialog');
    const printWindow = window.open(blobUrl);
    if (printWindow) {
      printWindow.onload = () => {
        printWindow.print();
      };
    } else {
      console.error('InvoicePreviewModal - Failed to open print window (popup blocked?)');
      alert('Please allow popups to print the invoice');
    }
  };

  const handleClose = () => {
    console.log('InvoicePreviewModal - Closing modal');
    onClose();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      handleClose();
    }
  };

  if (!isOpen) {
    return null;
  }

  return (
    <div 
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
      onClick={handleClose}
      onKeyDown={handleKeyDown}
      role="dialog"
      aria-modal="true"
      aria-labelledby="invoice-preview-title"
    >
      <div 
        className="bg-white rounded-lg w-full h-full md:w-[90vw] md:h-[90vh] md:max-w-6xl flex flex-col shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200">
          <h2 id="invoice-preview-title" className="text-xl font-semibold text-gray-900">
            Invoice Preview
          </h2>
          <button
            onClick={handleClose}
            className="text-gray-400 hover:text-gray-600 transition-colors p-1 rounded hover:bg-gray-100"
            aria-label="Close preview"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 flex items-center justify-center p-4 bg-gray-50 overflow-hidden">
          {loading && (
            <div className="flex flex-col items-center gap-3">
              <Loader2 className="w-12 h-12 animate-spin text-blue-600" />
              <p className="text-gray-600 text-sm">Loading PDF preview...</p>
            </div>
          )}

          {error && (
            <div className="flex flex-col items-center gap-3 max-w-md text-center">
              <div className="w-16 h-16 rounded-full bg-red-100 flex items-center justify-center">
                <X className="w-8 h-8 text-red-600" />
              </div>
              <div>
                <p className="text-red-600 font-semibold mb-1">Failed to load PDF</p>
                <p className="text-gray-600 text-sm">{error}</p>
              </div>
              <button
                onClick={handleClose}
                className="mt-2 px-4 py-2 bg-gray-200 hover:bg-gray-300 rounded-lg text-gray-700 text-sm font-medium transition-colors"
              >
                Close
              </button>
            </div>
          )}

          {!loading && !error && blobUrl && (
            <iframe
              src={blobUrl}
              className="w-full h-full rounded border border-gray-300 bg-white"
              title="Invoice Preview"
              style={{ minHeight: '400px' }}
            />
          )}
        </div>

        {/* Footer */}
        {!loading && !error && blob && (
          <div className="flex items-center justify-between p-4 border-t border-gray-200 bg-white">
            <div className="text-sm text-gray-500">
              Invoice #{invoiceId.slice(0, 8)}
            </div>
            <div className="flex gap-2">
              <button
                onClick={handlePrint}
                className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 hover:bg-gray-50 rounded-lg text-gray-700 font-medium transition-colors"
                disabled={!blobUrl}
              >
                <Printer className="w-4 h-4" />
                <span className="hidden sm:inline">Print</span>
              </button>
              <button
                onClick={handleDownloadFromPreview}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg text-white font-medium transition-colors shadow-sm"
                disabled={!blob}
              >
                <Download className="w-4 h-4" />
                <span className="hidden sm:inline">Download PDF</span>
              </button>
              <button
                onClick={handleClose}
                className="px-4 py-2 bg-gray-200 hover:bg-gray-300 rounded-lg text-gray-700 font-medium transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
