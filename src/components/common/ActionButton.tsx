
import React from 'react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface ActionButtonProps {
  label: string;
  onClick: () => void;
  icon?: React.ReactNode;
  variant?: 'primary' | 'secondary' | 'success' | 'danger' | 'warning';
  size?: 'default' | 'sm' | 'lg' | 'icon';
  className?: string;
  disabled?: boolean;
}

const ActionButton: React.FC<ActionButtonProps> = ({
  label,
  onClick,
  icon,
  variant = 'primary',
  size = 'default',
  className,
  disabled = false,
}) => {
  const getVariantStyles = () => {
    switch (variant) {
      case 'primary':
        return 'bg-restaurant-primary hover:bg-restaurant-primary/80 text-white';
      case 'secondary':
        return 'bg-restaurant-secondary hover:bg-restaurant-secondary/80 text-restaurant-dark';
      case 'success':
        return 'bg-restaurant-success hover:bg-restaurant-success/80 text-white';
      case 'danger':
        return 'bg-restaurant-danger hover:bg-restaurant-danger/80 text-white';
      case 'warning':
        return 'bg-restaurant-warning hover:bg-restaurant-warning/80 text-white';
      default:
        return 'bg-restaurant-primary hover:bg-restaurant-primary/80 text-white';
    }
  };

  return (
    <Button
      onClick={onClick}
      size={size}
      disabled={disabled}
      className={cn(getVariantStyles(), className)}
    >
      {icon && <span className="mr-2">{icon}</span>}
      {label}
    </Button>
  );
};

export default ActionButton;
