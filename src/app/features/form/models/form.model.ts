export type UploadPdfResponse = {
  message: string;
  data: {
    filename: string;
    processed_filename: string;
    uploaded_at: string;
  };
};
