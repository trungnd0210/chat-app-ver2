"use client";

import { useState } from "react";
import { cn, getInitials, colorFromString } from "@/lib/utils";

type AvatarProps = {
  src?: string | null;
  name?: string | null;
  size?: number;
  online?: boolean;
  className?: string;
};

// Avatar tròn: hiển thị ảnh nếu có, nếu không thì chữ cái đầu trên nền màu.
export default function Avatar({
  src,
  name,
  size = 48,
  online,
  className,
}: AvatarProps) {
  const [imgError, setImgError] = useState(false);
  const showImg = src && !imgError;
  const dotSize = Math.max(10, Math.round(size * 0.28));

  return (
    <div
      className={cn("relative flex-shrink-0", className)}
      style={{ width: size, height: size }}
    >
      {showImg ? (
        // Dùng <img> thường + no-referrer để tránh lỗi ảnh avatar Google.
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={src!}
          alt={name ?? "avatar"}
          width={size}
          height={size}
          referrerPolicy="no-referrer"
          onError={() => setImgError(true)}
          className="h-full w-full rounded-full object-cover"
        />
      ) : (
        <div
          className="flex h-full w-full items-center justify-center rounded-full font-semibold text-white"
          style={{
            backgroundColor: colorFromString(name || "?"),
            fontSize: size * 0.4,
          }}
        >
          {getInitials(name)}
        </div>
      )}

      {online && (
        <span
          className="absolute bottom-0 right-0 rounded-full border-2 border-white bg-green-500"
          style={{ width: dotSize, height: dotSize }}
        />
      )}
    </div>
  );
}
