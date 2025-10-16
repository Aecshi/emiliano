import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { query, queryOne, execute } from '../lib/mysqlDb';

interface Product {
  product_id: number;
  product_code: string;
  product_name: string;
  description: string | null;
  category_id: number;
  unit_id: number;
  cost_price: number;
  selling_price: number;
}

export const useProducts = () => {
  return useQuery({
    queryKey: ['products'],
    queryFn: async () => {
      const products = await query<Product>('SELECT * FROM products');
      return products;
    },
  });
};

export const useProduct = (productId: number) => {
  return useQuery({
    queryKey: ['product', productId],
    queryFn: async () => {
      const product = await queryOne<Product>('SELECT * FROM products WHERE product_id = ?', [productId]);
      return product;
    },
    enabled: !!productId,
  });
};

export const useAddProduct = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (newProduct: Omit<Product, 'product_id'>) => {
      const result = await execute(
        `INSERT INTO products 
         (product_code, product_name, description, category_id, unit_id, cost_price, selling_price)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [
          newProduct.product_code,
          newProduct.product_name,
          newProduct.description,
          newProduct.category_id,
          newProduct.unit_id,
          newProduct.cost_price,
          newProduct.selling_price
        ]
      );
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] });
    },
  });
};

export const useUpdateProduct = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (product: Product) => {
      const result = await execute(
        `UPDATE products 
         SET product_code = ?, product_name = ?, description = ?, 
             category_id = ?, unit_id = ?, cost_price = ?, selling_price = ?
         WHERE product_id = ?`,
        [
          product.product_code,
          product.product_name,
          product.description,
          product.category_id,
          product.unit_id,
          product.cost_price,
          product.selling_price,
          product.product_id
        ]
      );
      return result;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['products'] });
      queryClient.invalidateQueries({ queryKey: ['product', variables.product_id] });
    },
  });
};

export const useDeleteProduct = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (productId: number) => {
      const result = await execute('DELETE FROM products WHERE product_id = ?', [productId]);
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] });
    },
  });
}; 