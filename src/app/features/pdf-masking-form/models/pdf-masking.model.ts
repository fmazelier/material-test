export type UploadPdfResponse = {
  message: string;
  data: {
    filename: string;
    processed_filename: string;
    uploaded_at: string;
  };
};

export type VariantsPage = {
  items: string[];
  page: number;
  page_size: number;
  total_items: number;
  total_pages: number;
  has_next: boolean;
  has_previous: boolean;
};

export type VariantsQueryParams = {
  page: number;
  page_size: number;
  validated_only: boolean;
};
