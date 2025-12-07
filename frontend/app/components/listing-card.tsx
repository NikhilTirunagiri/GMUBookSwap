"use client";

export interface Book {
  id: string;
  title: string;
  author: string;
  isbn: string;
  description: string;
  condition: string;
  price: number;
  available: boolean;
  owner_id: string | null;
  created_at: string;
  updated_at: string;
}

interface ListingCardProps {
  book: Book;
}

export default function ListingCard({ book }: ListingCardProps) {
  return (
    <div className="bg-white dark:bg-zinc-900 rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow">
      <h2 className="text-xl font-semibold text-black dark:text-zinc-50 mb-2">
        {book.title}
      </h2>
      <p className="text-lg text-zinc-600 dark:text-zinc-400 mb-2">
        by {book.author}
      </p>
      {/* <p className="text-sm text-zinc-500 dark:text-zinc-500 mb-4">
        ISBN: {book.isbn}
      </p> */}
      <p className="text-zinc-700 dark:text-zinc-300 mb-4 line-clamp-3">
        {book.description}
      </p>
      <div className="flex justify-between items-center mb-4">
        <span className="inline-block bg-zinc-200 dark:bg-zinc-700 text-zinc-800 dark:text-zinc-200 px-3 py-1 rounded-full text-sm">
          {book.condition}
        </span>
        <span className="text-2xl font-bold text-black dark:text-zinc-50">
          ${book.price.toFixed(2)}
        </span>
      </div>
      <div className="flex items-center justify-between">
        <span
          className={`text-sm ${
            book.available
              ? "text-green-600 dark:text-green-400"
              : "text-red-600 dark:text-red-400"
          }`}
        >
          {book.available ? "Available" : "Unavailable"}
        </span>
      </div>
    </div>
  );
}