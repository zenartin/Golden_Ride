import { Platform } from "react-native";

let StripeProvider: any = ({ children }: any) => children;
let useStripe: any = () => ({
  initPaymentSheet: async () => ({ error: null }),
  presentPaymentSheet: async () => ({ error: null }),
});

if (Platform.OS !== "web") {
  try {
    const stripeNative = require("@stripe/stripe-react-native");
    StripeProvider = stripeNative.StripeProvider;
    useStripe = stripeNative.useStripe;
  } catch (e) {
    console.log("Stripe native module not available:", e);
  }
}

export { StripeProvider, useStripe };
