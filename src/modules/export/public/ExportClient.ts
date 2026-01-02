import bookQueryService, {
  type BookRow,
} from "../data-access/BookQueryService";

export type PublicBookView = BookRow;

export const exportClient = {
  async findAllBooks(): Promise<PublicBookView[]> {
    return bookQueryService.findAll();
  },
};
