import { useEffect, useMemo, useState } from "react";

const IMAGE_FIELD_NAMES = new Set([
    "image",
    "images",
    "imageurl",
    "image_url",
    "imagecandidates",
    "thumbnail",
    "thumbnailurl",
    "thumbnail_url",
    "photourl",
    "photo_url",
    "photo",
    "photos",
    "coverphoto",
    "cover_photo",
    "coverimage",
    "cover_image",
    "primaryimage",
    "primary_image",
    "originalimage",
    "original_image",
    "original",
    "url",
    "src",
    "contenturl",
    "content_url",
    "large",
    "medium",
    "small",
]);

function addUrlCandidate(value, output) {
    if (typeof value !== "string") return;

    const raw = value.trim();
    if (!raw) return;

    // Some providers return protocol-relative image links.
    const normalized = raw.startsWith("//") ? `https:${raw}` : raw;
    if (!/^https?:\/\//i.test(normalized)) return;

    try {
        const parsed = new URL(normalized);
        if (!parsed.hostname) return;

        if (parsed.protocol === "http:") {
            // Try HTTPS first for production/secure pages, then retain HTTP as
            // a fallback for providers that do not support HTTPS on that host.
            const secure = new URL(parsed.href);
            secure.protocol = "https:";
            output.push(secure.href);
            output.push(parsed.href);
        } else {
            output.push(parsed.href);
        }
    } catch {
        // Ignore malformed provider URLs.
    }
}

function addImageValue(value, output, depth = 0) {
    if (depth > 5 || value == null) return;

    if (typeof value === "string") {
        addUrlCandidate(value, output);
        return;
    }

    if (Array.isArray(value)) {
        for (const item of value) addImageValue(item, output, depth + 1);
        return;
    }

    if (typeof value === "object") {
        for (const [key, nestedValue] of Object.entries(value)) {
            const normalizedKey = key.replace(/[-\s]/g, "_").toLowerCase();
            if (IMAGE_FIELD_NAMES.has(normalizedKey)) {
                addImageValue(nestedValue, output, depth + 1);
            }
        }
    }
}

function collectImageUrls(hotel) {
    if (!hotel || typeof hotel !== "object") return [];

    const candidates = [];

    // Normalized candidates first, followed by common raw provider fields.
    addImageValue(hotel.imageCandidates, candidates);
    addImageValue(hotel.image, candidates);
    addImageValue(hotel.thumbnail, candidates);
    addImageValue(hotel.imageUrl, candidates);
    addImageValue(hotel.image_url, candidates);
    addImageValue(hotel.photoUrl, candidates);
    addImageValue(hotel.photo_url, candidates);
    addImageValue(hotel.coverPhoto, candidates);
    addImageValue(hotel.cover_photo, candidates);
    addImageValue(hotel.coverImage, candidates);
    addImageValue(hotel.cover_image, candidates);
    addImageValue(hotel.primaryImage, candidates);
    addImageValue(hotel.primary_image, candidates);
    addImageValue(hotel.images, candidates);
    addImageValue(hotel.photos, candidates);
    addImageValue(hotel.thumbnailUrl, candidates);
    addImageValue(hotel.thumbnail_url, candidates);

    return [...new Set(candidates)];
}

/**
 * Displays the first hotel photo that loads successfully. Supports both the
 * normalized TripWise hotel object and common nested image shapes from hotel
 * search providers. Falls back to a neutral placeholder if none load.
 */
export default function HotelPhoto({ hotel, className = "", alt }) {
    const imageUrls = useMemo(() => collectImageUrls(hotel), [hotel]);
    const imageKey = imageUrls.join("|");
    const [imageIndex, setImageIndex] = useState(0);

    useEffect(() => {
        setImageIndex(0);
    }, [hotel?.id, imageKey]);

    const currentUrl = imageUrls[imageIndex];
    const imageAlt = alt || `${hotel?.name || "Hotel"} photo`;

    if (currentUrl) {
        return (
            <img
                src={currentUrl}
                alt={imageAlt}
                loading="lazy"
                className={className}
                onError={() => {
                    setImageIndex((current) => current + 1);
                }}
            />
        );
    }

    return (
        <div
            role="img"
            aria-label={`${hotel?.name || "Hotel"}: photo unavailable`}
            className={`flex items-center justify-center bg-gradient-to-br from-sky-100 via-slate-100 to-blue-100 text-slate-500 ${className}`}
        >
            <div className="flex flex-col items-center gap-2 p-4 text-center">
                <span aria-hidden="true" className="text-4xl">🏨</span>
                <span className="text-xs font-semibold">Hotel photo unavailable</span>
            </div>
        </div>
    );
}
