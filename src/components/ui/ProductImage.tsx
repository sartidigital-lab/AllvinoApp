import Image, { ImageProps } from 'next/image';

export const PRODUCT_PLACEHOLDER = '/product-placeholder.svg';

type ProductImageProps = Omit<ImageProps, 'src'> & {
  src?: string | null;
};

export function ProductImage({ src, alt, ...props }: ProductImageProps) {
  return <Image src={src || PRODUCT_PLACEHOLDER} alt={alt} {...props} />;
}
