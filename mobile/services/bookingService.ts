import { api } from "./api";
import { responseData } from "./venueService";
import { Booking } from "../types/booking";
export const bookingService = {
  async gateways() {
    return responseData(
      await api.get<{ sandbox: boolean; safepay: boolean; jazzcash: boolean }>(
        "/api/bookings/gateways",
      ),
    );
  },
  async start(
    slotId: string,
    provider: "safepay" | "jazzcash",
    choice: "FULL" | "ADVANCE",
    slotVersion: string,
  ) {
    return responseData(
      await api.post<{ booking: Booking }>("/api/bookings", {
        slotId,
        provider,
        choice,
        slotVersion,
        acceptTerms: true,
      }),
    ).booking;
  },
  async checkout(id: string, mobile = "", cnicSuffix = "") {
    return responseData(
      await api.post<{ url?: string; submitted?: boolean }>(
        `/api/bookings/${id}/checkout`,
        { mobile, cnicSuffix },
      ),
    );
  },
  async details(id: string) {
    return responseData(
      await api.get<{ booking: Booking }>(`/api/bookings/${id}`),
    ).booking;
  },
  async list(scope: "customer" | "owner" | "refunds") {
    const path =
      scope === "refunds"
        ? "/api/admin/booking-refunds"
        : scope === "owner"
          ? "/api/bookings/venue"
          : "/api/bookings";
    return responseData(await api.get<{ bookings: Booking[] }>(path)).bookings;
  },
  async cancel(id: string, reason: string) {
    return responseData(
      await api.post<{ booking: Booking }>(`/api/bookings/${id}/cancel`, {
        reason,
      }),
    ).booking;
  },
  async recordRefund(id: string, reference: string) {
    return responseData(
      await api.post(`/api/admin/booking-refunds/${id}/record`, { reference }),
    );
  },
  async recordBalance(id: string) {
    return responseData(await api.post(`/api/bookings/${id}/venue-balance`));
  },
};
