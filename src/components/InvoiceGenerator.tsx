import React from 'react';
import { FileTextIcon, DownloadIcon, MailIcon } from 'lucide-react';
interface InvoiceProps {
  invoiceId: string;
  date: string;
  customerName: string;
  customerEmail: string;
  planName: string;
  planPeriod: string;
  amount: string;
  onClose: () => void;
}
const InvoiceGenerator: React.FC<InvoiceProps> = ({
  invoiceId,
  date,
  customerName,
  customerEmail,
  planName,
  planPeriod,
  amount,
  onClose
}) => {
  const handleDownload = () => {
    // In a real application, this would generate and download a PDF
    alert('Invoice PDF download started');
  };
  const handleEmail = () => {
    // In a real application, this would email the invoice
    alert(`Invoice sent to ${customerEmail}`);
  };
  return <div className="bg-white dark:bg-gray-900 rounded-lg shadow-lg p-8">
      <div className="flex justify-between items-center border-b border-gray-200 dark:border-gray-700 pb-4 mb-6">
        <div className="flex items-center">
          <FileTextIcon className="h-8 w-8 text-amber-600 mr-3" />
          <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
            Invoice #{invoiceId}
          </h2>
        </div>
        <div className="flex space-x-2">
          <button onClick={handleDownload} className="bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 px-3 py-1 rounded-md text-sm font-medium hover:bg-amber-200 dark:hover:bg-amber-900/50 transition-colors flex items-center">
            <DownloadIcon className="h-4 w-4 mr-1" />
            Download
          </button>
          <button onClick={handleEmail} className="bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 px-3 py-1 rounded-md text-sm font-medium hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors flex items-center">
            <MailIcon className="h-4 w-4 mr-1" />
            Email
          </button>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-8 mb-8">
        <div>
          <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">Billed To</h3>
          <p className="font-medium text-gray-900 dark:text-gray-100">{customerName}</p>
          <p className="text-gray-700 dark:text-gray-300">{customerEmail}</p>
        </div>
        <div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">
                Invoice Number
              </h3>
              <p className="font-medium text-gray-900 dark:text-gray-100">{invoiceId}</p>
            </div>
            <div>
              <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">Date</h3>
              <p className="font-medium text-gray-900 dark:text-gray-100">{date}</p>
            </div>
          </div>
        </div>
      </div>
      <div className="mb-8">
        <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-4">
          Invoice Details
        </h3>
        <div className="bg-gray-50 dark:bg-gray-800 rounded-lg overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
            <thead className="bg-gray-100 dark:bg-gray-700">
              <tr>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Description
                </th>
                <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Amount
                </th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-gray-900 divide-y divide-gray-200 dark:divide-gray-700">
              <tr>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">
                  CleanInbox {planName} Plan ({planPeriod})
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100 text-right">
                  {amount}
                </td>
              </tr>
              <tr>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">
                  Tax
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100 text-right">
                  $0.00
                </td>
              </tr>
            </tbody>
            <tfoot className="bg-gray-50 dark:bg-gray-800">
              <tr>
                <th scope="row" className="px-6 py-3 text-left text-sm font-bold text-gray-900 dark:text-gray-100">
                  Total
                </th>
                <td className="px-6 py-3 text-right text-sm font-bold text-gray-900 dark:text-gray-100">
                  {amount}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>
      <div className="border-t border-gray-200 dark:border-gray-700 pt-4">
        <div className="flex justify-between items-center">
          <div>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Payment processed via Stripe
            </p>
            <p className="text-sm text-gray-700 dark:text-gray-300 mt-1">
              Thank you for your business!
            </p>
          </div>
          <div className="text-right">
            <p className="text-sm font-medium text-gray-900 dark:text-gray-100">CleanInbox</p>
            <p className="text-sm text-gray-500 dark:text-gray-400">support@cleaninbox.com</p>
          </div>
        </div>
      </div>
    </div>;
};
export default InvoiceGenerator;