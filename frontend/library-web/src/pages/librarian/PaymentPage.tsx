import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useInitLoanPayment, useConfirmLoanPayment } from '@/hooks/useLoans';
import { Elements, PaymentElement, useStripe, useElements } from '@stripe/react-stripe-js';
import { loadStripe } from '@stripe/stripe-js';
import { Button } from '@/components/ui/button';
import { STRIPE_PUBLIC_KEY } from '@/config/constants';

const stripePromise = loadStripe(STRIPE_PUBLIC_KEY);

const CheckoutForm = ({ loanId, amount }: { loanId: number, amount: number }) => {
  const stripe = useStripe();
  const elements = useElements();
  const navigate = useNavigate();
  const [isProcessing, setIsProcessing] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const confirmPayment = useConfirmLoanPayment();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!stripe || !elements) return;

    setIsProcessing(true);

    const { error, paymentIntent } = await stripe.confirmPayment({
      elements,
      confirmParams: {
        return_url: window.location.origin + `/app/librarian/loans`,
      },
      redirect: 'if_required',
    });

    if (error) {
      setErrorMessage(error.message || 'An unknown error occurred.');
      setIsProcessing(false);
    } else if (paymentIntent && paymentIntent.status === 'succeeded') {
      confirmPayment.mutate(loanId, {
        onSuccess: () => {
          navigate('/app/librarian/loans');
        },
        onError: () => {
          setErrorMessage('Payment successful, but an error occurred confirming it with the library.');
          setIsProcessing(false);
        }
      });
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <PaymentElement />
      {errorMessage && <div className="text-sm text-red-500">{errorMessage}</div>}
      <Button type="submit" disabled={!stripe || isProcessing} className="w-full">
        {isProcessing ? 'Processing...' : `Pay ${amount.toFixed(2)} PLN`}
      </Button>
    </form>
  );
};


export default function PaymentPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const loanId = parseInt(id || '0', 10);
  
  const initPayment = useInitLoanPayment();
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [paymentDetails, setPaymentDetails] = useState<{ amount: number, type: string } | null>(null);

  useEffect(() => {
    if (!loanId) {
      navigate('/app/librarian/loans');
      return;
    }
    // Wywołanie endpointu pobierającego klucz do płatności dla już istniejącego wypożyczenia
    initPayment.mutate(loanId, {
      onSuccess: (data: any) => {
        setClientSecret(data.clientSecret);
        setPaymentDetails({ amount: data.amount || 2.00, type: data.type || 'INITIAL' });
      },
      onError: (error: any) => {
        alert('Failed to generate payment session: ' + (error?.data?.error || error.message));
        navigate('/app/librarian/loans');
      }
    });
  }, [loanId]);

  if (!clientSecret) {
    return (
      <div className="flex justify-center items-center h-full min-h-[50vh]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        <span className="ml-3 text-gray-600">Preparing payment session...</span>
      </div>
    );
  }

  return (
    <div className="max-w-xl mx-auto mt-10 p-6 bg-white rounded-lg shadow-md border border-gray-100">
      <h1 className="text-2xl font-bold mb-6 text-gray-800">Finalizing loan #{loanId}</h1>
      <p className="text-gray-600 mb-6">
        {paymentDetails?.type === 'PENALTY' 
          ? `Enter card details to pay the late return penalty (${paymentDetails?.amount.toFixed(2)} PLN).` 
          : `Enter card details to pay the initial base loan cost (${paymentDetails?.amount?.toFixed(2) || '2.00'} PLN).`}
      </p>
      
      <Elements stripe={stripePromise} options={{ clientSecret }}>
        <CheckoutForm loanId={loanId} amount={paymentDetails?.amount || 2.00} />
      </Elements>
      
      <Button variant="ghost" className="w-full mt-4" onClick={() => navigate('/app/librarian/loans')}>
        Cancel and return to list
      </Button>
    </div>
  );
}
