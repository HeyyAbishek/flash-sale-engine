const API_BASE_URL = '/api';

export interface StockResponse {
  success: boolean;
  remainingStock: number;
  message?: string;
}

export const getStock = async (productId: string = 'sneaker-001'): Promise<StockResponse> => {
  const response = await fetch(`${API_BASE_URL}/stock?productId=${productId}`);
  if (!response.ok) {
    throw new Error('Failed to fetch stock');
  }
  return response.json();
};

export const buyProduct = async (productId: string = 'sneaker-001', userId?: string, idempotencyKey?: string): Promise<StockResponse> => {
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
  };

  if (idempotencyKey) {
    headers['Idempotency-Key'] = idempotencyKey;
  }

  const response = await fetch(`${API_BASE_URL}/buy`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ productId, userId }),
  });
  
  // Return the response, handling the 409 case in the component or here?
  // The current implementation expects a JSON response always.
  // Our backend returns JSON even for 409.
  return response.json();
};
