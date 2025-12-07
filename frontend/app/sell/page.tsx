"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import TopNavbar from "../components/top-navbar";
import { apiPost, handleApiError, getCurrentUser } from "@/lib/api";

type MaterialType = "book" | "journal" | "article";
type TradeType = "buy" | "trade" | "borrow";

export default function SellPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [userEmail, setUserEmail] = useState<string>("");

  const [formData, setFormData] = useState({
    title: "",
    author: "",
    isbn: "",
    genre: "",
    material_type: "book" as MaterialType,
    trade_type: "buy" as TradeType,
    price: "",
    condition: "",
    description: "",
    image_url: "",
    seller_name: "",
  });

  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);

  // Get authenticated user's email on mount
  useEffect(() => {
    async function getUserEmail() {
      try {
        const user = await getCurrentUser();
        if (user?.email) {
          setUserEmail(user.email);
        } else {
          // If no user is logged in, redirect to login
          router.push("/");
        }
      } catch (error) {
        console.error("Failed to get current user:", error);
        router.push("/");
      }
    }
    getUserEmail();
  }, [router]);

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Check file size (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        setError("Image must be less than 5MB");
        return;
      }

      // Check file type
      if (!file.type.startsWith('image/')) {
        setError("Please upload an image file");
        return;
      }

      setImageFile(file);
      // Only create preview, don't store base64 in formData (server will reject it)
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(false);

    try {
      // Validate required fields
      if (!formData.title.trim() || !formData.price || !formData.seller_name.trim()) {
        throw new Error("Title, price, and full name are required");
      }

      if (!userEmail) {
        throw new Error("You must be logged in to create a listing");
      }

      const price = parseFloat(formData.price);
      if (isNaN(price) || price < 0) {
        throw new Error("Price must be a valid positive number");
      }

      // TODO: Upload image file to Supabase Storage instead of base64
      // For now, only allow image URL (not base64)
      const payload = {
        ...formData,
        price: price,
        author: formData.author || null,
        isbn: formData.isbn || null,
        genre: formData.genre || null,
        condition: formData.condition || null,
        description: formData.description || null,
        image_url: formData.image_url && !formData.image_url.startsWith('data:') ? formData.image_url : null,
        seller_email: userEmail,
      };

      // Show warning if user uploaded a file (not yet supported)
      if (imageFile) {
        setError("Image file upload coming soon! Please use an image URL for now, or leave blank to auto-fetch from ISBN.");
        setLoading(false);
        return;
      }

      // Use authenticated API call
      const response = await apiPost("/books/", payload);

      if (!response.ok) {
        await handleApiError(response);
      }

      setSuccess(true);
      // Reset form
      setFormData({
        title: "",
        author: "",
        isbn: "",
        genre: "",
        material_type: "book",
        trade_type: "buy",
        price: "",
        condition: "",
        description: "",
        image_url: "",
        seller_name: "",
      });
      setImageFile(null);
      setImagePreview(null);

      // Redirect after 2 seconds
      setTimeout(() => {
        router.push("/my-listings");
      }, 2000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full bg-gradient-to-br from-emerald-950 via-green-900 to-black text-white">
      <TopNavbar />

      <main className="mx-auto max-w-4xl p-6">
        <h1 className="text-4xl font-bold text-yellow-400 mb-6">Sell Your Book</h1>

        {success && (
          <div className="mb-6 rounded-xl border border-green-400/50 bg-green-900/40 backdrop-blur-lg p-4 text-green-200">
            Listing created successfully! Redirecting to your listings...
          </div>
        )}

        {error && (
          <div className="mb-6 rounded-xl border border-red-400/50 bg-red-900/40 backdrop-blur-lg p-4 text-red-200">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="rounded-2xl border border-yellow-400/40 bg-white/5 backdrop-blur-lg p-6 space-y-6">
            {/* Basic Information */}
            <div>
              <h2 className="text-2xl font-semibold text-yellow-300 mb-4">Basic Information</h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-yellow-200 mb-2">
                    Title <span className="text-red-400">*</span>
                  </label>
                  <input
                    type="text"
                    name="title"
                    value={formData.title}
                    onChange={handleInputChange}
                    required
                    className="w-full rounded-xl border border-yellow-400/50 bg-white/10 text-yellow-50 placeholder-yellow-200/70 px-4 py-3 focus:outline-none focus:ring-2 focus:ring-yellow-400/60"
                    placeholder="Enter book title"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-yellow-200 mb-2">
                    Your Full Name <span className="text-red-400">*</span>
                  </label>
                  <input
                    type="text"
                    name="seller_name"
                    value={formData.seller_name}
                    onChange={handleInputChange}
                    required
                    className="w-full rounded-xl border border-yellow-400/50 bg-white/10 text-yellow-50 placeholder-yellow-200/70 px-4 py-3 focus:outline-none focus:ring-2 focus:ring-yellow-400/60"
                    placeholder="Enter your full name"
                  />
                  <p className="text-xs text-yellow-200/60 mt-1">Email: {userEmail || "Loading..."}</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-yellow-200 mb-2">Author</label>
                    <input
                      type="text"
                      name="author"
                      value={formData.author}
                      onChange={handleInputChange}
                      className="w-full rounded-xl border border-yellow-400/50 bg-white/10 text-yellow-50 placeholder-yellow-200/70 px-4 py-3 focus:outline-none focus:ring-2 focus:ring-yellow-400/60"
                      placeholder="Author name"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-yellow-200 mb-2">ISBN</label>
                    <input
                      type="text"
                      name="isbn"
                      value={formData.isbn}
                      onChange={handleInputChange}
                      className="w-full rounded-xl border border-yellow-400/50 bg-white/10 text-yellow-50 placeholder-yellow-200/70 px-4 py-3 focus:outline-none focus:ring-2 focus:ring-yellow-400/60"
                      placeholder="ISBN-13"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-yellow-200 mb-2">Genre</label>
                    <input
                      type="text"
                      name="genre"
                      value={formData.genre}
                      onChange={handleInputChange}
                      className="w-full rounded-xl border border-yellow-400/50 bg-white/10 text-yellow-50 placeholder-yellow-200/70 px-4 py-3 focus:outline-none focus:ring-2 focus:ring-yellow-400/60"
                      placeholder="Genre"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-yellow-200 mb-2">Condition</label>
                    <input
                      type="text"
                      name="condition"
                      value={formData.condition}
                      onChange={handleInputChange}
                      className="w-full rounded-xl border border-yellow-400/50 bg-white/10 text-yellow-50 placeholder-yellow-200/70 px-4 py-3 focus:outline-none focus:ring-2 focus:ring-yellow-400/60"
                      placeholder="e.g., New, Like New, Good"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Listing Details */}
            <div>
              <h2 className="text-2xl font-semibold text-yellow-300 mb-4">Listing Details</h2>
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-yellow-200 mb-2">
                      Material Type
                    </label>
                    <select
                      name="material_type"
                      value={formData.material_type}
                      onChange={handleInputChange}
                      className="w-full rounded-xl border border-yellow-400/50 bg-white/10 text-yellow-200 px-4 py-3 focus:outline-none focus:ring-2 focus:ring-yellow-400/60"
                    >
                      <option value="book" style={{ color: "#071121" }} >Book</option>
                      <option value="journal" style={{ color: "#071121" }} >Journal</option>
                      <option value="article" style={{ color: "#071121" }} >Article</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-yellow-200 mb-2">Trade Type</label>
                    <select
                      name="trade_type"
                      value={formData.trade_type}
                      onChange={handleInputChange}
                      className="w-full rounded-xl border border-yellow-400/50 bg-white/10 text-yellow-200 px-4 py-3 focus:outline-none focus:ring-2 focus:ring-yellow-400/60"
                    >
                      <option value="buy">Buy</option>
                      <option value="trade">Trade</option>
                      <option value="borrow">Borrow</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-yellow-200 mb-2">
                    Price ($) <span className="text-red-400">*</span>
                  </label>
                  <input
                    type="number"
                    name="price"
                    value={formData.price}
                    onChange={handleInputChange}
                    required
                    min="0"
                    step="0.01"
                    className="w-full rounded-xl border border-yellow-400/50 bg-white/10 text-yellow-50 placeholder-yellow-200/70 px-4 py-3 focus:outline-none focus:ring-2 focus:ring-yellow-400/60"
                    placeholder="0.00"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-yellow-200 mb-2">Description</label>
                  <textarea
                    name="description"
                    value={formData.description}
                    onChange={handleInputChange}
                    rows={4}
                    className="w-full rounded-xl border border-yellow-400/50 bg-white/10 text-yellow-50 placeholder-yellow-200/70 px-4 py-3 focus:outline-none focus:ring-2 focus:ring-yellow-400/60 resize-none"
                    placeholder="Describe the condition, any notes, etc."
                  />
                </div>
              </div>
            </div>

            {/* Image Upload */}
            <div>
              <h2 className="text-2xl font-semibold text-yellow-300 mb-4">Book Cover</h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-yellow-200 mb-2">
                    Upload Image
                  </label>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleImageChange}
                    className="w-full rounded-xl border border-yellow-400/50 bg-white/10 text-yellow-50 px-4 py-3 focus:outline-none focus:ring-2 focus:ring-yellow-400/60 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-yellow-500/20 file:text-yellow-300 hover:file:bg-yellow-400/30"
                  />
                </div>

                {imagePreview && (
                  <div className="mt-4">
                    <p className="text-sm text-yellow-200 mb-2">Preview:</p>
                    <img
                      src={imagePreview}
                      alt="Preview"
                      className="w-48 h-64 object-cover rounded-xl border border-yellow-500/30"
                    />
                  </div>
                )}

                <div className="mt-4">
                  <label className="block text-sm font-medium text-yellow-200 mb-2">
                    Or enter image URL
                  </label>
                  <input
                    type="url"
                    name="image_url"
                    value={formData.image_url}
                    onChange={handleInputChange}
                    className="w-full rounded-xl border border-yellow-400/50 bg-white/10 text-yellow-50 placeholder-yellow-200/70 px-4 py-3 focus:outline-none focus:ring-2 focus:ring-yellow-400/60"
                    placeholder="https://example.com/image.jpg"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Submit Button */}
          <div className="flex gap-4">
            <button
              type="button"
              onClick={() => router.push("/listing")}
              className="flex-1 rounded-xl border border-yellow-400/50 bg-white/10 text-yellow-50 px-6 py-3 hover:bg-yellow-400/20 hover:border-yellow-400/70 transition-all font-medium"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 rounded-xl bg-gradient-to-r from-yellow-500 via-amber-400 to-yellow-300 text-black font-semibold px-6 py-3 shadow-[0_0_15px_rgba(255,215,0,0.4)] hover:shadow-[0_0_25px_rgba(255,215,0,0.8)] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? "Creating Listing..." : "Create Listing"}
            </button>
          </div>
        </form>
      </main>
    </div>
  );
}

