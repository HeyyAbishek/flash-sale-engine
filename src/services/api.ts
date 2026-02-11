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

export const buyProduct = async (productId: string = 'sneaker-001', userId?: string): Promise<StockResponse> => {
  const response = await fetch(`${API_BASE_URL}/buy`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ productId, userId }),
  });
  
  return response.json();
};
