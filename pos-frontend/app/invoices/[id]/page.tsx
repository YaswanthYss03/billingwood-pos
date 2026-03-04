'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { Eye, Download, Send, CreditCard, XCircle, Edit2, ArrowLeft, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { api } from '@/lib/api';
import { InvoicePreviewModal } from '@/components/invoice-preview-modal';

interface Invoice {
  id: string;
  invoiceNumber: string;
  invoiceDate: string;
  dueDate: string;
  paymentTerms: string;
  customerName: string;
  customerPhone: string;
  customerEmail: string;
  customerAddress: string;
  customerGstin: string;
  subtotal: number;
  taxAmount: number;
  discount: number;
  totalAmount: number;
  status: string;
  notes: string;
  termsConditions: string;
  sentAt: string | null;
  paidAt: string | null;
  location: {
    name: string;
  };
  items: Array<{
    id: string;
    itemName: string;
    quantity: number;
    unit: string;
    price: number;
    gstRate: number;
    gstAmount: number;
    discount: number;
    totalAmount: number;
    hsnCode: string;
  }>;
  payments: Array<{
    id: string;
    amount: number;
    paymentMethod: string;
    paymentDate: string;
    reference: string;
    notes: string;
  }>;
}

export default function InvoiceDetailPage() {
  const params = useParams();
  const router = useRouter();
  const invoiceId = params.id as string;
  const [invoice, setInvoice] = useState<Invoice | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [paymentData, setPaymentData] = useState({
    amount: '',
    paymentMethod: 'CASH',
    reference: '',
    notes: '',
  });

  useEffect(() => {
    fetchInvoice();
  }, [invoiceId]);

  const fetchInvoice = async () => {
    try {
      setLoading(true);
      const response = await api.invoices.get(invoiceId);
      if (response.data) {
        setInvoice(response.data);
      }
    } catch (error) {
      console.error('Failed to fetch invoice:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleMarkAsSent = async () => {
    if (!confirm('Mark this invoice as sent? This will deduct inventory.')) return;

    try {
      setActionLoading('markAsSent');
      await api.invoices.markAsSent(invoiceId);
      toast.success('Invoice marked as sent!');
      fetchInvoice();
    } catch (error: any) {
      console.error('Failed to mark as sent:', error);
      const errorMessage = error?.response?.data?.message || error?.message || 'Failed to mark as sent';
      toast.error(errorMessage);
    } finally {
      setActionLoading(null);
    }
  };

  const handleRecordPayment = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      setActionLoading('recordPayment');
      await api.invoices.recordPayment(invoiceId, {
        amount: parseFloat(paymentData.amount),
        paymentMethod: paymentData.paymentMethod,
        notes: paymentData.notes,
      });
      
      toast.success('Payment recorded successfully!');
      setShowPaymentModal(false);
      setPaymentData({
        amount: '',
        paymentMethod: 'CASH',
        reference: '',
        notes: '',
      });
      fetchInvoice();
    } catch (error: any) {
      console.error('Failed to record payment:', error);
      toast.error(error?.response?.data?.message || 'Failed to record payment');
    } finally {
      setActionLoading(null);
    }
  };

  const handleCancel = async () => {
    if (!confirm('Are you sure you want to cancel this invoice? This will restore inventory if it was sent.')) return;

    try {
      setActionLoading('cancel');
      await api.invoices.cancel(invoiceId);
      toast.success('Invoice cancelled successfully!');
      router.push('/invoices');
    } catch (error: any) {
      console.error('Failed to cancel invoice:', error);
      toast.error(error?.response?.data?.message || 'Failed to cancel invoice');
    } finally {
      setActionLoading(null);
    }
  };

  const handleDownloadPDF = async () => {
    try {
      setActionLoading('download');
      console.log('Downloading PDF for invoice:', invoiceId);
      const response = await api.invoices.downloadPDF(invoiceId);
      console.log('PDF response received:', response);
      console.log('PDF response data type:', response.data instanceof Blob, response.data);
      
      // Verify we have a blob
      if (!(response.data instanceof Blob)) {
        console.error('Response is not a Blob:', response.data);
        toast.error('Invalid PDF response from server');
        return;
      }
      
      const blob = response.data;
      console.log('Blob size:', blob.size, 'Type:', blob.type);
      
      if (blob.size === 0) {
        console.error('Blob is empty');
        toast.error('Received empty PDF file');
        return;
      }
      
      const url = window.URL.createObjectURL(blob);
      console.log('Created URL:', url);
      
      const a = document.createElement('a');
      a.href = url;
      a.download = `invoice-${invoice?.invoiceNumber}.pdf`;
      document.body.appendChild(a);
      a.click();
      console.log('Download triggered');
      toast.success('PDF downloaded successfully!');
      
      // Clean up
      setTimeout(() => {
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
        console.log('Cleanup complete');
      }, 100);
    } catch (error: any) {
      console.error('Failed to download PDF:', error);
      console.error('Error details:', {
        message: error.message,
        response: error.response,
        status: error.response?.status,
        data: error.response?.data
      });
      const errorMessage = error.response?.data?.message || error.message || 'Failed to download PDF';
      toast.error(errorMessage);
    } finally {
      setActionLoading(null);
    }
  };

  const getStatusBadgeClass = (status: string) => {
    const classes: Record<string, string> = {
      DRAFT: 'bg-gray-100 text-gray-800',
      SENT: 'bg-blue-100 text-blue-800',
      PARTIALLY_PAID: 'bg-yellow-100 text-yellow-800',
      PAID: 'bg-green-100 text-green-800',
      OVERDUE: 'bg-red-100 text-red-800',
      CANCELLED: 'bg-gray-100 text-gray-500',
    };
    return classes[status] || 'bg-gray-100 text-gray-800';
  };

  if (loading || !invoice) {
    return <div className="p-6">Loading invoice...</div>;
  }

  const totalPaid = invoice.payments.reduce((sum, p) => sum + Number(p.amount), 0);
  const balanceDue = Number(invoice.totalAmount) - totalPaid;

  return (
    <div className="p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex justify-between items-start mb-6">
          <div>
            <div className="flex items-center gap-4">
              <h1 className="text-3xl font-bold text-gray-900">
                {invoice.invoiceNumber}
              </h1>
              <span className={`px-3 py-1 text-sm rounded-full ${getStatusBadgeClass(invoice.status)}`}>
                {invoice.status}
              </span>
            </div>
            <p className="text-gray-600 mt-1">{invoice.location.name}</p>
          </div>

          <div className="flex gap-2 flex-wrap">
            <Link
              href="/invoices"
              className="px-3 py-1.5 text-sm border border-gray-300 rounded-md hover:bg-gray-50 flex items-center gap-1"
            >
              <ArrowLeft className="w-4 h-4" />
              Back
            </Link>
            {invoice.status === 'DRAFT' && (
              <>
                <button
                  onClick={handleMarkAsSent}
                  disabled={actionLoading === 'markAsSent'}
                  className="px-3 py-1.5 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 flex items-center gap-1"
                >
                  {actionLoading === 'markAsSent' ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                  Send
                </button>
                <Link
                  href={`/invoices/${invoiceId}/edit`}
                  className="px-3 py-1.5 text-sm bg-green-600 text-white rounded-md hover:bg-green-700 flex items-center gap-1"
                >
                  <Edit2 className="w-4 h-4" />
                  Edit
                </Link>
              </>
            )}
            {invoice.status !== 'PAID' && invoice.status !== 'CANCELLED' && (
              <button
                onClick={() => setShowPaymentModal(true)}
                className="px-3 py-1.5 text-sm bg-emerald-600 text-white rounded-md hover:bg-emerald-700 flex items-center gap-1"
              >
                <CreditCard className="w-4 h-4" />
                Payment
              </button>
            )}
            <button
              onClick={() => setShowPreview(true)}
              disabled={actionLoading !== null}
              className="px-3 py-1.5 text-sm bg-indigo-600 text-white rounded-md hover:bg-indigo-700 disabled:opacity-50 flex items-center gap-1"
            >
              <Eye className="w-4 h-4" />
              Preview
            </button>
            <button
              onClick={handleDownloadPDF}
              disabled={actionLoading === 'download'}
              className="px-3 py-1.5 text-sm bg-purple-600 text-white rounded-md hover:bg-purple-700 disabled:opacity-50 flex items-center gap-1"
            >
              {actionLoading === 'download' ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
              PDF
            </button>
            {invoice.status !== 'PAID' && invoice.status !== 'CANCELLED' && (
              <button
                onClick={handleCancel}
                disabled={actionLoading === 'cancel'}
                className="px-3 py-1.5 text-sm bg-red-600 text-white rounded-md hover:bg-red-700 disabled:opacity-50 flex items-center gap-1"
              >
                {actionLoading === 'cancel' ? <Loader2 className="w-4 h-4 animate-spin" /> : <XCircle className="w-4 h-4" />}
                Cancel
              </button>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Main Invoice Details */}
          <div className="md:col-span-2 space-y-6">
            {/* Invoice Info */}
            <div className="bg-white rounded-lg shadow-sm p-6">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-gray-600">Invoice Date</p>
                  <p className="font-semibold">
                    {new Date(invoice.invoiceDate).toLocaleDateString()}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Due Date</p>
                  <p className="font-semibold">
                    {new Date(invoice.dueDate).toLocaleDateString()}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Payment Terms</p>
                  <p className="font-semibold">{invoice.paymentTerms}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Status</p>
                  <p className="font-semibold">{invoice.status}</p>
                </div>
              </div>
            </div>

            {/* Customer Info */}
            <div className="bg-white rounded-lg shadow-sm p-6">
              <h2 className="text-lg font-semibold mb-4">Bill To</h2>
              <div className="space-y-2">
                <p className="font-semibold">{invoice.customerName}</p>
                <p className="text-sm text-gray-600">{invoice.customerPhone}</p>
                {invoice.customerEmail && (
                  <p className="text-sm text-gray-600">{invoice.customerEmail}</p>
                )}
                {invoice.customerAddress && (
                  <p className="text-sm text-gray-600">{invoice.customerAddress}</p>
                )}
                {invoice.customerGstin && (
                  <p className="text-sm text-gray-600">GSTIN: {invoice.customerGstin}</p>
                )}
              </div>
            </div>

            {/* Items */}
            <div className="bg-white rounded-lg shadow-sm overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-200">
                <h2 className="text-lg font-semibold">Items</h2>
              </div>
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Item</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">HSN</th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Qty</th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Price</th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">GST</th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Total</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {invoice.items.map((item) => (
                    <tr key={item.id}>
                      <td className="px-6 py-4 text-sm text-gray-900">{item.itemName}</td>
                      <td className="px-6 py-4 text-sm text-gray-600">{item.hsnCode || 'N/A'}</td>
                      <td className="px-6 py-4 text-sm text-gray-900 text-right">
                        {item.quantity} {item.unit}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-900 text-right">
                        ₹{Number(item.price).toFixed(2)}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-900 text-right">
                        {Number(item.gstRate).toFixed(0)}%
                      </td>
                      <td className="px-6 py-4 text-sm font-medium text-gray-900 text-right">
                        ₹{Number(item.totalAmount).toFixed(2)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {/* Totals */}
              <div className="px-6 py-4 border-t border-gray-200 bg-gray-50">
                <div className="flex justify-end">
                  <div className="w-64 space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>Subtotal:</span>
                      <span>₹{Number(invoice.subtotal).toFixed(2)}</span>
                    </div>
                    {Number(invoice.discount) > 0 && (
                      <div className="flex justify-between text-sm">
                        <span>Discount:</span>
                        <span>-₹{Number(invoice.discount).toFixed(2)}</span>
                      </div>
                    )}
                    <div className="flex justify-between text-sm">
                      <span>GST:</span>
                      <span>₹{Number(invoice.taxAmount).toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between text-lg font-bold border-t pt-2">
                      <span>Total:</span>
                      <span>₹{Number(invoice.totalAmount).toFixed(2)}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Notes */}
            {invoice.notes && (
              <div className="bg-white rounded-lg shadow-sm p-6">
                <h2 className="text-lg font-semibold mb-2">Notes</h2>
                <p className="text-sm text-gray-700">{invoice.notes}</p>
              </div>
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Payment Summary */}
            <div className="bg-white rounded-lg shadow-sm p-6">
              <h2 className="text-lg font-semibold mb-4">Payment Summary</h2>
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Total Amount:</span>
                  <span className="font-semibold">₹{Number(invoice.totalAmount).toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Total Paid:</span>
                  <span className="font-semibold text-green-600">₹{totalPaid.toFixed(2)}</span>
                </div>
                <div className="flex justify-between border-t pt-3">
                  <span className="font-semibold">Balance Due:</span>
                  <span className={`font-bold ${balanceDue > 0 ? 'text-red-600' : 'text-green-600'}`}>
                    ₹{balanceDue.toFixed(2)}
                  </span>
                </div>
              </div>
            </div>

            {/* Payment History */}
            {invoice.payments.length > 0 && (
              <div className="bg-white rounded-lg shadow-sm p-6">
                <h2 className="text-lg font-semibold mb-4">Payment History</h2>
                <div className="space-y-3">
                  {invoice.payments.map((payment) => (
                    <div key={payment.id} className="border-l-4 border-green-500 pl-3 py-2">
                      <div className="flex justify-between items-start">
                        <div>
                          <p className="font-semibold">₹{Number(payment.amount).toFixed(2)}</p>
                          <p className="text-xs text-gray-600">{payment.paymentMethod}</p>
                          {payment.reference && (
                            <p className="text-xs text-gray-500">Ref: {payment.reference}</p>
                          )}
                        </div>
                        <p className="text-xs text-gray-600">
                          {new Date(payment.paymentDate).toLocaleDateString()}
                        </p>
                      </div>
                      {payment.notes && (
                        <p className="text-xs text-gray-600 mt-1">{payment.notes}</p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Payment Modal */}
        {showPaymentModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 w-full max-w-md">
              <h2 className="text-xl font-semibold mb-4">Record Payment</h2>
              <form onSubmit={handleRecordPayment} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Amount *
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    value={paymentData.amount}
                    onChange={(e) => setPaymentData(prev => ({ ...prev, amount: e.target.value }))}
                    placeholder={`Max: ₹${balanceDue.toFixed(2)}`}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Payment Method *
                  </label>
                  <select
                    required
                    className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    value={paymentData.paymentMethod}
                    onChange={(e) => setPaymentData(prev => ({ ...prev, paymentMethod: e.target.value }))}
                  >
                    <option value="CASH">Cash</option>
                    <option value="CARD">Card</option>
                    <option value="UPI">UPI</option>
                    <option value="NET_BANKING">Net Banking</option>
                    <option value="CHEQUE">Cheque</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Reference
                  </label>
                  <input
                    type="text"
                    className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    value={paymentData.reference}
                    onChange={(e) => setPaymentData(prev => ({ ...prev, reference: e.target.value }))}
                    placeholder="Transaction ID, Cheque number, etc."
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Notes
                  </label>
                  <textarea
                    rows={2}
                    className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    value={paymentData.notes}
                    onChange={(e) => setPaymentData(prev => ({ ...prev, notes: e.target.value }))}
                  />
                </div>

                <div className="flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setShowPaymentModal(false)}
                    className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                  >
                    Record Payment
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Invoice Preview Modal */}
        {invoice && (
          <InvoicePreviewModal
            isOpen={showPreview}
            onClose={() => setShowPreview(false)}
            invoiceId={invoice.id}
          />
        )}
      </div>
    </div>
  );
}
