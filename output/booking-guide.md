# Venue bookings (sandbox)

Owners open **Hub Workspace → Playing spaces & availability** and enable online booking on a future slot. Choose full payment only, or full payment/advance; set the advance percentage, cancellation deadline in hours, and whether an early cancellation returns all money or retains the disclosed advance. Existing slots remain contact-only until enabled.

Players and captains open a venue, choose **Review & book slot**, review the price and cancellation terms, choose the payment amount and gateway, and accept the terms. A checkout holds the slot for up to 15 minutes. Only a verified gateway payment confirms the reservation. Advance bookings show the remaining amount due at the venue.

Customers find reservations under **My venue bookings**. Owners manage them under **Venue reservations**. Before the slot starts, customers may cancel; the saved cancellation policy determines the refund. After the cancellation deadline there is no refund. Owner cancellation makes the entire upfront payment refundable. Pending unpaid holds can be cancelled without any refund. Owners record the remaining venue payment once the confirmed slot starts.

Refunds appear in the super-user dashboard. In this version, an administrator must complete an eligible refund through the original gateway dashboard, then record its completed reference in Maidaan. Recording a reference does not send money. Signed Safepay refund events also update an eligible pending refund. Automatic refund initiation is not implemented.

Safepay and JazzCash use sandbox hosts only. Safepay requires the public/secret keys, webhook signing secret, and public callback URL. JazzCash stays unavailable until valid merchant credentials and its test Mobile Account REST URL are supplied. Do not use real payment details.
