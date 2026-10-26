import { Platform } from "react-native";

let StripeProvider: any = ({ children }: any) => children;
let CardField: any = () => null;
let useStripe: any = () => ({
  initPaymentSheet: async () => ({ error: null }),
  presentPaymentSheet: async () => ({ error: null }),
  confirmSetupIntent: async () => ({ error: { message: "Not supported on this platform" } }),
});

if (Platform.OS !== "web") {
  try {
    const stripeNative = require("@stripe/stripe-react-native");
    StripeProvider = stripeNative.StripeProvider;
    useStripe = stripeNative.useStripe;
    CardField = stripeNative.CardField;
  } catch (e) {
    console.log("Stripe native module not available:", e);
  }
}

export { StripeProvider, useStripe, CardField };
