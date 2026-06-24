'use client';

import { motion } from 'framer-motion';
import { ReactNode } from 'react';

const itemVariants = {
  hidden: { opacity: 0, y: 12 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.25, ease: [0, 0, 0.2, 1] as const },
  },
};

interface ListItemProps {
  children: ReactNode;
  className?: string;
}

export function ListItem({ children, className = '' }: ListItemProps) {
  return (
    <motion.div variants={itemVariants} className={className}>
      {children}
    </motion.div>
  );
}
