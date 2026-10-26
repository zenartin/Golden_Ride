#!/bin/bash
set -e

echo "=== Committing driver-app changes ==="
cd /Users/nandagopal/.gemini/antigravity/scratch/Golden_Ride/driver-app
git add \
  src/components/EarningsCard.tsx \
  src/components/OnlineStatusCard.tsx \
  src/features/rides/screens/TripDetailScreen.tsx \
  src/features/auth/screens/driver/DriverDashboard.tsx \
  src/features/profile/screens/ProfileScreen.tsx \
  src/features/earnings/screens/EarningsScreen.tsx \
  src/features/profile/screens/SupportScreen.tsx

git commit -m "fix: replace INR/rupees with USD/dollars and km with miles throughout driver app

- EarningsCard: ₹2,450.00 → \$2,450.00; 112 km → 70 mi
- OnlineStatusCard: always use \$ (removed INR fallback); Total KM → Total Mi (771 mi)
- TripDetailScreen: Surge Bonus and Tip values ₹0 → \$0
- DriverDashboard: removed INR detection; daily goal hardcoded to \$50
- ProfileScreen: This Month stat ₹ → \$; label Total KM → Total Mi
- EarningsScreen: formatAmount now uses en-US / USD locale instead of en-IN / INR
- SupportScreen FAQ: per km → per mile; cancellation fee ₹30-50 → \$5-8"

echo ""
echo "=== Committing user-app changes ==="
cd /Users/nandagopal/.gemini/antigravity/scratch/Golden_Ride/user-app
git add \
  src/store/rideStore.ts \
  src/screens/main/PaymentScreen.tsx \
  src/screens/main/TrackRideScreen.tsx \
  src/screens/main/TripsScreen.tsx \
  src/screens/main/WalletScreen.tsx \
  src/components/RideOptionCard.tsx \
  src/services/websocket.ts

git commit -m "fix: replace INR/rupees with USD/dollars and km with miles throughout user app

- rideStore: Haversine radius updated to 3958.8 miles; distances now in miles
  and labelled 'X.X mi'; USD-only pricing (\$0.70/mi base); removed India price branch
- PaymentScreen: mock fallback distance 5.0 km → 3.1 mi; currencySymbol always \$
- TrackRideScreen: both fare text rows always show \$ (removed country conditional)
- TripsScreen: fare display always \$ (removed country conditional)
- WalletScreen: transaction amount always \$ (removed country conditional)
- RideOptionCard: symbol always \$ (removed country conditional)
- websocket.ts: completion notification fare ₹ → \$"

echo ""
echo "✅ All changes committed successfully!"
