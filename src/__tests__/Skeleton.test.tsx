import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { Skeleton, WineCardSkeleton, WineDetailSkeleton } from '@/components/ui/Skeleton';

describe('Skeleton', () => {
  it('renders a div element', () => {
    const { container } = render(<Skeleton />);
    expect(container.firstChild).toBeInstanceOf(HTMLDivElement);
  });

  it('applies shimmer animation class', () => {
    const { container } = render(<Skeleton />);
    expect(container.firstChild).toHaveClass('animate-shimmer');
  });

  it('merges custom className', () => {
    const { container } = render(<Skeleton className="h-10 w-20" />);
    expect(container.firstChild).toHaveClass('h-10', 'w-20');
  });
});

describe('WineCardSkeleton', () => {
  it('renders without crashing', () => {
    const { container } = render(<WineCardSkeleton />);
    expect(container.firstChild).toBeInstanceOf(HTMLDivElement);
  });

  it('renders multiple skeleton elements', () => {
    const { container } = render(<WineCardSkeleton />);
    const skeletons = container.querySelectorAll('.animate-shimmer');
    expect(skeletons.length).toBeGreaterThan(0);
  });
});

describe('WineDetailSkeleton', () => {
  it('renders without crashing', () => {
    const { container } = render(<WineDetailSkeleton />);
    expect(container.firstChild).toBeInstanceOf(HTMLDivElement);
  });

  it('renders multiple skeleton elements', () => {
    const { container } = render(<WineDetailSkeleton />);
    const skeletons = container.querySelectorAll('.animate-shimmer');
    expect(skeletons.length).toBeGreaterThan(0);
  });
});
