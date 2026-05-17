export type Product = {
  id: number;
  title: string;
  brand: string;
  price: number;
  rating: number;
  category: string;
  thumbnail: string;
};

export type ProductFilters = {
  search: string;
  category: string;
};

export type ProductSortField = 'title' | 'price' | 'rating';

export type DummyJsonProductsResponse = {
  products: Product[];
  total: number;
  skip: number;
  limit: number;
};

export type DummyJsonCategory = {
  slug: string;
  name: string;
  url: string;
};
