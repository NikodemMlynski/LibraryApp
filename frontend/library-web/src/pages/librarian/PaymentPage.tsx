import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useInitLoanPayment, useConfirmLoanPayment } from '@/hooks/useLoans';
import { Elements, PaymentElement, useStripe, useElements } from '@stripe/react-stripe-js';
import { loadStripe } from '@stripe/stripe-js';
import { Button } from '@/components/ui/button';

// Obiekt Stripe
const stripePromise = loadStripe('pk_test_51T9OUGBJ8jG7AYBeTPataHjPA9cBh250Bx2G3FLB7QFe2kxxWlf5GlPPKc8A0Orn4Ivl3g0vXb3i9FwCVuohonEY00TN9r7eJF');

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
      setErrorMessage(error.message || 'Wystąpił nieznany błąd.');
      setIsProcessing(false);
    } else if (paymentIntent && paymentIntent.status === 'succeeded') {
      confirmPayment.mutate(loanId, {
        onSuccess: () => {
          navigate('/app/librarian/loans');
        },
        onError: () => {
          setErrorMessage('Płatność się powiodła, ale wystąpił błąd z potwierdzeniem jej w systemie biblioteki.');
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
        {isProcessing ? 'Przetwarzanie...' : `Zapłać ${amount.toFixed(2)} PLN`}
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
        alert('Nie udało się wygenerować sesji płatności: ' + (error?.data?.error || error.message));
        navigate('/app/librarian/loans');
      }
    });
  }, [loanId]);

  if (!clientSecret) {
    return (
      <div className="flex justify-center items-center h-full min-h-[50vh]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        <span className="ml-3 text-gray-600">Przygotowywanie sesji płatności...</span>
      </div>
    );
  }

  return (
    <div className="max-w-xl mx-auto mt-10 p-6 bg-white rounded-lg shadow-md border border-gray-100">
      <h1 className="text-2xl font-bold mb-6 text-gray-800">Finalizacja wypożyczenia #{loanId}</h1>
      <p className="text-gray-600 mb-6">
        {paymentDetails?.type === 'PENALTY' 
          ? `Wprowadź dane karty, aby opłacić karę za opóźniony zwrot (${paymentDetails?.amount.toFixed(2)} PLN).` 
          : `Wprowadź dane karty, aby opłacić startowy koszt wypożyczenia książki (${paymentDetails?.amount?.toFixed(2) || '2.00'} PLN).`}
      </p>
      
      <Elements stripe={stripePromise} options={{ clientSecret }}>
        <CheckoutForm loanId={loanId} amount={paymentDetails?.amount || 2.00} />
      </Elements>
      
      <Button variant="ghost" className="w-full mt-4" onClick={() => navigate('/app/librarian/loans')}>
        Anuluj i wróć do listy
      </Button>
    </div>
  );
}
