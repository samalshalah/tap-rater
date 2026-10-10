// Owner-confirmed US fulfillment estimates, October 10, 2026.
export const usDeliveryEstimate = {
  preparationText: "Standard and Branded stands are prepared in 1 business day after payment and setup details, including any artwork approval, are complete.",
  transitText: "US shipping typically takes 3–5 business days after dispatch. Allow approximately 4–6 business days including preparation. These are estimates, not guaranteed delivery dates.",
  structuredData: {
    "@type": "ShippingDeliveryTime",
    businessDays: {
      "@type": "OpeningHoursSpecification",
      dayOfWeek: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"].map(day => `https://schema.org/${day}`),
    },
    handlingTime: { "@type": "QuantitativeValue", minValue: 1, maxValue: 1, unitCode: "DAY" },
    transitTime: { "@type": "QuantitativeValue", minValue: 3, maxValue: 5, unitCode: "DAY" },
  },
};
