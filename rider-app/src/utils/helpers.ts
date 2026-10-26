// Utility helpers for the rider app

export function formatUSD(amount: number): string {
  return `$${amount.toFixed(2)}`;
}

export function formatDistance(distance: string): string {
  return distance; // Already formatted like "5.2 km"
}

export function timeAgo(dateStr: string): string {
  const now = new Date();
  const date = new Date(dateStr);
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

export function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleDateString('en-US', {
    weekday: 'short',
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

export function formatTime(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
}

export function getRideStatusColor(status: string): string {
  switch (status) {
    case 'pending': return '#f59e0b';
    case 'accepted': return '#3b82f6';
    case 'arrived': return '#8b5cf6';
    case 'started': return '#22c55e';
    case 'completed': return '#22c55e';
    case 'cancelled': return '#ef4444';
    case 'declined': return '#ef4444';
    default: return '#6b7280';
  }
}

export function getRideStatusLabel(status: string): string {
  switch (status) {
    case 'pending': return 'Finding Driver';
    case 'accepted': return 'Driver En Route';
    case 'arrived': return 'Driver Arrived';
    case 'started': return 'In Progress';
    case 'completed': return 'Completed';
    case 'cancelled': return 'Cancelled';
    case 'declined': return 'Declined';
    default: return status;
  }
}

export const VEHICLE_META: Record<string, { emoji: string; color: string; bgColor: string }> = {
  'Golden Ride Economy': { emoji: '🚗', color: '#4f46e5', bgColor: 'rgba(79,70,229,0.12)' },
  'Golden Ride Comfort': { emoji: '🚙', color: '#059669', bgColor: 'rgba(5,150,105,0.12)' },
  'Golden Ride Premium': { emoji: '👑', color: '#7c3aed', bgColor: 'rgba(124,58,237,0.12)' },
  'Golden RideX':     { emoji: '⭐', color: '#F5B800', bgColor: 'rgba(245,184,0,0.12)' },
  'Golden RideXL':    { emoji: '👑', color: '#dc2626', bgColor: 'rgba(220,38,38,0.12)' },
  'Golden Ride Pet':  { emoji: '🐾', color: '#ec4899', bgColor: 'rgba(236,72,153,0.12)' },
  // Legacy keys
  'golden ride economy': { emoji: '🚗', color: '#4f46e5', bgColor: 'rgba(79,70,229,0.12)' },
  'golden ride comfort': { emoji: '🚙', color: '#059669', bgColor: 'rgba(5,150,105,0.12)' },
  'golden ride premium': { emoji: '👑', color: '#7c3aed', bgColor: 'rgba(124,58,237,0.12)' },
  'hatchback':        { emoji: '🚗', color: '#6b7280', bgColor: 'rgba(107,114,128,0.12)' },
  'economy':          { emoji: '🚗', color: '#6b7280', bgColor: 'rgba(107,114,128,0.12)' },
};

export function getVehicleMeta(rideClass: string) {
  return VEHICLE_META[rideClass] || { emoji: '🚗', color: '#6b7280', bgColor: 'rgba(107,114,128,0.12)' };
}
