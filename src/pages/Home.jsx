import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ShoppingCart } from "lucide-react";
import useCartStore from "../store/cartStore";
import ProductBottomSheet from "../components/products/ProductBottomSheet";
import { useTranslation } from "react-i18next";
import LanguageSwitcher from "../components/common/LanguageSwitcher";
import { getFeedApi, getProductsApi } from "../services/catalogApi";
import Skeleton from "../components/common/Skeleton";

function Home() {
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [storyItems, setStoryItems] = useState([]);
  const [products, setProducts] = useState([]);
  const [storiesLoading, setStoriesLoading] = useState(true);
  const [productsLoading, setProductsLoading] = useState(true);

  const navigate = useNavigate();
  const addToCart = useCartStore((state) => state.addToCart);
  const cartItems = useCartStore((state) => state.cartItems);
  const { t } = useTranslation();

  useEffect(() => {
    const loadStories = async () => {
      try {
        const response = await getFeedApi();
        setStoryItems(response.items.filter((item) => item.type === "story"));
      } catch (error) {
        console.error("Unable to load stories:", error);
      } finally {
        setStoriesLoading(false);
      }
    };

    const loadProducts = async () => {
      try {
        const response = await getProductsApi();
        setProducts(response.items);
      } catch (error) {
        console.error("Unable to load products:", error);
      } finally {
        setProductsLoading(false);
      }
    };

    loadStories();
    loadProducts();
  }, []);

  const cartCount = cartItems.reduce((total, item) => total + item.quantity, 0);

  return (
    <div className="min-h-screen w-full bg-gray-100 p-4 sm:p-6">
      <div className="mx-auto max-w-6xl">
        <header className="mb-10 grid grid-cols-[1fr_auto] items-center gap-x-3 gap-y-3 sm:mb-8 sm:flex sm:items-center sm:justify-between">
          <h1 className="text-2xl font-bold sm:text-3xl">Aumbram</h1>

          <Link
            to="/cart"
            className="flex items-center justify-self-end gap-2 sm:order-3"
          >
            <ShoppingCart size={20} />
            Cart ({cartCount})
          </Link>

          <div className="col-span-2 flex justify-end sm:col-span-1 sm:order-2">
            <LanguageSwitcher />
          </div>
        </header>

        <h2>{t("stories")}</h2>

        <div className="mb-8 flex gap-5 overflow-x-auto pb-3">
          {storiesLoading ? (
            <div className="flex gap-4">
              {Array.from({ length: 6 }).map((_, index) => (
                <div key={index} className="flex flex-col items-center gap-2">
                  <Skeleton className="h-[70px] w-[70px] rounded-full" />
                  <Skeleton className="h-3 w-16" />
                </div>
              ))}
            </div>
          ) : storyItems.length === 0 ? (
            <p>No stories available.</p>
          ) : (
            storyItems.map((item) => {
              const story = item.story;
              const creator = item.creator;
              const firstSegment = story.segments?.[0];

              const coverImage =
                firstSegment?.type === "video"
                  ? firstSegment.posterUrl
                  : firstSegment?.url;

              return (
                <button
                  key={item.id}
                  onClick={() => navigate(`/story/${story.id}`)}
                  className="flex shrink-0 flex-col items-center gap-2"
                >
                  <div className="rounded-full bg-gradient-to-tr from-orange-500 via-pink-500 to-purple-600 p-[3px]">
                    <img
                      src={creator?.avatarUrl || coverImage}
                      alt={creator?.displayName || "Creator"}
                      className="h-16 w-16 rounded-full border-2 border-white object-cover"
                    />
                  </div>

                  <span className="text-sm">
                    {creator?.displayName || "Creator"}
                  </span>
                </button>
              );
            })
          )}
        </div>

        <h2>{t("discoverProducts")}</h2>

        {productsLoading ? (
          <div className="mt-4 grid grid-cols-1 gap-6 sm:grid-cols-2 md:grid-cols-3">
            {Array.from({ length: 6 }).map((_, index) => (
              <div
                key={index}
                className="overflow-hidden rounded-xl bg-white shadow"
              >
                <Skeleton className="h-56 w-full rounded-none" />
                <div className="space-y-3 p-4">
                  <Skeleton className="h-4 w-3/4" />
                  <Skeleton className="h-3 w-1/2" />
                  <Skeleton className="h-5 w-1/3" />
                  <Skeleton className="h-9 w-full" />
                </div>
              </div>
            ))}
          </div>
        ) : products.length === 0 ? (
          <p className="mt-4">No products available.</p>
        ) : (
          <div className="mt-4 grid grid-cols-1 gap-6 sm:grid-cols-2 md:grid-cols-3">
            {products.map((product) => {
              const image = product.images?.[0]?.url || "";
              const lowestPrice = product.variants?.length
                ? Math.min(
                    ...product.variants.map((variant) => variant.price.amount),
                  ) / 100
                : 0;

              return (
                <div
                  key={product.id}
                  className="overflow-hidden rounded-xl bg-white shadow"
                >
                  <button
                    onClick={() => setSelectedProduct(product)}
                    className="w-full text-left"
                  >
                    <img
                      src={image}
                      alt={product.title}
                      className="h-56 w-full object-cover"
                    />

                    <div className="p-4">
                      <h3 className="font-semibold">{product.title}</h3>

                      <p className="mt-2 text-gray-500">
                        {product.vendor?.name}
                      </p>

                      <p className="mt-2 text-lg font-bold">₹{lowestPrice}</p>
                    </div>
                  </button>

                  <div className="px-4 pb-4">
                    <button
                      onClick={() => setSelectedProduct(product)}
                      className="w-full rounded-lg bg-black py-2 text-white"
                    >
                      {t("viewProduct")}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {selectedProduct && (
        <ProductBottomSheet
          product={selectedProduct}
          onClose={() => setSelectedProduct(null)}
          onAddToCart={addToCart}
        />
      )}
    </div>
  );
}

export default Home;
