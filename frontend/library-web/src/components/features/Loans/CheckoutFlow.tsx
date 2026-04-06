import React, { useState } from 'react';
import { Elements, PaymentElement, useStripe, useElements } from '@stripe/react-stripe-js';
import { loadStripe } from '@stripe/stripe-js';
import { Button } from '@/components/ui/button';

// Mock stripe public test key for development. In production it should be in env.
const stripePromise = loadStripe('pk_test_TYooMQauvdEDq54NiTphI7jx');

const CheckoutForm = ({ onSuccess, onCancel }: { onSuccess: () => void, onCancel: () => void }) => {
  const stripe = useStripe();
  const elements = useElements();
  const [isProcessing, setIsProcessing] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!stripe || !elements) return;

    setIsProcessing(true);
    setErrorMessage('');

    const { error, paymentIntent } = await stripe.confirmPayment({
      elements,
      confirmParams: {
        return_url: window.location.href, // required parameter
      },
      redirect: 'if_required'
    });

    if (error) {
      setErrorMessage(error.message || 'An unexpected error occurred.');
      setIsProcessing(false);
    } else if (paymentIntent && paymentIntent.status === 'succeeded') {
      onSuccess();
    } else {
      setIsProcessing(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <PaymentElement />
      {errorMessage && <div className="text-red-500 text-sm mt-2">{errorMessage}</div>}
      <div className="flex justify-end space-x-2 mt-4">
        <Button variant="outline" type="button" onClick={onCancel} disabled={isProcessing}>Close</Button>
        <Button type="submit" disabled={isProcessing || !stripe || !elements}>
          {isProcessing ? 'Processing...' : 'Pay'}
        </Button>
      </div>
    </form>
  );
};

interface CheckoutFlowProps {
  clientSecret: string;
  onSuccess: () => void;
  onCancel: () => void;
}

export const CheckoutFlow: React.FC<CheckoutFlowProps> = ({ clientSecret, onSuccess, onCancel }) => {
  if (!clientSecret) return null;

  return (
    <div className="mt-4 p-4 border rounded shadow-sm bg-white">
      <div className="mb-4">
        <h3 className="text-lg font-medium text-gray-900">Secure Payment</h3>
        <p className="text-sm text-gray-500">Please provide your payment details to complete the transaction.</p>
      </div>
      <Elements stripe={stripePromise} options={{ clientSecret }}>
        <CheckoutForm onSuccess={onSuccess} onCancel={onCancel} />
      </Elements>
    </div>
  );
};
