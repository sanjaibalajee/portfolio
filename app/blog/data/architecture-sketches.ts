export const folder = '/images/building-outworld-from-0-to-1/architecture'

export const sketches = {
  'media-storage': {
    width: 956,
    height: 581,
    mobileWidth: 556,
    mobileHeight: 789,
    caption: 'media storage, before and after.',
    alt: 'Before, images passed through Flask and MongoDB. After, browsers upload to S3 and CloudFront serves event images. The app still approves uploads and old image links keep working.',
  },
  'runtime-migration': {
    width: 956,
    height: 693,
    mobileWidth: 556,
    mobileHeight: 939,
    caption: 'the july move to ecs. dedicated booking and analytics workers came later.',
    alt: 'The July migration moved the API from App Runner and background jobs and scheduling from a self-managed server into separate ECS services using the same application version.',
  },
  'delivery-flow': {
    width: 956,
    height: 546,
    mobileWidth: 587,
    mobileHeight: 856,
    caption: 'ticket messages and private invoice files.',
    alt: 'Confirmed bookings queue messages for a sender. Failed sends return to the queue. Paid bookings also generate private invoice files and queue a file reference. Login codes go directly.',
  },
  'checkout-flow': {
    width: 956,
    height: 599,
    mobileWidth: 556,
    mobileHeight: 984,
    caption: 'checkout, including a check with razorpay after a timeout.',
    alt: 'Hold seats, wait for payment, confirm the booking, then deliver tickets and messages. If creating an order with the payment provider times out, a background job checks what happened while the booking remains pending. Late payments require seats to be checked again or a refund.',
  },
  'analytics-migration': {
    width: 956,
    height: 573,
    mobileWidth: 556,
    mobileHeight: 804,
    caption: 'reporting, before and after.',
    alt: 'Before, a cold report counted raw event history. After, a background refresh prepares a reporting table for the dashboard. Both the original history and the reporting table remain in Postgres.',
  },
  'ticket-transfer-flow': {
    width: 946,
    height: 753,
    mobileWidth: 556,
    mobileHeight: 939,
    caption: 'whole-ticket transfers and sending part of a group booking.',
    alt: 'A whole-ticket transfer gives the recipient a new QR and stops the old QR. Sending two seats from a four-seat booking leaves the sender with two seats on the same QR and gives the recipient two seats on a new QR. The original buyer keeps the purchase.',
  },
} as const
