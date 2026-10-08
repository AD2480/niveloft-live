import { api, unwrap } from './baseApi';
import type { AdminPayment, AdminPaymentList, ApiResponse, BillingPeriod, BillingSummary, Payment, PaymentStatus, PlanId } from './types';

/** Plans and UPI payments (Settings → Plan and billing), and the operator's payments list. */
export const billingEndpoints = api.injectEndpoints({
  endpoints: (build) => ({
    billing: build.query<BillingSummary, void>({
      query: () => '/billing',
      transformResponse: unwrap<BillingSummary>,
      providesTags: ['Billing'],
    }),
    startPayment: build.mutation<Payment, { plan: Exclude<PlanId, 'FREE'>; period: BillingPeriod }>({
      query: (body) => ({ url: '/billing/payments', method: 'POST', body }),
      transformResponse: unwrap<Payment>,
      invalidatesTags: ['Billing'],
    }),
    submitUtr: build.mutation<{ payment: Payment; message: string }, { id: number; utr: string }>({
      query: ({ id, utr }) => ({ url: `/billing/payments/${id}/utr`, method: 'POST', body: { utr } }),
      transformResponse: (r: ApiResponse<Payment>) => ({ payment: r.data, message: r.message ?? 'Thanks! We’ll confirm your payment soon.' }),
      invalidatesTags: ['Billing', 'AdminPayments'],
    }),
    cancelPayment: build.mutation<Payment, number>({
      query: (id) => ({ url: `/billing/payments/${id}/cancel`, method: 'POST' }),
      transformResponse: unwrap<Payment>,
      invalidatesTags: ['Billing'],
    }),
    adminPayments: build.query<AdminPaymentList, PaymentStatus | 'ALL'>({
      query: (status) => ({ url: '/admin/payments', params: { status } }),
      transformResponse: unwrap<AdminPaymentList>,
      providesTags: ['AdminPayments'],
    }),
    approvePayment: build.mutation<AdminPayment, { id: number; note?: string }>({
      query: ({ id, note }) => ({ url: `/admin/payments/${id}/approve`, method: 'POST', body: { note: note ?? null } }),
      transformResponse: unwrap<AdminPayment>,
      invalidatesTags: ['AdminPayments', 'Billing'],
    }),
    rejectPayment: build.mutation<AdminPayment, { id: number; note: string }>({
      query: ({ id, note }) => ({ url: `/admin/payments/${id}/reject`, method: 'POST', body: { note } }),
      transformResponse: unwrap<AdminPayment>,
      invalidatesTags: ['AdminPayments', 'Billing'],
    }),
  }),
});

export const {
  useBillingQuery,
  useStartPaymentMutation,
  useSubmitUtrMutation,
  useCancelPaymentMutation,
  useAdminPaymentsQuery,
  useApprovePaymentMutation,
  useRejectPaymentMutation,
} = billingEndpoints;
