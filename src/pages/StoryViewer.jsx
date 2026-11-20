import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { getStoryApi, getCreatorStoriesApi } from "../services/catalogApi";
import useCartStore from "../store/cartStore";
import ProductBottomSheet from "../components/products/ProductBottomSheet";
import Skeleton from "../components/common/Skeleton";

function StoryViewer() {
  const { storyId } = useParams();
  const navigate = useNavigate();

  const addToCart = useCartStore((state) => state.addToCart);

  const [storyData, setStoryData] = useState(null);
  const [creatorStories, setCreatorStories] = useState([]);
  const [segmentIndex, setSegmentIndex] = useState(0);
  const [progress, setProgress] = useState(0);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [isHolding, setIsHolding] = useState(false);

  const elapsedRef = useRef(0);
  const startedAtRef = useRef(null);
  const touchStartRef = useRef(null);

  // Fetch actual story and creator stories
  useEffect(() => {
    let active = true;

    const loadStory = async () => {
      try {
        setLoading(true);
        setError("");
        setStoryData(null);
        setSelectedProduct(null);
        setSegmentIndex(0);
        setProgress(0);
        elapsedRef.current = 0;
        startedAtRef.current = null;

        const data = await getStoryApi(storyId);

        const creatorData = await getCreatorStoriesApi(data.story.creatorId);

        if (!active) return;

        setStoryData(data);
        setCreatorStories(creatorData.items || []);
      } catch (err) {
        console.error("Story loading error:", err);

        if (active) {
          setError("Unable to load this story. Please try again.");
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    };

    loadStory();

    return () => {
      active = false;
    };
  }, [storyId]);

  const story = storyData?.story;
  const creator = storyData?.creator;
  const segments = story?.segments || [];
  const currentSegment = segments[segmentIndex];

  const goNextStory = useCallback(() => {
    const currentStoryIndex = creatorStories.findIndex(
      (item) => item.id === storyId,
    );

    if (
      currentStoryIndex >= 0 &&
      currentStoryIndex < creatorStories.length - 1
    ) {
      navigate(`/story/${creatorStories[currentStoryIndex + 1].id}`);
    } else {
      navigate("/");
    }
  }, [creatorStories, storyId, navigate]);

  const goPreviousStory = useCallback(() => {
    const currentStoryIndex = creatorStories.findIndex(
      (item) => item.id === storyId,
    );

    if (currentStoryIndex > 0) {
      navigate(`/story/${creatorStories[currentStoryIndex - 1].id}`);
    }
  }, [creatorStories, storyId, navigate]);

  const goNext = useCallback(() => {
    elapsedRef.current = 0;
    startedAtRef.current = null;
    setProgress(0);

    if (segmentIndex < segments.length - 1) {
      setSegmentIndex((previous) => previous + 1);
    } else {
      goNextStory();
    }
  }, [segmentIndex, segments.length, goNextStory]);

  const goPrevious = useCallback(() => {
    elapsedRef.current = 0;
    startedAtRef.current = null;
    setProgress(0);

    if (segmentIndex > 0) {
      setSegmentIndex((previous) => previous - 1);
    } else {
      goPreviousStory();
    }
  }, [segmentIndex, goPreviousStory]);

  // Story timer uses durationMs from the assignment data.
  // Pauses while product sheet is open or the user holds the screen.
  useEffect(() => {
    if (!currentSegment || selectedProduct || isHolding || loading) {
      return;
    }

    const duration = currentSegment.durationMs || 5000;

    startedAtRef.current = Date.now();

    const interval = setInterval(() => {
      const elapsed = elapsedRef.current + (Date.now() - startedAtRef.current);

      const percentage = Math.min((elapsed / duration) * 100, 100);

      setProgress(percentage);

      if (elapsed >= duration) {
        clearInterval(interval);

        elapsedRef.current = 0;
        startedAtRef.current = null;

        goNext();
      }
    }, 50);

    return () => {
      clearInterval(interval);

      if (startedAtRef.current !== null) {
        elapsedRef.current += Date.now() - startedAtRef.current;

        startedAtRef.current = null;
      }
    };
  }, [
    currentSegment,
    segmentIndex,
    selectedProduct,
    isHolding,
    loading,
    goNext,
  ]);

  const handleCloseProduct = useCallback(() => {
    setSelectedProduct(null);
  }, []);

  const handleTouchStart = (event) => {
    touchStartRef.current = {
      x: event.touches[0].clientX,
      y: event.touches[0].clientY,
    };
  };

  const handleTouchEnd = (event) => {
    if (!touchStartRef.current) return;

    const difference =
      event.changedTouches[0].clientX - touchStartRef.current.x;

    if (Math.abs(difference) > 70) {
      if (difference < 0) {
        goNextStory();
      } else {
        goPreviousStory();
      }
    }

    touchStartRef.current = null;
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-black">
        <div className="relative aspect-[9/16] h-[min(100dvh,calc(100vw*16/9))] w-[min(100vw,calc(100dvh*9/16))] overflow-hidden">
          <Skeleton className="h-full w-full rounded-none bg-gray-800" />

          <div className="absolute left-3 right-3 top-4 flex gap-1">
            <Skeleton className="h-1 flex-1 bg-gray-600" />
            <Skeleton className="h-1 flex-1 bg-gray-600" />
            <Skeleton className="h-1 flex-1 bg-gray-600" />
          </div>

          <div className="absolute left-4 top-8 space-y-2">
            <Skeleton className="h-4 w-28 bg-gray-600" />
            <Skeleton className="h-3 w-20 bg-gray-600" />
          </div>

          <div className="absolute bottom-8 left-4 right-4 space-y-2">
            <Skeleton className="h-4 w-3/4 bg-gray-600" />
            <Skeleton className="h-3 w-1/2 bg-gray-600" />
          </div>
        </div>
      </div>
    );
  }

  if (error || !story || !currentSegment) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-black px-6 text-white">
        <p>{error || "Story not found."}</p>

        <button
          onClick={() => navigate("/")}
          className="rounded-lg bg-white px-5 py-3 text-black"
        >
          Back to Home
        </button>
      </div>
    );
  }

  // Poster fallback is used for video segments.
  // The provided video URLs are fake.
  const mediaUrl =
    currentSegment.type === "video"
      ? currentSegment.posterUrl || currentSegment.url
      : currentSegment.url;

  // Match tagged products with their API product details.
  const currentHotspots = story.taggedProducts
    .filter((tag) => tag.segmentIndex === segmentIndex)
    .map((tag) => ({
      ...tag,
      product: storyData.products.find(
        (product) => product.id === tag.productId,
      ),
    }))
    .filter((tag) => tag.product);

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-black">
      <div
        className="relative h-[min(100dvh,calc(100vw*16/9))] w-[min(100vw,calc(100dvh*9/16))] aspect-[9/16] overflow-hidden bg-black"
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
        onPointerDown={() => setIsHolding(true)}
        onPointerUp={() => setIsHolding(false)}
        onPointerCancel={() => setIsHolding(false)}
      >
        {/* Story image or video poster */}
        <img
          src={mediaUrl}
          alt={story.caption || "Story"}
          draggable="false"
          className="absolute inset-0 h-full w-full select-none object-cover"
        />

        {/* Segment progress */}
        <div className="absolute left-3 right-3 top-4 z-30 flex gap-1">
          {segments.map((segment, index) => (
            <div
              key={`${story.id}-${index}`}
              className="h-1 flex-1 overflow-hidden rounded-full bg-white/40"
            >
              <div
                className="h-full bg-white"
                style={{
                  width:
                    index < segmentIndex
                      ? "100%"
                      : index === segmentIndex
                        ? `${progress}%`
                        : "0%",
                }}
              />
            </div>
          ))}
        </div>

        {/* Creator information */}
        <div className="absolute left-4 top-8 z-30 text-white">
          <p className="font-semibold">{creator?.displayName}</p>

          <p className="text-xs text-white/80">{creator?.handle}</p>
        </div>

        {/* Close story */}
        <button
          type="button"
          onClick={() => navigate("/")}
          aria-label="Close story"
          className="absolute right-4 top-7 z-30 text-3xl text-white"
        >
          ×
        </button>

        {/* Previous and next tap areas */}
        <button
          type="button"
          onClick={goPrevious}
          aria-label="Previous segment"
          className="absolute bottom-16 left-0 top-20 z-10 w-[30%]"
        />

        <button
          type="button"
          onClick={goNext}
          aria-label="Next segment"
          className="absolute bottom-16 right-0 top-20 z-10 w-[30%]"
        />

        {/* Product hotspots */}
        {currentHotspots.map((tag) => (
          <button
            key={tag.productId}
            type="button"
            aria-label={`View ${tag.product.title}`}
            onClick={() => setSelectedProduct(tag.product)}
            className="absolute z-20 flex h-10 w-10 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border-2 border-white bg-black/70 text-lg text-white shadow-lg"
            style={{
              left: `${Math.min(92, Math.max(8, tag.x * 100))}%`,
              top: `${Math.min(88, Math.max(12, tag.y * 100))}%`,
            }}
          >
            +
          </button>
        ))}

        {/* Story caption */}
        <div className="pointer-events-none absolute bottom-5 left-4 right-4 z-10 text-white">
          <p className="text-sm font-semibold">{story.caption}</p>

          <p className="mt-1 text-xs text-white/80">Tap a product to shop</p>
        </div>

        {/* Product bottom sheet */}
        {selectedProduct && (
          <ProductBottomSheet
            product={selectedProduct}
            onClose={handleCloseProduct}
            onAddToCart={addToCart}
            attribution={{
              storyId: story.id,
              creatorId: story.creatorId,
            }}
          />
        )}
      </div>
    </div>
  );
}

export default StoryViewer;
